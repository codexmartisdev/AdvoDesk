import React, { useMemo, useState } from 'react';
import { BpcCaseItem, BpcDeadlineItem } from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcPrazosSectionProps {
  cases: BpcCaseItem[];
  deadlines: BpcDeadlineItem[];
  onSaveDeadline: (item: BpcDeadlineItem) => Promise<void>;
  onToggleStatus: (item: BpcDeadlineItem) => Promise<void>;
}

type DeadlineType = BpcDeadlineItem['type'];
type DeadlineFilter = 'pendentes' | 'concluidos' | 'todos';

const deadlineTypes: DeadlineType[] = [
  'Perícia Médica',
  'Avaliação Social',
  'Cumprimento de Exigência',
  'Prazo Recursal',
  'Outro',
];

function formatDate(date: string) {
  const [year, month, day] = date.split('-');
  if (!year || !month || !day) return date;
  return `${day}/${month}/${year}`;
}

export const BpcPrazosSection: React.FC<BpcPrazosSectionProps> = ({
  cases,
  deadlines,
  onSaveDeadline,
  onToggleStatus,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState<DeadlineFilter>('pendentes');
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [type, setType] = useState<DeadlineType | ''>('');
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const activeCaseIds = useMemo(() => new Set(cases.map((item) => item.id)), [cases]);
  const operationalDeadlines = deadlines.filter((item) => activeCaseIds.has(item.caseId));
  const pendingCount = operationalDeadlines.filter((item) => item.status === 'Pendente').length;
  const completedCount = operationalDeadlines.filter((item) => item.status === 'Concluído').length;

  const visibleDeadlines = operationalDeadlines
    .filter((item) => {
      if (filter === 'pendentes') return item.status === 'Pendente';
      if (filter === 'concluidos') return item.status === 'Concluído';
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  const resetForm = () => {
    setSelectedCaseId('');
    setType('');
    setTitle('');
    setDate('');
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    const selectedCase = cases.find((item) => item.id === selectedCaseId);
    if (!selectedCase || !type || !title.trim() || !date) {
      window.alert('Selecione o caso, informe o tipo, o título e a data do prazo.');
      return;
    }

    const now = getBrasiliaFormatted();
    const item: BpcDeadlineItem = {
      id: `bpc-prazo-${Date.now()}`,
      caseId: selectedCase.id,
      clientName: selectedCase.clientName,
      title: title.trim(),
      date,
      type,
      status: 'Pendente',
      createdAt: now,
      updatedAt: now,
    };

    setIsSaving(true);
    try {
      await onSaveDeadline(item);
      resetForm();
      setShowForm(false);
      setFilter('pendentes');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">calendar_clock</span>
            <span>Controle de Prazos BPC</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Prazos e agendamentos cadastrados de forma explícita e vinculados aos casos ativos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {pendingCount} pendentes
          </span>
          <button
            type="button"
            onClick={() => setShowForm((value) => !value)}
            disabled={cases.length === 0}
            className="px-3 py-2 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-300 disabled:border-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 border border-[#C9A227]/50"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">add</span>
            <span>Novo Prazo</span>
          </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h4 className="text-xs font-bold text-slate-900">Cadastrar Prazo</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Informe somente datas efetivamente conhecidas. O sistema não calcula nem presume vencimentos.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Caso BPC *</label>
              <select
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="">Selecione um caso ativo</option>
                {cases.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.clientName} — {item.modality === 'idoso' ? 'BPC Idoso' : 'BPC PCD'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Tipo *</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as DeadlineType | '')}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="">Selecione o tipo</option>
                {deadlineTypes.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Título *</label>
              <input
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ex.: Comparecimento à perícia do INSS"
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Data *</label>
              <input
                type="date"
                value={date}
                onChange={(event) => setDate(event.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                resetForm();
                setShowForm(false);
              }}
              className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-4 py-2 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-400 text-white text-xs font-bold border border-[#C9A227]/50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Prazo'}
            </button>
          </div>
        </form>
      )}

      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-xs flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('pendentes')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === 'pendentes' ? 'bg-[#0D0D0D] text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Pendentes ({pendingCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('concluidos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === 'concluidos' ? 'bg-[#0D0D0D] text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Concluídos ({completedCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('todos')}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold ${filter === 'todos' ? 'bg-[#0D0D0D] text-white' : 'bg-slate-100 text-slate-600'}`}
        >
          Todos ({operationalDeadlines.length})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {visibleDeadlines.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <span className="material-symbols-outlined text-2xl">event_available</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Nenhum prazo nesta visão</h4>
            <p className="text-slate-500 text-xs mt-1">
              Cadastre um prazo real ou altere o filtro para consultar registros concluídos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleDeadlines.map((item) => (
              <div key={item.id} className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-3 hover:bg-slate-50/70">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 text-xs">{item.title}</span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 border border-slate-200">
                      {item.type}
                    </span>
                    {item.status === 'Concluído' && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Concluído
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex flex-wrap gap-x-2 gap-y-1">
                    <span>{item.clientName}</span>
                    <span>•</span>
                    <span className="font-semibold text-slate-700">{formatDate(item.date)}</span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => void onToggleStatus(item)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 shrink-0 ${
                    item.status === 'Pendente'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                      : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">
                    {item.status === 'Pendente' ? 'check_circle' : 'restart_alt'}
                  </span>
                  <span>{item.status === 'Pendente' ? 'Concluir' : 'Reabrir'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
