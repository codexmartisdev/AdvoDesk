import React, { useState } from 'react';
import { CLIENT_VARIABLES } from '../utils/documentReplacer';
import { BPC_DOCUMENT_VARIABLES } from '../utils/bpcDocumentVariables';

interface VariablesGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectVariable?: (variableKey: string) => void;
}

const ALL_VARIABLES = [...CLIENT_VARIABLES, ...BPC_DOCUMENT_VARIABLES];

export const VariablesGuideModal: React.FC<VariablesGuideModalProps> = ({
  isOpen,
  onClose,
  onSelectVariable,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('Todas');
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const categories = [
    'Todas',
    'Identificação',
    'Contato & Endereço',
    'Trabalho & Previdência',
    'Família & Outros',
    'BPC / Caso',
    'Geral & Advogado',
  ];

  const filteredVariables = ALL_VARIABLES.filter((variable) => {
    const matchesCategory = selectedCategory === 'Todas' || variable.category === selectedCategory;
    const normalizedSearch = searchTerm.toLowerCase();
    const matchesSearch =
      variable.key.toLowerCase().includes(normalizedSearch)
      || variable.label.toLowerCase().includes(normalizedSearch)
      || variable.example.toLowerCase().includes(normalizedSearch);
    return matchesCategory && matchesSearch;
  });

  const handleCopyVariable = (key: string) => {
    navigator.clipboard.writeText(key);
    setCopiedKey(key);
    onSelectVariable?.(key);
    window.setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white w-full max-w-3xl rounded-3xl p-5 md:p-8 border border-slate-200 shadow-2xl relative my-auto animate-in fade-in zoom-in-95 max-h-[92vh] flex flex-col">
        <button onClick={onClose} className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100 transition-colors">
          <span className="material-symbols-outlined">close</span>
        </button>

        <div className="flex items-center space-x-3 mb-5 shrink-0 border-b border-slate-100 pb-4">
          <div className="w-11 h-11 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-900 shrink-0">
            <span className="material-symbols-outlined text-2xl">code_blocks</span>
          </div>
          <div>
            <h2 className="font-title-md text-lg font-black text-slate-900">Variáveis Disponíveis para Minutas e Documentos</h2>
            <p className="text-xs text-slate-500 font-medium">
              Dados do cliente, caso BPC e escritório podem ser reutilizados automaticamente. Clique para copiar uma variável.
            </p>
          </div>
        </div>

        <div className="space-y-3 mb-4 shrink-0">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-[18px]">search</span>
            <input
              type="text"
              placeholder="Buscar variável (ex: {CLIENTE_CPF}, {BPC_DER}, OAB, endereço)..."
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900/20"
            />
          </div>

          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${selectedCategory === category ? 'bg-blue-900 text-white shadow-2xs' : 'bg-slate-100 hover:bg-slate-200/80 text-slate-700'}`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-y-auto pr-1 space-y-2.5 flex-1 max-h-[52vh]">
          {filteredVariables.map((variable) => {
            const isCopied = copiedKey === variable.key;
            return (
              <div
                key={variable.key}
                onClick={() => handleCopyVariable(variable.key)}
                className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 hover:bg-blue-50/60 hover:border-blue-200 transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-2"
              >
                <div className="min-w-0 flex-1 space-y-1">
                  <div className="flex items-center space-x-2">
                    <code className="px-2.5 py-1 rounded-lg bg-blue-100/80 text-blue-950 font-mono font-extrabold text-xs border border-blue-200 group-hover:bg-blue-900 group-hover:text-white transition-colors">
                      {variable.key}
                    </code>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-200/70 text-slate-700">{variable.category}</span>
                  </div>
                  <p className="font-bold text-xs text-slate-900">{variable.label}</p>
                  <p className="text-[11px] text-slate-500 truncate"><strong>Exemplo:</strong> {variable.example}</p>
                </div>

                <button type="button" className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center justify-center gap-1 shrink-0 transition-all ${isCopied ? 'bg-emerald-600 text-white shadow-2xs' : 'bg-white border border-slate-300 text-slate-800 hover:bg-slate-100'}`}>
                  <span className="material-symbols-outlined text-[16px]">{isCopied ? 'check' : 'content_copy'}</span>
                  <span>{isCopied ? 'Copiado!' : 'Copiar'}</span>
                </button>
              </div>
            );
          })}

          {filteredVariables.length === 0 && (
            <div className="p-8 text-center text-slate-500"><p className="font-bold">Nenhuma variável encontrada com este filtro.</p></div>
          )}
        </div>

        <div className="pt-4 mt-3 border-t border-slate-100 flex justify-end shrink-0">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 text-slate-800 font-bold text-xs rounded-xl hover:bg-slate-200/80">Fechar</button>
        </div>
      </div>
    </div>
  );
};
