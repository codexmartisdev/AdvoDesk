import React from 'react';
import { BpcCaseItem } from '../../types/bpc';

interface BpcPendenciasSectionProps {
  cases: BpcCaseItem[];
  onOpenNewCase: () => void;
}

export const BpcPendenciasSection: React.FC<BpcPendenciasSectionProps> = ({
  cases,
  onOpenNewCase,
}) => {
  // Casos com algum tipo de alerta ou pendência comum de BPC
  const casesWithIssues = cases.filter(
    (c) => c.cadUnicoStatus !== 'Atualizado' || c.status.includes('Exigência') || c.status.includes('Pendente') || !c.nisNumber
  );

  return (
    <div className="space-y-4">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-base">warning</span>
            <span>Controle de Pendências e Exigências BPC</span>
          </h3>
          <p className="text-slate-500 text-xs mt-0.5">
            Monitoramento de CadÚnico, biometria obrigatória, documentos faltantes e cartas de exigência do INSS
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1.5 rounded-xl bg-amber-50 text-amber-800 border border-amber-200">
            {casesWithIssues.length} casos com atenção
          </span>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {casesWithIssues.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto text-emerald-600 mb-3">
              <span className="material-symbols-outlined text-2xl">verified</span>
            </div>
            <h4 className="font-bold text-slate-900 text-sm">Nenhuma pendência crítica</h4>
            <p className="text-slate-500 text-xs mt-1 max-w-md mx-auto">
              Todos os requerimentos BPC cadastrados estão com dados atualizados e sem cartas de exigência pendentes.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {casesWithIssues.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0 mt-0.5">
                    <span className="material-symbols-outlined text-base">assignment_late</span>
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 text-xs">{item.clientName}</span>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-0.5">
                      <span>CPF: {item.clientCpf}</span>
                      <span>•</span>
                      <span className="font-semibold text-slate-700">{item.modality === 'idoso' ? 'BPC Idoso' : 'BPC PCD'}</span>
                    </div>

                    {/* Tags de pendência */}
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {item.cadUnicoStatus !== 'Atualizado' && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">badge</span>
                          <span>CadÚnico: {item.cadUnicoStatus || 'Verificação Necessária'}</span>
                        </span>
                      )}
                      {!item.nisNumber && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                          NIS não informado
                        </span>
                      )}
                      {item.status.includes('Exigência') && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-50 text-red-700 border border-red-200">
                          Cumprimento de Exigência (Prazo 30 dias)
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                  <span className="text-[11px] font-medium text-slate-500">
                    Etapa: <strong className="text-slate-800">{item.status}</strong>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
