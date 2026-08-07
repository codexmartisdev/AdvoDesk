import React, { useState, useMemo } from 'react';
import { Client, DocumentTemplate, FirmSettings } from '../types';
import {
  CLIENT_VARIABLES,
  replaceVariablesInTemplateText,
} from '../utils/documentReplacer';

interface ClientSelectorDocumentModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: DocumentTemplate | null;
  clients: Client[];
  settings?: FirmSettings;
  onConfirmGenerate: (generatedText: string, client: Client, template: DocumentTemplate) => void;
  onUpdateClientField?: (clientId: string, fieldKey: keyof Client, value: any) => void;
}

export const ClientSelectorDocumentModal: React.FC<ClientSelectorDocumentModalProps> = ({
  isOpen,
  onClose,
  template,
  clients,
  settings,
  onConfirmGenerate,
  onUpdateClientField,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [emptyStrategy, setEmptyStrategy] = useState<'placeholder' | 'omit'>('placeholder');
  const [customPlaceholder, setCustomPlaceholder] = useState('[Não informado]');

  // Quick edit state for missing variables
  const [quickFillValues, setQuickFillValues] = useState<Record<string, string>>({});

  const selectedClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  const filteredClients = useMemo(() => {
    if (!searchTerm.trim()) return clients;
    const term = searchTerm.toLowerCase();
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(term) ||
        c.cpf.includes(term) ||
        c.code.toLowerCase().includes(term) ||
        (c.typePill && c.typePill.toLowerCase().includes(term))
    );
  }, [clients, searchTerm]);

  // Merge selected client with quick fill values if any
  const effectiveClient = useMemo(() => {
    if (!selectedClient) return null;
    const copy = { ...selectedClient };

    // Apply quick fill overrides
    if (quickFillValues['{CLIENTE_NB}']) copy.benefitNumber = quickFillValues['{CLIENTE_NB}'];
    if (quickFillValues['{CLIENTE_NIT}']) copy.nitPisPasep = quickFillValues['{CLIENTE_NIT}'];
    if (quickFillValues['{CLIENTE_NOME_SOCIAL}']) copy.socialName = quickFillValues['{CLIENTE_NOME_SOCIAL}'];
    if (quickFillValues['{CLIENTE_RG}']) copy.rgNumber = quickFillValues['{CLIENTE_RG}'];
    if (quickFillValues['{CLIENTE_PROFISSAO}']) copy.occupation = quickFillValues['{CLIENTE_PROFISSAO}'];
    if (quickFillValues['{CLIENTE_RENDA_MENSAL}']) copy.monthlyIncome = quickFillValues['{CLIENTE_RENDA_MENSAL}'];
    if (quickFillValues['{CLIENTE_NOME_MAE}']) copy.motherName = quickFillValues['{CLIENTE_NOME_MAE}'];
    if (quickFillValues['{CLIENTE_NOME_PAI}']) copy.fatherName = quickFillValues['{CLIENTE_NOME_PAI}'];
    if (quickFillValues['{CLIENTE_ESTADO_CIVIL}']) copy.maritalStatus = quickFillValues['{CLIENTE_ESTADO_CIVIL}'];
    if (quickFillValues['{CLIENTE_TELEFONE_SECUNDARIO}']) copy.phoneSecondary = quickFillValues['{CLIENTE_TELEFONE_SECUNDARIO}'];

    return copy;
  }, [selectedClient, quickFillValues]);

  // Analysis of template text
  const replacementAnalysis = useMemo(() => {
    if (!template || !template.contentPattern) {
      return { replacedText: '', usedVariables: [], missingVariables: [] };
    }

    return replaceVariablesInTemplateText(
      template.contentPattern,
      effectiveClient,
      settings,
      emptyStrategy,
      customPlaceholder
    );
  }, [template, effectiveClient, settings, emptyStrategy, customPlaceholder]);

  if (!isOpen || !template) return null;

  const handleSelectClientCard = (client: Client) => {
    setSelectedClientId(client.id);
    setQuickFillValues({});
  };

  const handleQuickFillChange = (varKey: string, val: string) => {
    setQuickFillValues((prev) => ({ ...prev, [varKey]: val }));
  };

  const handleProceedToGenerate = () => {
    if (!effectiveClient) {
      alert('Por favor, selecione um cliente da lista.');
      return;
    }

    // Save quick fills back to client if callback provided
    if (onUpdateClientField && selectedClient) {
      if (quickFillValues['{CLIENTE_NB}']) onUpdateClientField(selectedClient.id, 'benefitNumber', quickFillValues['{CLIENTE_NB}']);
      if (quickFillValues['{CLIENTE_NIT}']) onUpdateClientField(selectedClient.id, 'nitPisPasep', quickFillValues['{CLIENTE_NIT}']);
      if (quickFillValues['{CLIENTE_PROFISSAO}']) onUpdateClientField(selectedClient.id, 'occupation', quickFillValues['{CLIENTE_PROFISSAO}']);
    }

    onConfirmGenerate(replacementAnalysis.replacedText, effectiveClient, template);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-5 md:p-8 border border-slate-200 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        {/* Modal Close */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors"
        >
          <span className="material-symbols-outlined">close</span>
        </button>

        {/* Modal Header */}
        <div className="flex items-center space-x-3 mb-5 shrink-0 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
            <span className="material-symbols-outlined text-2xl">{template.icon || 'description'}</span>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-900 font-bold text-[10px] uppercase">
                {template.category}
              </span>
              {template.format && (
                <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-900 font-bold text-[10px]">
                  {template.format}
                </span>
              )}
            </div>
            <h2 className="font-title-md text-lg font-black text-slate-900 mt-0.5">
              Gerar Documento: {template.title}
            </h2>
            <p className="text-xs text-slate-500 font-medium">
              Selecione o cliente cadastrado para substituir automaticamente todas as variáveis da minuta.
            </p>
          </div>
        </div>

        {/* Modal Content Scrollable Area */}
        <div className="overflow-y-auto pr-1 space-y-5 flex-1 text-xs">
          {/* STEP 1: CLIENT SELECTOR */}
          <div>
            <label className="block font-extrabold text-slate-800 text-xs mb-2">
              1. Selecionar Cliente Cadastrado *
            </label>

            <div className="relative mb-3">
              <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">
                search
              </span>
              <input
                type="text"
                placeholder="Buscar por nome, CPF ou código do cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 max-h-48 overflow-y-auto p-1 bg-slate-50/80 rounded-2xl border border-slate-200">
              {filteredClients.map((client) => {
                const isSelected = selectedClientId === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => handleSelectClientCard(client)}
                    className={`p-3 rounded-xl text-left border transition-all flex items-start space-x-3 ${
                      isSelected
                        ? 'bg-blue-900 text-white border-blue-900 shadow-xs'
                        : 'bg-white hover:bg-slate-100/80 text-slate-800 border-slate-200/90'
                    }`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-900'
                      }`}
                    >
                      {client.name.charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-xs truncate leading-snug">{client.name}</p>
                      <p className={`text-[10px] mt-0.5 ${isSelected ? 'text-blue-100' : 'text-slate-500'}`}>
                        CPF: {client.cpf} • {client.typePill || 'Cliente'}
                      </p>
                    </div>
                    {isSelected && (
                      <span className="material-symbols-outlined text-sm text-white shrink-0">check_circle</span>
                    )}
                  </button>
                );
              })}

              {filteredClients.length === 0 && (
                <div className="col-span-full py-6 text-center text-slate-500">
                  <p className="font-bold">Nenhum cliente encontrado.</p>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: MISSING DATA WARNING & QUICK FILL */}
          {selectedClient && (
            <div className="space-y-3 pt-2">
              {/* Warning Banner if missing variables */}
              {replacementAnalysis.missingVariables.length > 0 ? (
                <div className="bg-amber-50/90 border border-amber-200/90 rounded-2xl p-4 text-amber-900 space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <span className="material-symbols-outlined text-amber-600 text-xl shrink-0 mt-0.5">
                      warning
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-amber-900">
                        Alerta de Dados Faltantes no Cadastro do Cliente
                      </h4>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        A minuta utiliza <strong>{replacementAnalysis.missingVariables.length} variável(is)</strong> que ainda não foram preenchidas no cadastro de <strong>{selectedClient.name}</strong>.
                      </p>
                    </div>
                  </div>

                  {/* List of missing fields with quick fill inputs */}
                  <div className="space-y-2 bg-white/80 rounded-xl p-3 border border-amber-200/60">
                    <p className="text-[11px] font-bold text-amber-950">Preencha rapidamente abaixo ou defina como tratar campos vazios:</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {replacementAnalysis.missingVariables.map((m) => (
                        <div key={m.key} className="space-y-1">
                          <label className="text-[10px] font-bold text-slate-700 block truncate">
                            {m.label} ({m.key})
                          </label>
                          <input
                            type="text"
                            placeholder={`Digitar ${m.label}...`}
                            value={quickFillValues[m.key] || ''}
                            onChange={(e) => handleQuickFillChange(m.key, e.target.value)}
                            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:outline-none focus:ring-1 focus:ring-blue-900"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 flex items-center space-x-3 text-emerald-900">
                  <span className="material-symbols-outlined text-emerald-600 text-xl shrink-0">check_circle</span>
                  <div className="text-xs">
                    <p className="font-bold">Cadastro Completo para esta Minuta!</p>
                    <p className="text-[11px] text-emerald-700">
                      Todos os dados do cliente <strong>{selectedClient.name}</strong> solicitados na minuta estão disponíveis.
                    </p>
                  </div>
                </div>
              )}

              {/* STEP 3: EMPTY FIELD STRATEGY CONFIG */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-2xl p-4 space-y-2.5">
                <label className="block font-extrabold text-slate-800 text-xs">
                  2. Tratamento de Campos Vazios
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                    emptyStrategy === 'placeholder'
                      ? 'bg-white border-blue-900 text-blue-950 font-bold shadow-2xs'
                      : 'bg-white/60 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="emptyStrategy"
                      checked={emptyStrategy === 'placeholder'}
                      onChange={() => setEmptyStrategy('placeholder')}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <div>
                      <p className="font-bold">Substituir por Texto Padrão</p>
                      <p className="text-[10px] text-slate-500 font-normal">Ex: {customPlaceholder}</p>
                    </div>
                  </label>

                  <label className={`p-3 rounded-xl border flex items-center space-x-2.5 cursor-pointer transition-all ${
                    emptyStrategy === 'omit'
                      ? 'bg-white border-blue-900 text-blue-950 font-bold shadow-2xs'
                      : 'bg-white/60 border-slate-200 text-slate-700'
                  }`}>
                    <input
                      type="radio"
                      name="emptyStrategy"
                      checked={emptyStrategy === 'omit'}
                      onChange={() => setEmptyStrategy('omit')}
                      className="text-blue-900 focus:ring-blue-900"
                    />
                    <div>
                      <p className="font-bold">Omitir Variável por Completo</p>
                      <p className="text-[10px] text-slate-500 font-normal">Remove a tag sem deixar lacunas</p>
                    </div>
                  </label>
                </div>

                {emptyStrategy === 'placeholder' && (
                  <div className="pt-1 flex items-center space-x-2">
                    <span className="text-[11px] font-bold text-slate-600 shrink-0">Texto Padrão:</span>
                    <input
                      type="text"
                      value={customPlaceholder}
                      onChange={(e) => setCustomPlaceholder(e.target.value)}
                      className="px-2.5 py-1 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900"
                    />
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Actions */}
        <div className="pt-4 mt-3 border-t border-slate-100 flex gap-3 justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={!selectedClient}
            onClick={handleProceedToGenerate}
            className="glass-btn-primary px-5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-2 shadow-xs disabled:opacity-50 disabled:pointer-events-none"
          >
            <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
            <span>Gerar Documento Preenchido</span>
          </button>
        </div>
      </div>
    </div>
  );
};
