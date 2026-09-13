import React from 'react';
import { BpcCaseItem } from '../../types/bpc';

interface BpcAvaliacoesSectionProps {
  cases: BpcCaseItem[];
}

export const BpcAvaliacoesSection: React.FC<BpcAvaliacoesSectionProps> = ({ cases }) => {
  const pcdCases = cases.filter((c) => c.modality === 'pcd');

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-base">psychology</span>
          <span>Avaliações da Pessoa com Deficiência (Critério Biopsicossocial)</span>
        </h3>
        <p className="text-slate-500 text-xs mt-0.5">
          Centralização das diretrizes e prontuários para a Perícia Médica e Avaliação Social no âmbito do BPC/LOAS
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center border border-blue-200/60">
              <span className="material-symbols-outlined text-lg">medical_information</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">1. Avaliação Médica Pericial</h4>
              <p className="text-[11px] text-slate-500">Constatação de impedimento de longo prazo (&gt; 2 anos)</p>
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Laudo médico circunstanciado com CID-10 e data de início do impedimento</span></li>
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Exames complementares, audiometrias, laudos neurológicos ou psiquiátricos</span></li>
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Receituários contínuos e prontuário de atendimento da rede pública/SUS</span></li>
          </ul>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200/60">
              <span className="material-symbols-outlined text-lg">diversity_3</span>
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs">2. Avaliação Social do INSS</h4>
              <p className="text-[11px] text-slate-500">Análise de barreiras e fatores ambientais (CIF)</p>
            </div>
          </div>
          <ul className="text-xs text-slate-600 space-y-2">
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Comprovação de acessibilidade, dependência de terceiros para atos da vida civil</span></li>
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Barreiras atitudinais, urbanísticas, de transporte e comunicação</span></li>
            <li className="flex items-start gap-2"><span className="material-symbols-outlined text-emerald-600 text-sm mt-0.5">check</span><span>Gastos elevados com fraldas, medicamentos não fornecidos pelo SUS e alimentação especial</span></li>
          </ul>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-blue-600 text-sm">accessible</span>
          <span>Casos BPC PCD Cadastrados ({pcdCases.length})</span>
        </h4>
        {pcdCases.length === 0 ? (
          <p className="text-xs text-slate-500 py-3 text-center">Nenhum caso BPC de Pessoa com Deficiência cadastrado no momento.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {pcdCases.map((c) => (
              <div key={c.id} className="py-2.5 flex items-center justify-between text-xs">
                <div>
                  <span className="font-bold text-slate-800">{c.clientName}</span>
                  <span className="text-slate-500 ml-2 text-[11px]">(CID: {c.cidPrincipal || 'Não informado'})</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700">{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
