import React from 'react';
import { BpcCaseItem } from '../../types/bpc';

interface BpcPrazosSectionProps {
  cases: BpcCaseItem[];
}

export const BpcPrazosSection: React.FC<BpcPrazosSectionProps> = ({ cases }) => {
  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">calendar_clock</span>
            <span>Prazos e Agendamentos do BPC</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Cronograma de perícias médicas, avaliações sociais, cumprimento de exigências e prazos recursais
          </p>
        </div>
      </div>

      {/* Grid de categorias de prazos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-blue-600 text-base">stethoscope</span>
              <span>Perícias Médicas</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-800">
              Presencial
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Acompanhamento das datas de perícia presencial na APS para constatação do impedimento de longo prazo.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-base">groups</span>
              <span>Avaliação Social</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
              Serviço Social
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Agendamentos com o assistente social do INSS para aplicação do questionário de barreiras e vulnerabilidade.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-base">priority_high</span>
              <span>Exigências & Recursos</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-800">
              30 dias
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Prazos decadenciais para anexar documentos solicitados pelo servidor ou recorrer ao CRPS.
          </p>
        </div>
      </div>

      {/* Lista de Casos com Prazos Próximos */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500 text-sm">list_alt</span>
          <span>Próximos Compromissos Mapeados</span>
        </h4>

        <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
          <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">event_available</span>
          <p className="text-xs font-bold text-slate-700">Prazos sincronizados com a agenda geral</p>
          <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
            Quando você registrar datas de perícia médica ou exigências nos casos BPC, os alertas automáticos aparecerão nesta seção.
          </p>
        </div>
      </div>
    </div>
  );
};
