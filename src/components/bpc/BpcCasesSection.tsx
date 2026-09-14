import React, { useEffect, useState } from 'react';
import { Client, DocumentTemplate, FirmSettings } from '../../types';
import { BpcCaseItem, BpcModality } from '../../types/bpc';
import { auth } from '../../lib/firebase';
import {
  getUserProfileInFirestore,
  subscribeToClients,
  subscribeToSettings,
  subscribeToTemplates,
} from '../../services/firestoreService';
import { DocumentGeneratorModal } from '../DocumentGeneratorModal';

interface BpcCasesSectionProps {
  cases: BpcCaseItem[];
  onOpenNewCase: () => void;
  onSelectCase: (bpcCase: BpcCaseItem) => void;
  onArchiveCase: (bpcCase: BpcCaseItem) => void;
  onRestoreCase: (bpcCase: BpcCaseItem) => void;
}

export const BpcCasesSection: React.FC<BpcCasesSectionProps> = ({
  cases,
  onOpenNewCase,
  onSelectCase,
  onArchiveCase,
  onRestoreCase,
}) => {
  const [filterModality, setFilterModality] = useState<'all' | BpcModality>('all');
  const [lifecycleFilter, setLifecycleFilter] = useState<'active' | 'archived'>('active');
  const [searchTerm, setSearchTerm] = useState('');

  const [documentClients, setDocumentClients] = useState<Client[]>([]);
  const [documentTemplates, setDocumentTemplates] = useState<DocumentTemplate[]>([]);
  const [documentSettings, setDocumentSettings] = useState<FirmSettings | undefined>(undefined);
  const [documentLoadError, setDocumentLoadError] = useState('');
  const [selectedDocumentCase, setSelectedDocumentCase] = useState<BpcCaseItem | null>(null);
  const [selectedDocumentTemplate, setSelectedDocumentTemplate] = useState<DocumentTemplate | null>(null);

  useEffect(() => {
    let active = true;
    let unsubscribeClients: (() => void) | undefined;
    let unsubscribeTemplates: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const connectDocumentContext = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const profile = await getUserProfileInFirestore(currentUser.uid);
      const firmId = profile?.firmId?.trim();
      if (!firmId || !active) return;

      unsubscribeClients = subscribeToClients(firmId, (items) => {
        if (active) setDocumentClients(items);
      });
      unsubscribeTemplates = subscribeToTemplates(firmId, (items) => {
        if (active) setDocumentTemplates(items);
      });
      unsubscribeSettings = subscribeToSettings(firmId, (value) => {
        if (active) setDocumentSettings(value);
      });
    };

    void connectDocumentContext().catch((error) => {
      console.error('Erro ao preparar integração BPC → Documentos:', error);
      if (active) setDocumentLoadError('Não foi possível preparar os modelos de documentos.');
    });

    return () => {
      active = false;
      unsubscribeClients?.();
      unsubscribeTemplates?.();
      unsubscribeSettings?.();
    };
  }, []);

  const activeCases = cases.filter((item) => !item.archivedAt);
  const archivedCases = cases.filter((item) => Boolean(item.archivedAt));
  const lifecycleCases = lifecycleFilter === 'active' ? activeCases : archivedCases;

  const filteredCases = lifecycleCases.filter((item) => {
    if (filterModality !== 'all' && item.modality !== filterModality) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.clientName.toLowerCase().includes(q)
        || item.clientCpf.includes(q)
        || Boolean(item.protocolNumber?.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const handleOpenDocumentPicker = (bpcCase: BpcCaseItem) => {
    const linkedClient = documentClients.find((client) => client.id === bpcCase.clientId);
    if (!linkedClient) {
      window.alert('A ficha do cliente vinculada a este caso BPC ainda não foi carregada. Tente novamente em alguns instantes.');
      return;
    }
    if (String(linkedClient.status) === 'Arquivado') {
      window.alert('O cliente vinculado está arquivado. Restaure a ficha do cliente antes de gerar um novo documento.');
      return;
    }

    setSelectedDocumentCase(bpcCase);
    setSelectedDocumentTemplate(null);
  };

  const closeDocumentFlow = () => {
    setSelectedDocumentCase(null);
    setSelectedDocumentTemplate(null);
  };

  return (
    <>
      <div className="space-y-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
            <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
              <button
                type="button"
                onClick={() => setLifecycleFilter('active')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lifecycleFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Ativos ({activeCases.length})
              </button>
              <button
                type="button"
                onClick={() => setLifecycleFilter('archived')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${lifecycleFilter === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                Arquivados ({archivedCases.length})
              </button>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              <div className="relative flex-1 md:w-64">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                <input
                  type="text"
                  placeholder="Buscar requerente, CPF ou protocolo..."
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 border border-slate-200 focus:bg-white focus:outline-hidden focus:border-slate-400"
                />
              </div>

              {lifecycleFilter === 'active' && (
                <button
                  type="button"
                  onClick={onOpenNewCase}
                  className="px-3 py-2 rounded-xl bg-[#0D0D0D] hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs shrink-0 border border-[#C9A227]/50"
                >
                  <span className="material-symbols-outlined text-sm text-[#C9A227]">add</span>
                  <span>Novo Requerimento</span>
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl w-full md:w-fit border border-slate-200 overflow-x-auto">
            <button type="button" onClick={() => setFilterModality('all')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${filterModality === 'all' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              Todos ({lifecycleCases.length})
            </button>
            <button type="button" onClick={() => setFilterModality('idoso')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${filterModality === 'idoso' ? 'bg-white text-amber-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              <span className="material-symbols-outlined text-sm text-amber-600">elderly</span>
              <span>BPC Idoso ({lifecycleCases.filter((item) => item.modality === 'idoso').length})</span>
            </button>
            <button type="button" onClick={() => setFilterModality('pcd')} className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 whitespace-nowrap ${filterModality === 'pcd' ? 'bg-white text-blue-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}>
              <span className="material-symbols-outlined text-sm text-blue-600">accessible_forward</span>
              <span>BPC PCD ({lifecycleCases.filter((item) => item.modality === 'pcd').length})</span>
            </button>
          </div>
        </div>

        {documentLoadError && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">
            {documentLoadError}
          </div>
        )}

        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          {filteredCases.length === 0 ? (
            <div className="p-12 text-center">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
                <span className="material-symbols-outlined text-2xl">folder_off</span>
              </div>
              <h3 className="font-bold text-slate-900 text-sm">{lifecycleFilter === 'active' ? 'Nenhum caso BPC ativo encontrado' : 'Nenhum caso BPC arquivado encontrado'}</h3>
              <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">Nenhum requerimento corresponde aos filtros selecionados.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                <div className="col-span-4">Requerente & Modalidade</div>
                <div className="col-span-2">CadÚnico & NIS</div>
                <div className="col-span-2">Status / Etapa Atual</div>
                <div className="col-span-2">Protocolo INSS</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>

              {filteredCases.map((item) => (
                <div key={item.id} className="p-4 md:px-5 md:py-3.5 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center hover:bg-slate-50/80 transition-colors">
                  <div className="col-span-4 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${item.modality === 'idoso' ? 'bg-amber-100 text-amber-800' : 'bg-blue-100 text-blue-800'}`}>
                        <span className="material-symbols-outlined text-sm">{item.modality === 'idoso' ? 'elderly' : 'accessible_forward'}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="font-bold text-slate-900 text-xs truncate block">{item.clientName}</span>
                        <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                          <span>CPF: {item.clientCpf || 'Não informado'}</span>
                          <span>•</span>
                          <span className={`font-semibold ${item.modality === 'idoso' ? 'text-amber-700' : 'text-blue-700'}`}>{item.modality === 'idoso' ? 'BPC Idoso' : 'BPC PCD'}</span>
                        </div>
                        {item.archivedAt && <span className="text-[10px] text-slate-400 block mt-1">Arquivado em: {item.archivedAt}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="col-span-2 text-xs">
                    <span className="text-[11px] font-medium text-slate-700 block">NIS: {item.nisNumber || 'Não informado'}</span>
                    <span className={`text-[10px] font-bold inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${item.cadUnicoStatus === 'Atualizado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                      {item.cadUnicoStatus || 'Não informado'}
                    </span>
                  </div>

                  <div className="col-span-2 min-w-0">
                    <span className="text-xs font-bold text-slate-900 block truncate">{item.status}</span>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Atualizado: {item.updatedAt}</span>
                  </div>

                  <div className="col-span-2 text-xs text-slate-600 min-w-0">
                    <span className="font-mono text-[11px] block truncate">{item.protocolNumber || 'Não informado'}</span>
                    {item.derDate && <span className="text-[10px] text-slate-400 block">DER: {item.derDate}</span>}
                  </div>

                  <div className="col-span-2 flex justify-end gap-1.5 w-full md:w-auto flex-wrap">
                    {item.archivedAt ? (
                      <button type="button" onClick={() => onRestoreCase(item)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-200">
                        <span className="material-symbols-outlined text-sm">unarchive</span>
                        <span>Restaurar</span>
                      </button>
                    ) : (
                      <>
                        <button type="button" onClick={() => handleOpenDocumentPicker(item)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-900 text-[11px] font-bold inline-flex items-center gap-1 border border-blue-200">
                          <span className="material-symbols-outlined text-sm">description</span>
                          <span>Documento</span>
                        </button>
                        <button type="button" onClick={() => onSelectCase(item)} className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1">
                          <span className="material-symbols-outlined text-sm">edit</span>
                          <span>Editar</span>
                        </button>
                        <button type="button" onClick={() => onArchiveCase(item)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1 border border-amber-200">
                          <span className="material-symbols-outlined text-sm">archive</span>
                          <span>Arquivar</span>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {selectedDocumentCase && !selectedDocumentTemplate && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-black text-slate-900">Gerar documento do caso BPC</h3>
                <p className="text-xs text-slate-500 mt-1">
                  {selectedDocumentCase.clientName} • {selectedDocumentCase.modality === 'pcd' ? 'BPC PCD' : 'BPC Idoso'} • {selectedDocumentCase.status}
                </p>
              </div>
              <button type="button" onClick={closeDocumentFlow} className="p-2 rounded-full hover:bg-slate-100 text-slate-500">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {documentTemplates.length === 0 ? (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
                Nenhum modelo de documento está disponível. Cadastre primeiro um modelo na Central de Documentos.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {documentTemplates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedDocumentTemplate(template)}
                    className="text-left p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-900 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-lg">{template.icon || 'description'}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs">{template.title}</div>
                        <div className="text-[10px] text-slate-500 mt-1">{template.category}{template.format ? ` • ${template.format}` : ''}</div>
                        <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{template.description || 'Sem descrição.'}</div>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {selectedDocumentCase && selectedDocumentTemplate && (
        <DocumentGeneratorModal
          isOpen={true}
          onClose={closeDocumentFlow}
          template={selectedDocumentTemplate}
          clients={documentClients}
          initialClientId={selectedDocumentCase.clientId}
          bpcContext={selectedDocumentCase}
          settings={documentSettings}
        />
      )}
    </>
  );
};
