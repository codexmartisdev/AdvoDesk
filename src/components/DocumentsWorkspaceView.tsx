import React, { useEffect, useState } from 'react';
import { Client, DocumentTemplate, FirmSettings } from '../types';
import { GeneratedDocument } from '../types/generatedDocument';
import { auth } from '../lib/firebase';
import { getBrasiliaISO } from '../utils/dateUtils';
import {
  getUserProfileInFirestore,
  saveSettingsInFirestore,
  subscribeToClients,
  subscribeToSettings,
} from '../services/firestoreService';
import { subscribeToGeneratedDocuments } from '../services/generatedDocumentService';
import { DocumentTemplatesOperationalView } from './DocumentTemplatesOperationalView';
import { GeneratedDocumentsLibrary } from './GeneratedDocumentsLibrary';
import { DocumentGeneratorModal } from './DocumentGeneratorModal';

interface DocumentsWorkspaceViewProps {
  templates: DocumentTemplate[];
  searchQuery: string;
  docCategories: string[];
  docFormats: string[];
  onSelectTemplateToGenerate: (template: DocumentTemplate) => void;
  onSaveTemplate: (template: DocumentTemplate) => void;
  onDeleteTemplate: (templateId: string) => void;
  onAddCategory: (categoryName: string) => void;
  onEditCategory: (oldCategory: string, newCategory: string) => void;
  onDeleteCategory: (categoryName: string) => void;
  onAddFormat: (formatName: string) => void;
  onEditFormat: (oldFormat: string, newFormat: string) => void;
  onDeleteFormat: (formatName: string) => void;
}

