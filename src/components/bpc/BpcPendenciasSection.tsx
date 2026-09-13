import React, { useMemo, useState } from 'react';
import { BpcCaseItem, BpcPendenciaItem } from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcPendenciasSectionProps {
  cases: BpcCaseItem[];
  pendencias: BpcPendenciaItem[];
  onOpenNewCase: () => void;
  onSavePendencia: (item: BpcPendenciaItem) => Promise<void>;
  onToggleResolved: (item: BpcPendenciaItem) => Promise<void>;
}

type PendenciaTypeSelection = BpcPendenciaItem['type'] | '';
type SeveritySelection = BpcPendenciaItem['severity'] | '';
type ViewFilter = 'abertas' | 'resolvidas';

export const BpcPendenciasSection: React.FC<BpcPendenciasSectionProps> = ({
  cases,
  pendencias,
  onOpenNewCase,
  onSavePendencia,
  onToggleResolved,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [selectedCaseId, setSelectedCaseId] = useState('');
  const [type, setType] = useState<PendenciaTypeSelection>('');
  const [description, setDescription] = useState('');
  const [deadline, setDeadline] = useState('');
  const [severity, setSeverity] = useState<SeveritySelection>('');
  const [viewFilter, setViewFilter] = useState<ViewFilter>('abertas');
  const [isSaving, setIsSaving] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const activeCaseIds = useMemo(() => new Set(cases.map((item) => item.id)), [cases]);
  const operationalPendencias = pendencias.filter((item) => activeCaseIds.has(item.caseId));
  const openCount = operationalPendencias.filter((item) => !item.resolved).length;
  const resolvedCount = operationalPendencias.filter((item) => item.resolved).length;

  const visiblePendencias = operationalPendencias
    .filter((item) => (viewFilter === 'abertas' ? !item.resolved : item.resolved))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

  const selectedCase = cases.find((item) => item.id === selectedCaseId);
  const canSubmit = Boolean(selectedCase && type && description.trim() && severity);

  const resetForm = () => {
    setSelectedCaseId('');
    setType('');
    setDescription('');
    setDeadline('');
    setSeverity('');
    setShowForm(false);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!selectedCase || !type || !description.trim() || !severity) {
      window.alert('Preencha o caso, tipo, descrição e prioridade da pendência.');
      return;
    }

    const now = getBrasiliaFormatted();
    const newItem: BpcPendenciaItem = {
      id: `bpc-pend-${Date.now()}`,
      caseId: selectedCase.id,
      clientName: selectedCase.clientName,
      type,
      description: description.trim(),
      deadline: deadline || undefined,
      resolved: false,
      severity,
      createdAt: now,
      updatedAt: now,
    };

    setIsSaving(true);
    try {
      await onSavePendencia(newItem);
      resetForm();
      setViewFilter('abertas');
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggleResolved = async (item: BpcPendenciaItem) => {
    setBusyItemId(item.id);
    try {
      await onToggleResolved(item);
    } finally {
      setBusyItemId(null);
    }
  };

  const severityClasses: Record<BpcPendenciaItem['severity'], string> = {
    alta: 'bg-red-50 text-red-700 border-red-200',
    media: 'bg-amber-50 text-amber-800 border-amber-200',
    baixa: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
            <span>Controle de Pendências BPC</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Registre tarefas, documentos e exigências reais vinculadas aos casos ativos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {openCount} abertas
          </span>
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            disabled={cases.length === 0}
            className="px-3 py-2 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold flex items-center gap-1.5 border border-[#C9A227]/50"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">add_task</span>
            <span>Nova Pendência</span>
          </button>
        </div>
      </div>

      {cases.length === 0 && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900">
          <p className="font-bold text-xs">Nenhum caso BPC ativo disponível</p>
          <p className="text-[11px] mt-1">
            Cadastre ou restaure um caso antes de registrar uma pendência.
          </p>
          <button
            type="button"
            onClick={onOpenNewCase}
            className="mt-3 text-[11px] font-bold underline"
          >
            Abrir novo caso BPC
          </button>
        </div>
      )}

      {showForm && cases.length > 0 && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h4 className="font-bold text-slate-900 text-sm">Registrar Pendência</h4>
              <p className="text-[11px] text-slate-500 mt-0.5">Somente dados informados serão persistidos.</p>
            </div>
            <button type="button" onClick={resetForm} className="text-xs font-bold text-slate-500 hover:text-slate-800">
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-600 mb-1">Caso BPC *</label>
              <select
                value={selectedCaseId}
                onChange={(event) => setSelectedCaseId(event.target.value)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
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
              <label className="block text-[11px] text-slate-600 mb-1">Tipo *</label>
              <select
                value={type}
                onChange={(event) => setType(event.target.value as PendenciaTypeSelection)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="">Selecione</option>
                <option value="Documento">Documento</option>
                <option value="CadÚnico">CadÚnico</option>
                <option value="Biometria">Biometria</option>
                <option value="Exigência INSS">Exigência INSS</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Prioridade *</label>
              <select
                value={severity}
                onChange={(event) => setSeverity(event.target.value as SeveritySelection)}
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              >
                <option value="">Selecione</option>
                <option value="alta">Alta</option>
                <option value="media">Média</option>
                <option value="baixa">Baixa</option>
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-[11px] text-slate-600 mb-1">Descrição *</label>
              <textarea
                rows={3}
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Descreva objetivamente o que precisa ser resolvido."
                required
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Prazo, se houver</label>
              <input
                type="date"
                value={deadline}
                onChange={(event) => setDeadline(event.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {selectedCase && (
            <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] text-slate-600">
              Vinculada a <strong className="text-slate-900">{selectedCase.clientName}</strong> · CPF {selectedCase.clientCpf || 'Não informado'}
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!canSubmit || isSaving}
              className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-300 disabled:cursor-not-allowed text-white text-xs font-bold border border-[#C9A227]/50"
            >
              {isSaving ? 'Salvando...' : 'Salvar Pendência'}
            </button>
          </div>
        </form>
      )}

      <div className="flex items-center gap-1.5 p-1 bg-white rounded-xl border border-slate-200 shadow-xs w-fit">
        <button
          type="button"
          onClick={() => setViewFilter('abertas')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewFilter === 'abertas' ? 'bg-[#0D0D0D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Abertas ({openCount})
        </button>
        <button
          type="button"
          onClick={() => setViewFilter('resolvidas')}
          className={`px-3 py-1.5 rounded-lg text-xs font-bold ${viewFilter === 'resolvidas' ? 'bg-[#0D0D0D] text-white' : 'text-slate-600 hover:bg-slate-100'}`}
        >
          Resolvidas ({resolvedCount})
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {visiblePendencias.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-slate-100 border border-slate-200 flex items-center justify-center mx-auto text-slate-400 mb-3">
              <span className="material-symbols-outlined text-2xl">task_alt</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">
              {viewFilter === 'abertas' ? 'Nenhuma pendência aberta' : 'Nenhuma pendência resolvida'}
            </h4>
            <p className="text-slate-500 text-xs mt-1">
              Esta lista mostra somente pendências cadastradas e persistidas no módulo.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visiblePendencias.map((item) => (
              <div key={item.id} className="p-4 md:p-5 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div className="flex items-start gap-3 min-w-0">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 border ${item.resolved ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-800 border-amber-200'}`}>
                    <span className="material-symbols-outlined text-base">{item.resolved ? 'task_alt' : 'assignment_late'}</span>
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">{item.clientName}</span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border ${severityClasses[item.severity]}`}>
                        {item.severity === 'alta' ? 'Alta' : item.severity === 'media' ? 'Média' : 'Baixa'}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-xs text-slate-700 mt-1.5 whitespace-pre-wrap">{item.description}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500 mt-2">
                      {item.deadline && <span>Prazo: {item.deadline}</span>}
                      <span>Atualizado: {item.updatedAt}</span>
                      {item.resolvedAt && <span>Resolvida: {item.resolvedAt}</span>}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busyItemId === item.id}
                  onClick={() => void handleToggleResolved(item)}
                  className={`px-3 py-2 rounded-xl text-[11px] font-bold inline-flex items-center gap-1.5 disabled:opacity-50 ${item.resolved ? 'bg-slate-100 text-slate-700 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'}`}
                >
                  <span className="material-symbols-outlined text-sm">{item.resolved ? 'undo' : 'check'}</span>
                  <span>{busyItemId === item.id ? 'Salvando...' : item.resolved ? 'Reabrir' : 'Resolver'}</span>
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
