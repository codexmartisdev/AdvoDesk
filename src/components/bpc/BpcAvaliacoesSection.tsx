import React, { useMemo, useState } from 'react';
import { BpcAvaliacaoItem, BpcCaseItem } from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcAvaliacoesSectionProps {
  cases: BpcCaseItem[];
  avaliacoes: BpcAvaliacaoItem[];
  onSaveAvaliacao: (item: BpcAvaliacaoItem) => Promise<void>;
  onUpdateStatus: (
    item: BpcAvaliacaoItem,
    status: BpcAvaliacaoItem['status']
  ) => Promise<void>;
}

export const BpcAvaliacoesSection: React.FC<BpcAvaliacoesSectionProps> = ({
  cases,
  avaliacoes,
  onSaveAvaliacao,
  onUpdateStatus,
}) => {
  const pcdCases = cases.filter((item) => item.modality === 'pcd');
  const activeCaseIds = useMemo(() => new Set(pcdCases.map((item) => item.id)), [pcdCases]);
  const visibleAvaliacoes = avaliacoes.filter((item) => activeCaseIds.has(item.caseId));

  const [showForm, setShowForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [type, setType] = useState<BpcAvaliacaoItem['type'] | ''>('');
  const [date, setDate] = useState('');
  const [status, setStatus] = useState<BpcAvaliacaoItem['status'] | ''>('');
  const [observacoes, setObservacoes] = useState('');
  const [resultado, setResultado] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | BpcAvaliacaoItem['status']>('all');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const filteredAvaliacoes = visibleAvaliacoes
    .filter((item) => filterStatus === 'all' || item.status === filterStatus)
    .sort((a, b) => b.date.localeCompare(a.date));

  const resetForm = () => {
    setSelectedCaseId('');
    setType('');
    setDate('');
    setStatus('');
    setObservacoes('');
    setResultado('');
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedCase = pcdCases.find((item) => item.id === selectedCaseId);
    if (!selectedCase || !type || !date || !status) return;

    const now = getBrasiliaFormatted();
    const item: BpcAvaliacaoItem = {
      id: `bpc-avaliacao-${Date.now()}`,
      caseId: selectedCase.id,
      clientName: selectedCase.clientName,
      type,
      date,
      status,
      observacoes: observacoes.trim() || undefined,
      resultado: resultado.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      completedAt: status === 'Realizada' ? now : undefined,
    };

    setSaving(true);
    try {
      await onSaveAvaliacao(item);
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (
    item: BpcAvaliacaoItem,
    nextStatus: BpcAvaliacaoItem['status']
  ) => {
    if (nextStatus === item.status) return;

    setUpdatingId(item.id);
    try {
      await onUpdateStatus(item, nextStatus);
    } catch {
      // O componente pai já apresenta a mensagem de erro ao usuário.
    } finally {
      setUpdatingId(null);
    }
  };

  const statusBadgeClass = (itemStatus: BpcAvaliacaoItem['status']) => {
    if (itemStatus === 'Realizada') {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (itemStatus === 'Cancelada') {
      return 'bg-slate-100 text-slate-600 border-slate-200';
    }
    return 'bg-blue-50 text-blue-700 border-blue-200';
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-600 text-base">psychology</span>
            <span>Avaliações BPC PCD</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Registro de perícias médicas e avaliações sociais vinculadas aos casos BPC PCD
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm((current) => !current)}
          disabled={pcdCases.length === 0}
          className="px-3.5 py-2 rounded-xl bg-[#0D0D0D] disabled:bg-slate-300 text-white text-xs font-bold inline-flex items-center gap-1.5 border border-[#C9A227]/50 disabled:border-slate-300"
        >
          <span className="material-symbols-outlined text-sm text-[#C9A227]">add</span>
          <span>Nova Avaliação</span>
        </button>
      </div>

      {pcdCases.length === 0 && (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-4 text-xs text-slate-500">
          É necessário possuir ao menos um caso BPC PCD ativo para registrar avaliações.
        </div>
      )}

      {showForm && pcdCases.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-bold text-slate-900">Registrar avaliação</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Informe somente dados efetivamente conhecidos.</p>
            </div>
            <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">Caso BPC PCD</span>
              <select
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-slate-400"
              >
                <option value="">Selecione o requerente</option>
                {pcdCases.map((item) => (
                  <option key={item.id} value={item.id}>{item.clientName}</option>
                ))}
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">Tipo de avaliação</span>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as BpcAvaliacaoItem['type'] | '')}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-slate-400"
              >
                <option value="">Selecione o tipo</option>
                <option value="Perícia Médica">Perícia Médica</option>
                <option value="Avaliação Social">Avaliação Social</option>
              </select>
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">Data</span>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-slate-400"
              />
            </label>

            <label className="space-y-1">
              <span className="text-[11px] font-bold text-slate-700">Situação</span>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as BpcAvaliacaoItem['status'] | '')}
                required
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-slate-400"
              >
                <option value="">Selecione a situação</option>
                <option value="Agendada">Agendada</option>
                <option value="Realizada">Realizada</option>
                <option value="Cancelada">Cancelada</option>
              </select>
            </label>
          </div>

          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-slate-700">Resultado / informação principal (opcional)</span>
            <input
              type="text"
              value={resultado}
              onChange={(event) => setResultado(event.target.value)}
              placeholder="Ex.: avaliação realizada; resultado aguardando comunicação do INSS"
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs focus:outline-hidden focus:border-slate-400"
            />
          </label>

          <label className="space-y-1 block">
            <span className="text-[11px] font-bold text-slate-700">Observações (opcional)</span>
            <textarea
              value={observacoes}
              onChange={(event) => setObservacoes(event.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-xs resize-none focus:outline-hidden focus:border-slate-400"
              placeholder="Informações úteis para acompanhamento da avaliação"
            />
          </label>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving || !selectedCaseId || !type || !date || !status}
              className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] disabled:bg-slate-300 text-white text-xs font-bold border border-[#C9A227]/50 disabled:border-slate-300"
            >
              {saving ? 'Salvando...' : 'Salvar Avaliação'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        {(['all', 'Agendada', 'Realizada', 'Cancelada'] as const).map((filter) => (
          <button
            key={filter}
            type="button"
            onClick={() => setFilterStatus(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold ${
              filterStatus === filter ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {filter === 'all' ? 'Todas' : filter}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {filteredAvaliacoes.length === 0 ? (
          <div className="p-10 text-center">
            <span className="material-symbols-outlined text-3xl text-slate-300">clinical_notes</span>
            <h4 className="mt-2 text-sm font-bold text-slate-800">Nenhuma avaliação registrada</h4>
            <p className="text-xs text-slate-500 mt-1">As avaliações aparecerão aqui somente após cadastro explícito.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filteredAvaliacoes.map((item) => (
              <div key={item.id} className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{item.clientName}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
                      {item.type}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${statusBadgeClass(item.status)}`}>
                      {item.status}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1">Data: {item.date}</div>
                  {item.resultado && <p className="text-xs text-slate-700 mt-2">{item.resultado}</p>}
                  {item.observacoes && <p className="text-[11px] text-slate-500 mt-1">{item.observacoes}</p>}
                </div>

                <label className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Situação</span>
                  <select
                    value={item.status}
                    disabled={updatingId === item.id}
                    onChange={(event) => void handleStatusChange(item, event.target.value as BpcAvaliacaoItem['status'])}
                    className="px-2.5 py-2 rounded-lg border border-slate-200 bg-white disabled:bg-slate-100 text-xs font-semibold text-slate-700"
                  >
                    <option value="Agendada">Agendada</option>
                    <option value="Realizada">Realizada</option>
                    <option value="Cancelada">Cancelada</option>
                  </select>
                </label>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
