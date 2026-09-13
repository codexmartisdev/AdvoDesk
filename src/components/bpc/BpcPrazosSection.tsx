import React from 'react';
import { BpcCaseItem } from '../../types/bpc';

interface BpcPrazosSectionProps {
  cases: BpcCaseItem[];
}

export const BpcPrazosSection: React.FC<BpcPrazosSectionProps> = ({ cases }) => {
  const mappedDates = cases.flatMap((item) => {
    const entries: { caseId: string; clientName: string; label: string; date: string }[] = [];

    if (item.periciaDate) {
      entries.push({
        caseId: item.id,
        clientName: item.clientName,
        label: 'Perícia Médica',
        date: item.periciaDate,
      });
    }

    if (item.avaliacaoSocialDate) {
      entries.push({
        caseId: item.id,
        clientName: item.clientName,
        label: 'Avaliação Social',
        date: item.avaliacaoSocialDate,
      });
    }

    if (item.exigenciaDeadline) {
      entries.push({
        caseId: item.id,
        clientName: item.clientName,
        label: 'Prazo de Exigência',
        date: item.exigenciaDeadline,
      });
    }

    return entries;
  });

  return (
    <div className="space-y-4">
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">calendar_clock</span>
            <span>Prazos e Agendamentos do BPC</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Datas registradas de perícias médicas, avaliações sociais e cumprimento de exigências
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
              Conforme cadastro
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Datas de perícia exibidas somente quando registradas no respectivo caso BPC.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-emerald-600 text-base">groups</span>
              <span>Avaliação Social</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800">
              Conforme cadastro
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            Agendamentos sociais exibidos somente quando houver data informada no caso.
          </p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-red-600 text-base">priority_high</span>
              <span>Exigências</span>
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-red-50 text-red-800">
              Prazo informado
            </span>
          </div>
          <p className="text-[11px] text-slate-500 leading-relaxed">
            O sistema não presume prazo: somente datas efetivamente cadastradas são exibidas.
          </p>
        </div>
      </div>

      {/* Lista de datas efetivamente cadastradas */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5">
        <h4 className="text-xs font-bold text-slate-900 mb-3 flex items-center gap-2">
          <span className="material-symbols-outlined text-slate-500 text-sm">list_alt</span>
          <span>Datas Registradas</span>
        </h4>

        {mappedDates.length === 0 ? (
          <div className="p-8 text-center bg-slate-50 rounded-xl border border-slate-200/80">
            <span className="material-symbols-outlined text-slate-400 text-2xl mb-1">event_available</span>
            <p className="text-xs font-bold text-slate-700">Nenhuma data registrada</p>
            <p className="text-[11px] text-slate-500 mt-1 max-w-sm mx-auto">
              Perícias, avaliações e exigências aparecerão aqui somente depois que suas datas forem informadas nos casos BPC.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {mappedDates.map((entry) => (
              <div
                key={`${entry.caseId}-${entry.label}-${entry.date}`}
                className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs"
              >
                <div>
                  <span className="font-bold text-slate-800">{entry.clientName}</span>
                  <span className="text-slate-500 ml-2 text-[11px]">{entry.label}</span>
                </div>
                <span className="font-semibold text-slate-700">{entry.date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
