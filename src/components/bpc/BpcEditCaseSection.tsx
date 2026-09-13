import React, { useState } from 'react';
import {
  BpcCaseItem,
  BpcModality,
  BpcStatus,
  BpcWorkflowPhaseId,
} from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcEditCaseSectionProps {
  bpcCase: BpcCaseItem;
  onSave: (updatedCase: BpcCaseItem) => Promise<void>;
  onCancel: () => void;
}

type CadUnicoSelection = NonNullable<BpcCaseItem['cadUnicoStatus']> | '';

const STATUS_OPTIONS: BpcStatus[] = [
  'Triagem',
  'Coleta de Documentos',
  'CadÚnico Pendente',
  'Auditoria Pré-Protocolo',
  'Protocolado Meu INSS',
  'Exigência Aberta',
  'Perícia Agendada',
  'Avaliação Social Agendada',
  'Concedido',
  'Indeferido (Recurso)',
  'Fase Judicial',
  'Ativo / Manutenção',
];

const STATUS_TO_STEP: Record<BpcStatus, BpcWorkflowPhaseId> = {
  Triagem: 'triagem',
  'Coleta de Documentos': 'documentos',
  'CadÚnico Pendente': 'cadunico',
  'Auditoria Pré-Protocolo': 'auditoria_pre_protocolo',
  'Protocolado Meu INSS': 'protocolo_inss',
  'Exigência Aberta': 'exigencias',
  'Perícia Agendada': 'pericia_medica',
  'Avaliação Social Agendada': 'avaliacao_social',
  Concedido: 'decisao',
  'Indeferido (Recurso)': 'recurso',
  'Fase Judicial': 'judicial',
  'Ativo / Manutenção': 'manutencao',
};

export const BpcEditCaseSection: React.FC<BpcEditCaseSectionProps> = ({
  bpcCase,
  onSave,
  onCancel,
}) => {
  const [modality, setModality] = useState<BpcModality>(bpcCase.modality);
  const [status, setStatus] = useState<BpcStatus>(bpcCase.status);
  const [cadUnicoStatus, setCadUnicoStatus] = useState<CadUnicoSelection>(
    bpcCase.cadUnicoStatus || ''
  );
  const [nisNumber, setNisNumber] = useState(bpcCase.nisNumber || '');
  const [protocolNumber, setProtocolNumber] = useState(bpcCase.protocolNumber || '');
  const [derDate, setDerDate] = useState(bpcCase.derDate || '');
  const [cidPrincipal, setCidPrincipal] = useState(bpcCase.cidPrincipal || '');
  const [observacoes, setObservacoes] = useState(bpcCase.observacoes || '');
  const [isSaving, setIsSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (isSaving) return;

    const updatedCase: BpcCaseItem = {
      ...bpcCase,
      modality,
      status,
      currentStep: STATUS_TO_STEP[status],
      updatedAt: getBrasiliaFormatted(),
      cadUnicoStatus: cadUnicoStatus || undefined,
      nisNumber: nisNumber.trim() || undefined,
      protocolNumber: protocolNumber.trim() || undefined,
      derDate: derDate || undefined,
      cidPrincipal: modality === 'pcd' ? cidPrincipal.trim() || undefined : undefined,
      observacoes: observacoes.trim() || undefined,
    };

    setIsSaving(true);
    try {
      await onSave(updatedCase);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="p-6 bg-slate-50/70 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-slate-900 text-base">Editar Caso BPC/LOAS</h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Atualize apenas os dados do requerimento. Os dados cadastrais do cliente permanecem vinculados à carteira.
          </p>
        </div>
        <button
          type="button"
          onClick={onCancel}
          className="px-3 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold"
        >
          Voltar aos casos
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
        <section className="space-y-3">
          <h3 className="font-bold text-slate-800">Cliente vinculado</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nome</span>
              <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{bpcCase.clientName}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CPF</span>
              <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{bpcCase.clientCpf || 'Não informado'}</span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Telefone</span>
              <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{bpcCase.clientPhone || 'Não informado'}</span>
            </div>
          </div>
        </section>

        <section className="pt-2 border-t border-slate-100 space-y-3">
          <h3 className="font-bold text-slate-800">Dados principais do caso</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Modalidade</label>
              <select
                value={modality}
                onChange={(event) => setModality(event.target.value as BpcModality)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="idoso">BPC Idoso</option>
                <option value="pcd">BPC Pessoa com Deficiência</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Status / Etapa atual</label>
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value as BpcStatus)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                {STATUS_OPTIONS.map((option) => (
                  <option key={option} value={option}>{option}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Situação do CadÚnico</label>
              <select
                value={cadUnicoStatus}
                onChange={(event) => setCadUnicoStatus(event.target.value as CadUnicoSelection)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="">Não informado</option>
                <option value="Pendente">Pendente de Verificação</option>
                <option value="Atualizado">Atualizado</option>
                <option value="Desatualizado">Desatualizado</option>
                <option value="Não Inscrito">Não Inscrito</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">NIS</label>
              <input
                value={nisNumber}
                onChange={(event) => setNisNumber(event.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
                placeholder="Não informado"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Protocolo Meu INSS</label>
              <input
                value={protocolNumber}
                onChange={(event) => setProtocolNumber(event.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
                placeholder="Não informado"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">DER</label>
              <input
                type="date"
                value={derDate}
                onChange={(event) => setDerDate(event.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>
        </section>

        <section className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3">
          <div className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-blue-700 text-base">event_note</span>
            <div>
              <h3 className="font-bold text-blue-950 text-xs">Prazos e avaliações em módulos próprios</h3>
              <p className="text-[11px] text-blue-900/80 mt-1 leading-relaxed">
                Perícias, avaliações sociais e demais vencimentos devem ser registrados nas abas Prazos e Avaliações. Isso evita datas duplicadas ou divergentes dentro do mesmo caso.
              </p>
            </div>
          </div>
        </section>

        {modality === 'pcd' && (
          <section className="pt-2 border-t border-slate-100">
            <label className="block text-[11px] text-slate-600 mb-1">CID-10 principal / diagnóstico informado</label>
            <input
              value={cidPrincipal}
              onChange={(event) => setCidPrincipal(event.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              placeholder="Não informado"
            />
          </section>
        )}

        <section className="pt-2 border-t border-slate-100">
          <label className="block text-[11px] text-slate-600 mb-1">Observações</label>
          <textarea
            rows={4}
            value={observacoes}
            onChange={(event) => setObservacoes(event.target.value)}
            className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
            placeholder="Sem observações"
          />
        </section>

        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSaving}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-60 text-slate-700 font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-400 text-white font-bold transition-all border border-[#C9A227]/50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">save</span>
            <span>{isSaving ? 'Salvando...' : 'Salvar Alterações'}</span>
          </button>
        </div>
      </form>
    </div>
  );
};
