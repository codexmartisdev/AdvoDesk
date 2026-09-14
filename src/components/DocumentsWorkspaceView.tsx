import React, { useEffect, useState } from 'react';
import { Client, DocumentTemplate, FirmSettings } from '../types';
import { GeneratedDocument } from '../types/generatedDocument';
import { auth } from '../lib/firebase';
import {
  getUserProfileInFirestore,
  subscribeToClients,
  subscribeToSettings,
} from '../services/firestoreService';
import { subscribeToGeneratedDocuments } from '../services/generatedDocumentService';
import { DocumentsView as DocumentTemplatesView } from './DocumentTemplatesView';
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

export const DocumentsWorkspaceView: React.FC<DocumentsWorkspaceViewProps> = (props) => {
  const [workspaceTab, setWorkspaceTab] = useState<'library' | 'templates'>('library');
  const [generatedDocuments, setGeneratedDocuments] = useState<GeneratedDocument[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [settings, setSettings] = useState<FirmSettings | undefined>(undefined);
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
      const firmId = profile?.firmId?.trim();
      if (!firmId || !active) {
        if (active) {
          setLoadError('O usuário autenticado não possui escritório vinculado.');
          setLoadingLibrary(false);
        }
        return;
      }

      unsubscribeDocuments = subscribeToGeneratedDocuments(firmId, (documents) => {
        if (!active) return;
        setGeneratedDocuments(documents);
        setLoadError('');
        setLoadingLibrary(false);
      });

      unsubscribeClients = subscribeToClients(firmId, (persistedClients) => {
        if (active) setClients(persistedClients);
      });

      unsubscribeSettings = subscribeToSettings(firmId, (firmSettings) => {
        if (active) setSettings(firmSettings);
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

  return (
    <>
      <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-5">
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
              Modelos ({props.templates.length})
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
        <DocumentTemplatesView {...props} />
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
