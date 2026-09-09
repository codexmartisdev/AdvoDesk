import React, { useState } from 'react';
import { Client } from '../../types';
import { BpcCaseItem, BpcModality } from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcNewCaseSectionProps {
  clients: Client[];
  onSaveCase: (newCase: BpcCaseItem) => void;
  onCancel: () => void;
}

export const BpcNewCaseSection: React.FC<BpcNewCaseSectionProps> = ({
  clients,
  onSaveCase,
  onCancel,
}) => {
  const [modality, setModality] = useState<BpcModality>('idoso');
  const [selectedClientId, setSelectedClientId] = useState(clients[0]?.id || '');
  const [useNewClient, setUseNewClient] = useState(clients.length === 0);

  // Manual Requerente input
  const [requerenteName, setRequerenteName] = useState('');
  const [requerenteCpf, setRequerenteCpf] = useState('');
  const [requerentePhone, setRequerentePhone] = useState('');

  // Preliminary BPC Details
  const [cadUnicoStatus, setCadUnicoStatus] = useState<'Atualizado' | 'Desatualizado' | 'Não Inscrito' | 'Pendente'>('Pendente');
  const [nisNumber, setNisNumber] = useState('');
  const [protocolNumber, setProtocolNumber] = useState('');
  const [cidPrincipal, setCidPrincipal] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const selectedClient = clients.find((c) => c.id === selectedClientId);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const finalClientName = useNewClient
      ? requerenteName.trim()
      : selectedClient?.name || 'Requerente';

    const finalClientCpf = useNewClient
      ? requerenteCpf.trim()
      : selectedClient?.cpf || '';

    const finalClientPhone = useNewClient
      ? requerentePhone.trim()
      : selectedClient?.phone || '';

    if (!finalClientName) return;

    const newCase: BpcCaseItem = {
      id: `bpc-${Date.now()}`,
      caseNumber: `BPC #${Math.floor(1000 + Math.random() * 9000)}`,
      clientId: useNewClient ? `c-new-${Date.now()}` : selectedClientId,
      clientName: finalClientName,
      clientCpf: finalClientCpf,
      clientPhone: finalClientPhone,
      modality,
      status: 'Triagem',
      currentStep: 'triagem',
      createdAt: getBrasiliaFormatted(),
      updatedAt: getBrasiliaFormatted(),
      cadUnicoStatus,
      nisNumber: nisNumber.trim() || undefined,
      protocolNumber: protocolNumber.trim() || undefined,
      cidPrincipal: modality === 'pcd' ? cidPrincipal.trim() || undefined : undefined,
      observacoes: observacoes.trim() || undefined,
    };

    onSaveCase(newCase);
  };

  return (
    <div className="max-w-3xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Header */}
      <div className="p-6 bg-slate-50/70 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] text-[#C9A227] flex items-center justify-center border border-[#C9A227]/40 shrink-0">
            <span className="material-symbols-outlined text-xl">accessibility_new</span>
          </div>
          <div>
            <h2 className="font-bold text-slate-900 text-base">Abertura de Caso BPC/LOAS</h2>
            <p className="text-slate-500 text-xs mt-0.5">
              Estrutura inicial de requerimento do Benefício de Prestação Continuada
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 text-xs">
        {/* 1. Modalidade BPC */}
        <div>
          <label className="block font-bold text-slate-800 mb-2">
            1. Selecione a Modalidade do BPC *
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setModality('idoso')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                modality === 'idoso'
                  ? 'border-amber-600 bg-amber-50/50 shadow-xs ring-1 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">elderly</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">BPC Idoso</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Idade igual ou superior a 65 anos + critério de vulnerabilidade socioeconômica.
                </span>
              </div>
            </button>

            <button
              type="button"
              onClick={() => setModality('pcd')}
              className={`p-4 rounded-xl border text-left transition-all flex items-start gap-3 ${
                modality === 'pcd'
                  ? 'border-blue-600 bg-blue-50/50 shadow-xs ring-1 ring-blue-500/20'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-800 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-base">accessible_forward</span>
              </div>
              <div>
                <span className="font-bold text-slate-900 text-xs block">BPC Pessoa com Deficiência (PCD)</span>
                <span className="text-[11px] text-slate-500 block mt-0.5">
                  Impedimento de longo prazo (mínimo 2 anos) + avaliação social e médica.
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* 2. Requerente */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <div className="flex items-center justify-between">
            <label className="font-bold text-slate-800">
              2. Dados do Requerente *
            </label>
            {clients.length > 0 && (
              <button
                type="button"
                onClick={() => setUseNewClient(!useNewClient)}
                className="text-[11px] font-bold text-blue-900 hover:underline"
              >
                {useNewClient ? 'Selecionar da carteira de clientes' : '+ Digitar novo requerente'}
              </button>
            )}
          </div>

          {!useNewClient && clients.length > 0 ? (
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Cliente Vinculado</label>
              <select
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} - CPF: {c.cpf || 'Sem CPF'} ({c.typePill || 'Cliente'})
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <label className="block text-[11px] text-slate-600 mb-1">Nome Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Nome do titular requerente"
                  value={requerenteName}
                  onChange={(e) => setRequerenteName(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">CPF *</label>
                <input
                  type="text"
                  required
                  placeholder="000.000.000-00"
                  value={requerenteCpf}
                  onChange={(e) => setRequerenteCpf(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Triagem & CadÚnico */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="font-bold text-slate-800 block">
            3. Triagem CadÚnico & INSS
          </label>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Situação do CadÚnico</label>
              <select
                value={cadUnicoStatus}
                onChange={(e) => setCadUnicoStatus(e.target.value as any)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="Pendente">Pendente de Verificação</option>
                <option value="Atualizado">Atualizado (&lt; 24 meses)</option>
                <option value="Desatualizado">Desatualizado (Exige CRAS)</option>
                <option value="Não Inscrito">Não Possui CadÚnico</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Número do NIS</label>
              <input
                type="text"
                placeholder="Número de Identificação Social"
                value={nisNumber}
                onChange={(e) => setNisNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>

            <div>
              <label className="block text-[11px] text-slate-600 mb-1">Protocolo Meu INSS (se houver)</label>
              <input
                type="text"
                placeholder="Ex: 198273412"
                value={protocolNumber}
                onChange={(e) => setProtocolNumber(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          </div>

          {modality === 'pcd' && (
            <div>
              <label className="block text-[11px] text-slate-600 mb-1">CID-10 Principal ou Diagnóstico Pré-Avaliado</label>
              <input
                type="text"
                placeholder="Ex: F84.0 (TEA), M54.5, G80, etc."
                value={cidPrincipal}
                onChange={(e) => setCidPrincipal(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              />
            </div>
          )}

          <div>
            <label className="block text-[11px] text-slate-600 mb-1">Observações Iniciais / Resumo do Caso</label>
            <textarea
              rows={3}
              placeholder="Anotações de triagem, composição familiar preliminar ou pendências imediatas..."
              value={observacoes}
              onChange={(e) => setObservacoes(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
            />
          </div>
        </div>

        {/* Buttons */}
        <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-colors"
          >
            Cancelar
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black text-white font-bold transition-all shadow-xs border border-[#C9A227]/50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">check_circle</span>
            <span>Salvar e Iniciar Caso BPC</span>
          </button>
        </div>
      </form>
    </div>
  );
};