type ManagedTemplate = DocumentTemplate & {
  status?: 'Ativo' | 'Arquivado';
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type DocumentFirmSettings = FirmSettings & {
  documentCategories?: string[];
  documentFormats?: string[];
};

const normalizeCatalog = (saved: string[] | undefined, fallback: string[]) => {
  const base = saved && saved.length > 0 ? saved : fallback.filter((item) => item !== 'Todos');
  const unique: string[] = [];
  base.forEach((value) => {
    const clean = value.trim();
    if (!clean) return;
    if (!unique.some((item) => item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) {
      unique.push(clean);
    }
  });
  return ['Todos', ...unique];
};

export const DocumentsWorkspaceView: React.FC<DocumentsWorkspaceViewProps> = (props) => {
  const [workspaceTab, setWorkspaceTab] = useState<'library' | 'templates'>('library');
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<DocumentFirmSettings | undefined>(undefined);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [documentCategories, setDocumentCategories] = useState<string[]>(() => normalizeCatalog(undefined, props.docCategories));
  const [documentFormats, setDocumentFormats] = useState<string[]>(() => normalizeCatalog(undefined, props.docFormats));
  const [selectedDocument, setSelectedDocument] = useState<GeneratedDocument | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loadingLibrary, setLoadingLibrary] = useState(true);

  useEffect(() => {
    let active = true;
    let unsubscribeDocuments: (() => void) | undefined;
    let unsubscribeClients: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const connect = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (active) {
          setLoadError('Não foi possível identificar o usuário autenticado.');
          setLoadingLibrary(false);
        }
        return;
      }

      const profile = await getUserProfileInFirestore(currentUser.uid);
      const resolvedFirmId = profile?.firmId?.trim();
      if (!resolvedFirmId || !active) {
        if (active) {
          setLoadError('O usuário autenticado não possui escritório vinculado.');
          setLoadingLibrary(false);
        }
        return;
      }

      setFirmId(resolvedFirmId);

      unsubscribeDocuments = subscribeToGeneratedDocuments(resolvedFirmId, (documents) => {
        if (!active) return;
        setGeneratedDocuments(documents);
        setLoadError('');
        setLoadingLibrary(false);
      });

      unsubscribeClients = subscribeToClients(resolvedFirmId, (persistedClients) => {
        if (active) setClients(persistedClients);
      });

      unsubscribeSettings = subscribeToSettings(resolvedFirmId, (firmSettings) => {
        if (!active) return;
        const documentSettings = firmSettings as DocumentFirmSettings;
        setSettings(documentSettings);
        setDocumentCategories(normalizeCatalog(documentSettings.documentCategories, props.docCategories));
        setDocumentFormats(normalizeCatalog(documentSettings.documentFormats, props.docFormats));
      });
    };

    void connect().catch((error) => {
      console.error('Erro ao carregar biblioteca documental:', error);
      if (active) {
        setLoadError('Não foi possível carregar a biblioteca de documentos.');
        setLoadingLibrary(false);
      }
    });

    return () => {
      active = false;
      unsubscribeDocuments?.();
      unsubscribeClients?.();
      unsubscribeSettings?.();
    };
  }, []);

  const persistCatalog = (nextCategories: string[], nextFormats: string[]) => {
    setDocumentCategories(nextCategories);
    setDocumentFormats(nextFormats);

    if (!firmId || !settings) {
      window.alert('A configuração do escritório ainda não terminou de carregar. Tente novamente em alguns instantes.');
      return;
    }

    const nextSettings: DocumentFirmSettings = {
      ...settings,
      documentCategories: nextCategories.filter((item) => item !== 'Todos'),
      documentFormats: nextFormats.filter((item) => item !== 'Todos'),
    };
    setSettings(nextSettings);
    void saveSettingsInFirestore(nextSettings, firmId);
  };

  const addCategory = (categoryName: string) => {
    const clean = categoryName.trim();
    if (!clean) return;
    if (documentCategories.some((item) => item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) return;
    persistCatalog([...documentCategories, clean], documentFormats);
  };

  const editCategory = (oldCategory: string, newCategory: string) => {
    const clean = newCategory.trim();
    if (!clean) return;
    if (documentCategories.some((item) => item !== oldCategory && item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) {
      window.alert('Já existe uma categoria com este nome.');
      return;
    }
    const now = getBrasiliaISO();
    props.templates
      .filter((template) => template.category === oldCategory)
      .forEach((template) => props.onSaveTemplate({ ...template, category: clean, updatedAt: now } as ManagedTemplate));
    persistCatalog(documentCategories.map((item) => item === oldCategory ? clean : item), documentFormats);
  };

  const deleteCategory = (categoryName: string) => {
    if (props.templates.some((template) => template.category === categoryName)) {
      window.alert('Esta categoria está sendo usada por um ou mais modelos. Reclassifique os modelos antes de removê-la.');
      return;
    }
    persistCatalog(documentCategories.filter((item) => item !== categoryName), documentFormats);
  };

  const addFormat = (formatName: string) => {
    const clean = formatName.trim();
    if (!clean) return;
    if (documentFormats.some((item) => item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) return;
    persistCatalog(documentCategories, [...documentFormats, clean]);
  };

  const editFormat = (oldFormat: string, newFormat: string) => {
    const clean = newFormat.trim();
    if (!clean) return;
    if (documentFormats.some((item) => item !== oldFormat && item.toLocaleLowerCase('pt-BR') === clean.toLocaleLowerCase('pt-BR'))) {
      window.alert('Já existe um formato com este nome.');
      return;
    }
    const now = getBrasiliaISO();
    props.templates
      .filter((template) => template.format === oldFormat)
      .forEach((template) => props.onSaveTemplate({ ...template, format: clean, updatedAt: now } as ManagedTemplate));
    persistCatalog(documentCategories, documentFormats.map((item) => item === oldFormat ? clean : item));
  };

  const deleteFormat = (formatName: string) => {
    if (props.templates.some((template) => template.format === formatName)) {
      window.alert('Este formato está sendo usado por um ou mais modelos. Reclassifique os modelos antes de removê-lo.');
      return;
    }
    persistCatalog(documentCategories, documentFormats.filter((item) => item !== formatName));
  };

  const archiveTemplate = (template: DocumentTemplate) => {
    if (!window.confirm(`Arquivar o modelo "${template.title}"? Documentos já gerados continuarão preservados.`)) return;
    const current = template as ManagedTemplate;
    const now = getBrasiliaISO();
    props.onSaveTemplate({
      ...template,
      status: 'Arquivado',
      archivedAt: now,
      createdAt: current.createdAt || now,
      updatedAt: now,
    } as ManagedTemplate);
  };

  const restoreTemplate = (template: DocumentTemplate) => {
    const current = template as ManagedTemplate;
    const now = getBrasiliaISO();
    props.onSaveTemplate({
      ...template,
      status: 'Ativo',
      archivedAt: null,
      createdAt: current.createdAt || now,
      updatedAt: now,
    } as ManagedTemplate);
  };

  const activeTemplateCount = props.templates.filter((template) => (template as ManagedTemplate).status !== 'Arquivado').length;

  return (
    <>
      <main className="md:ml-64 pt-16 md:pt-8 pb-5 px-4 sm:px-6 md:px-8 relative z-10 max-w-7xl mx-auto space-y-5">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Central de Documentos</h1>
            <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl">
              Retome rascunhos, consulte documentos finalizados e use modelos sem redigitar dados já cadastrados no AdvoDesk.
            </p>
          </div>

          <div className="inline-flex p-1 rounded-2xl bg-slate-100 border border-slate-200 self-start lg:self-auto">
            <button
              type="button"
              onClick={() => setWorkspaceTab('library')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${workspaceTab === 'library' ? 'bg-[#0A1F44] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Documentos gerados ({generatedDocuments.filter((item) => item.status !== 'Arquivado').length})
            </button>
            <button
              type="button"
              onClick={() => setWorkspaceTab('templates')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${workspaceTab === 'templates' ? 'bg-[#0A1F44] text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
            >
              Modelos ativos ({activeTemplateCount})
            </button>
          </div>
        </div>

        {workspaceTab === 'library' && (
          <>
            {loadingLibrary && (
              <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">
                Carregando biblioteca de documentos...
              </div>
            )}
            {loadError && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
                {loadError}
              </div>
            )}
            {!loadingLibrary && !loadError && (
              <GeneratedDocumentsLibrary
                documents={generatedDocuments}
                searchQuery={props.searchQuery}
                onOpenDocument={setSelectedDocument}
              />
            )}
          </>
        )}
      </main>

      {workspaceTab === 'templates' && (
        <DocumentTemplatesOperationalView
          templates={props.templates}
          searchQuery={props.searchQuery}
          docCategories={documentCategories}
          docFormats={documentFormats}
          onSelectTemplateToGenerate={props.onSelectTemplateToGenerate}
          onSaveTemplate={props.onSaveTemplate}
          onArchiveTemplate={archiveTemplate}
          onRestoreTemplate={restoreTemplate}
          onAddCategory={addCategory}
          onEditCategory={editCategory}
          onDeleteCategory={deleteCategory}
          onAddFormat={addFormat}
          onEditFormat={editFormat}
          onDeleteFormat={deleteFormat}
        />
      )}

      {selectedDocument && (
        <DocumentGeneratorModal
          isOpen={true}
          onClose={() => setSelectedDocument(null)}
          template={selectedDocument.templateSnapshot}
          clients={clients}
          initialClientId={selectedDocument.clientId}
          initialDocument={selectedDocument}
          bpcContext={selectedDocument.bpcCaseSnapshot || null}
          settings={settings}
        />
      )}
    </>
  );
};
