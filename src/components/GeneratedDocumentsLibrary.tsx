import React, { useMemo, useState } from 'react';
import { GeneratedDocument, GeneratedDocumentStatus } from '../types/generatedDocument';
import { onlyDigits } from '../utils/clientDataUtils';

interface GeneratedDocumentsLibraryProps {
  documents: GeneratedDocument[];
  searchQuery: string;
  onOpenDocument: (document: GeneratedDocument) => void;
}

type StatusFilter = 'Ativos' | 'Todos' | GeneratedDocumentStatus;

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const sourceLabel = (document: GeneratedDocument) => {
  if (document.source === 'bpc') return 'BPC/LOAS';
  if (document.source === 'clients') return 'Cliente';
  if (document.source === 'case') return 'Caso';
  if (document.source === 'workflow') return 'Workflow';
  return 'Documentos';
};

const statusClass: Record<GeneratedDocumentStatus, string> = {
  Rascunho: 'bg-amber-50 text-amber-800 border-amber-200',
  Finalizado: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  Arquivado: 'bg-slate-100 text-slate-600 border-slate-200',
};

export const GeneratedDocumentsLibrary: React.FC<GeneratedDocumentsLibraryProps> = ({
  documents,
  searchQuery,
  onOpenDocument,
}) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('Ativos');

  const counts = useMemo(() => ({
    active: documents.filter((item) => item.status !== 'Arquivado').length,
    drafts: documents.filter((item) => item.status === 'Rascunho').length,
    finalized: documents.filter((item) => item.status === 'Finalizado').length,
    archived: documents.filter((item) => item.status === 'Arquivado').length,
  }), [documents]);

  const filteredDocuments = useMemo(() => {
    const normalizedSearch = normalizeText(searchQuery || '');
    const searchDigits = onlyDigits(searchQuery || '');

    return documents
      .filter((document) => {
        if (statusFilter === 'Ativos' && document.status === 'Arquivado') return false;
        if (statusFilter !== 'Ativos' && statusFilter !== 'Todos' && document.status !== statusFilter) return false;

        if (!normalizedSearch && !searchDigits) return true;

        const textHaystack = normalizeText([
          document.title,
          document.templateTitle,
          document.clientName,
          document.clientCpf,
          document.bpcCaseSnapshot?.protocolNumber || '',
          document.bpcCaseSnapshot?.status || '',
          sourceLabel(document),
        ].join(' '));

        const digitHaystack = onlyDigits([
          document.clientCpf,
          document.bpcCaseSnapshot?.protocolNumber || '',
        ].join(' '));

        return (
          (normalizedSearch && textHaystack.includes(normalizedSearch))
          || (searchDigits.length >= 3 && digitHaystack.includes(searchDigits))
        );
      })
      .sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
  }, [documents, searchQuery, statusFilter]);

  const filters: { id: StatusFilter; label: string; count: number }[] = [
    { id: 'Ativos', label: 'Documentos ativos', count: counts.active },
    { id: 'Rascunho', label: 'Rascunhos', count: counts.drafts },
    { id: 'Finalizado', label: 'Finalizados', count: counts.finalized },
    { id: 'Arquivado', label: 'Arquivados', count: counts.archived },
    { id: 'Todos', label: 'Todos', count: documents.length },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Documentos ativos</div>
          <div className="text-2xl font-black text-slate-900 mt-1">{counts.active}</div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Rascunhos</div>
          <div className="text-2xl font-black text-amber-900 mt-1">{counts.drafts}</div>
        </div>
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700">Finalizados</div>
          <div className="text-2xl font-black text-emerald-900 mt-1">{counts.finalized}</div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-xs">
          <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Arquivados</div>
          <div className="text-2xl font-black text-slate-700 mt-1">{counts.archived}</div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 p-3 shadow-xs flex items-center gap-2 overflow-x-auto">
        {filters.map((filter) => (
          <button
            key={filter.id}
            type="button"
            onClick={() => setStatusFilter(filter.id)}
            className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
              statusFilter === filter.id
                ? 'bg-[#0A1F44] text-white shadow-xs'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            {filter.label} ({filter.count})
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 border-b border-slate-200 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
          <div className="col-span-4">Documento</div>
          <div className="col-span-3">Cliente / Contexto</div>
          <div className="col-span-2">Origem</div>
          <div className="col-span-2">Situação</div>
          <div className="col-span-1 text-right">Ação</div>
        </div>

        {filteredDocuments.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
              <span className="material-symbols-outlined text-2xl">draft</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Nenhum documento encontrado</h3>
            <p className="text-xs text-slate-500 mt-1 max-w-lg mx-auto">
              Gere um documento a partir de um cliente ou caso BPC. O rascunho aparecerá aqui automaticamente para ser retomado depois.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredDocuments.map((document) => (
              <div key={document.id} className="p-4 lg:px-5 lg:py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 lg:items-center hover:bg-slate-50/70 transition-colors">
                <div className="lg:col-span-4 min-w-0">
                  <div className="font-bold text-slate-900 text-xs truncate">{document.title}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5 truncate">Modelo: {document.templateTitle}</div>
                  <div className="text-[10px] text-slate-400 mt-0.5">Atualizado: {new Date(document.updatedAt).toLocaleString('pt-BR')}</div>
                </div>

                <div className="lg:col-span-3 min-w-0">
                  <div className="font-semibold text-slate-800 text-xs truncate">{document.clientName}</div>
                  <div className="text-[10px] text-slate-500">CPF {document.clientCpf}</div>
                  {document.bpcCaseSnapshot && (
                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5 truncate">
                      {document.bpcCaseSnapshot.modality === 'pcd' ? 'BPC PCD' : 'BPC Idoso'} • {document.bpcCaseSnapshot.status}
                    </div>
                  )}
                </div>

                <div className="lg:col-span-2">
                  <span className="inline-flex px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-[10px] font-bold">
                    {sourceLabel(document)}
                  </span>
                </div>

                <div className="lg:col-span-2">
                  <span className={`inline-flex px-2.5 py-1 rounded-lg border text-[10px] font-bold ${statusClass[document.status]}`}>
                    {document.status}
                  </span>
                </div>

                <div className="lg:col-span-1 flex lg:justify-end">
                  <button
                    type="button"
                    onClick={() => onOpenDocument(document)}
                    className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-[11px] font-bold inline-flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">open_in_new</span>
                    <span>Abrir</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
