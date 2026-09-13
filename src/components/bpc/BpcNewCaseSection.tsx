import React, { useState } from 'react';
import { Client } from '../../types';
import { BpcCaseItem, BpcModality } from '../../types/bpc';
import { getBrasiliaFormatted } from '../../utils/dateUtils';

interface BpcNewCaseSectionProps {
  clients: Client[];
  onSaveCase: (newCase: BpcCaseItem) => void;
  onCancel: () => void;
}

type CadUnicoSelection = NonNullable<BpcCaseItem['cadUnicoStatus']> | '';

export const BpcNewCaseSection: React.FC<BpcNewCaseSectionProps> = ({
  clients,
  onSaveCase,
  onCancel,
}) => {
  const [modality, setModality] = useState<BpcModality | null>(null);
  const [selectedClientId, setSelectedClientId] = useState('');

  // Preliminary BPC Details. Factual fields start neutral and are only persisted when informed.
  const [cadUnicoStatus, setCadUnicoStatus] = useState<CadUnicoSelection>('');
  const [nisNumber, setNisNumber] = useState('');
  const [protocolNumber, setProtocolNumber] = useState('');
  const [cidPrincipal, setCidPrincipal] = useState('');
  const [observacoes, setObservacoes] = useState('');

  const selectedClient = clients.find((client) => client.id === selectedClientId);
  const canSubmit = Boolean(modality && selectedClient);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!modality) {
      window.alert('Selecione a modalidade do BPC antes de salvar o caso.');
      return;
    }

    if (!selectedClient) {
      window.alert('Selecione um cliente cadastrado antes de salvar o caso BPC.');
      return;
    }

    const now = getBrasiliaFormatted();

    const newCase: BpcCaseItem = {
      id: `bpc-${Date.now()}`,
      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientCpf: selectedClient.cpf || '',
      clientPhone: selectedClient.phone || '',
      modality,
      status: 'Triagem',
      currentStep: 'triagem',
      createdAt: now,
      updatedAt: now,
      ...(cadUnicoStatus ? { cadUnicoStatus } : {}),
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
          {!modality && (
            <p className="text-[11px] text-slate-500 mt-2">Nenhuma modalidade selecionada.</p>
          )}
        </div>

        {/* 2. Requerente */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          <label className="font-bold text-slate-800 block">
            2. Cliente / Requerente *
          </label>

          {clients.length === 0 ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
              <div className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-lg">person_add</span>
                <div>
                  <p className="font-bold text-xs">Nenhum cliente cadastrado</p>
                  <p className="text-[11px] mt-1 leading-relaxed">
                    Cadastre primeiro o requerente na área Clientes. O caso BPC será vinculado ao cadastro real da carteira.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] text-slate-600 mb-1">Cliente Vinculado</label>
                <select
                  value={selectedClientId}
                  onChange={(e) => setSelectedClientId(e.target.value)}
                  required
                  className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
                >
                  <option value="">Selecione um cliente cadastrado</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name} - CPF: {client.cpf || 'Não informado'} ({client.typePill || 'Cliente'})
                    </option>
                  ))}
                </select>
              </div>

              {selectedClient && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 rounded-xl border border-slate-200 bg-slate-50/70 p-3">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Nome</span>
                    <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{selectedClient.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">CPF</span>
                    <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{selectedClient.cpf || 'Não informado'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">Telefone</span>
                    <span className="text-[11px] font-semibold text-slate-800 block mt-0.5">{selectedClient.phone || 'Não informado'}</span>
                  </div>
                </div>
              )}
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
                onChange={(e) => setCadUnicoStatus(e.target.value as CadUnicoSelection)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-xs focus:bg-white focus:outline-hidden"
              >
                <option value="">Não informado</option>
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
            disabled={!canSubmit}
            className="px-6 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black disabled:bg-slate-300 disabled:border-slate-300 disabled:cursor-not-allowed text-white font-bold transition-all shadow-xs border border-[#C9A227]/50 flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">check_circle</span>
            <span>Salvar e Iniciar Caso BPC</span>
          </button>
        </div>
      </form>
    </div>
  );
};
