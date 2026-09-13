import React, { useState } from 'react';
import { BpcCaseItem, BpcModality } from '../../types/bpc';

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

  const activeCases = cases.filter((item) => !item.archivedAt);
  const archivedCases = cases.filter((item) => Boolean(item.archivedAt));
  const lifecycleCases = lifecycleFilter === 'active' ? activeCases : archivedCases;

  const filteredCases = lifecycleCases.filter((item) => {
    if (filterModality !== 'all' && item.modality !== filterModality) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const matchName = item.clientName.toLowerCase().includes(q);
      const matchCpf = item.clientCpf.includes(q);
      const matchProtocol = item.protocolNumber?.toLowerCase().includes(q) || false;
      return matchName || matchCpf || matchProtocol;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3 items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 rounded-xl w-full md:w-auto">
            <button
              type="button"
              onClick={() => setLifecycleFilter('active')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lifecycleFilter === 'active'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Ativos ({activeCases.length})
            </button>
            <button
              type="button"
              onClick={() => setLifecycleFilter('archived')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                lifecycleFilter === 'archived'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Arquivados ({archivedCases.length})
            </button>
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
              <input
                type="text"
                placeholder="Buscar requerente ou CPF..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
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

        <div className="flex items-center gap-1.5 p-1 bg-slate-50 rounded-xl w-full md:w-fit border border-slate-200">
          <button
            type="button"
            onClick={() => setFilterModality('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              filterModality === 'all'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Todos ({lifecycleCases.length})
          </button>
          <button
            type="button"
            onClick={() => setFilterModality('idoso')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterModality === 'idoso'
                ? 'bg-white text-amber-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-amber-600">elderly</span>
            <span>BPC Idoso ({lifecycleCases.filter((c) => c.modality === 'idoso').length})</span>
          </button>
          <button
            type="button"
            onClick={() => setFilterModality('pcd')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              filterModality === 'pcd'
                ? 'bg-white text-blue-900 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="material-symbols-outlined text-sm text-blue-600">accessible_forward</span>
            <span>BPC PCD ({lifecycleCases.filter((c) => c.modality === 'pcd').length})</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredCases.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <span className="material-symbols-outlined text-2xl">folder_off</span>
            </div>
            <h3 className="font-bold text-slate-900 text-sm">
              {lifecycleFilter === 'active' ? 'Nenhum caso BPC ativo encontrado' : 'Nenhum caso BPC arquivado encontrado'}
            </h3>
            <p className="text-slate-500 text-xs mt-1 max-w-sm mx-auto">
              {lifecycleFilter === 'active'
                ? 'Nenhum requerimento ativo corresponde aos filtros selecionados.'
                : 'Nenhum requerimento arquivado corresponde aos filtros selecionados.'}
            </p>
            {lifecycleFilter === 'active' && (
              <button
                type="button"
                onClick={onOpenNewCase}
                className="mt-4 px-4 py-2 rounded-xl bg-[#0D0D0D] text-white text-xs font-bold inline-flex items-center gap-1.5 hover:bg-black shadow-xs border border-[#C9A227]/40"
              >
                <span className="material-symbols-outlined text-sm text-[#C9A227]">add</span>
                <span>Cadastrar Primeiro Caso BPC</span>
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            <div className="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/70 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
              <div className="col-span-4">Requerente & Modalidade</div>
              <div className="col-span-2">CadÚnico & NIS</div>
              <div className="col-span-3">Status / Etapa Atual</div>
              <div className="col-span-2">Protocolo INSS</div>
              <div className="col-span-1 text-right">Ações</div>
            </div>

            {filteredCases.map((item) => (
              <div
                key={item.id}
                className="p-4 md:px-5 md:py-3.5 flex flex-col md:grid md:grid-cols-12 gap-2 md:gap-4 items-start md:items-center hover:bg-slate-50/80 transition-colors"
              >
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <div
                      className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                        item.modality === 'idoso'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">
                        {item.modality === 'idoso' ? 'elderly' : 'accessible_forward'}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <span className="font-bold text-slate-900 text-xs truncate block">{item.clientName}</span>
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                        <span>CPF: {item.clientCpf || 'Não informado'}</span>
                        <span>•</span>
                        <span className={`font-semibold ${item.modality === 'idoso' ? 'text-amber-700' : 'text-blue-700'}`}>
                          {item.modality === 'idoso' ? 'BPC Idoso' : 'BPC PCD'}
                        </span>
                      </div>
                      {item.archivedAt && (
                        <span className="text-[10px] text-slate-400 block mt-1">Arquivado em: {item.archivedAt}</span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 text-xs">
                  <span className="text-[11px] font-medium text-slate-700 block">NIS: {item.nisNumber || 'Não informado'}</span>
                  <span
                    className={`text-[10px] font-bold inline-block px-1.5 py-0.5 rounded-md mt-0.5 ${
                      item.cadUnicoStatus === 'Atualizado'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {item.cadUnicoStatus || 'Não informado'}
                  </span>
                </div>

                <div className="col-span-3">
                  <span className="text-xs font-bold text-slate-900 block truncate">{item.status}</span>
                  <span className="text-[10px] text-slate-500 block truncate mt-0.5">Atualizado: {item.updatedAt}</span>
                </div>

                <div className="col-span-2 text-xs text-slate-600">
                  <span className="font-mono text-[11px] block">{item.protocolNumber || 'Não informado'}</span>
                  {item.derDate && <span className="text-[10px] text-slate-400 block">DER: {item.derDate}</span>}
                </div>

                <div className="col-span-1 flex justify-end gap-1.5 w-full md:w-auto">
                  {item.archivedAt ? (
                    <button
                      type="button"
                      onClick={() => onRestoreCase(item)}
                      className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-bold inline-flex items-center gap-1 border border-emerald-200"
                    >
                      <span className="material-symbols-outlined text-sm">unarchive</span>
                      <span>Restaurar</span>
                    </button>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => onSelectCase(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold inline-flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">edit</span>
                        <span>Editar</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => onArchiveCase(item)}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold inline-flex items-center gap-1 border border-amber-200"
                      >
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
  );
};
