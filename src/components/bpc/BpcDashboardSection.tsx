import React from 'react';
import {
  BpcAvaliacaoItem,
  BpcCaseItem,
  BpcDeadlineItem,
  BpcPendenciaItem,
  BpcSubTab,
} from '../../types/bpc';
import { BPC_WORKFLOW_STEPS } from './bpcConstants';

interface BpcDashboardSectionProps {
  cases: BpcCaseItem[];
  pendencias: BpcPendenciaItem[];
  deadlines: BpcDeadlineItem[];
  avaliacoes: BpcAvaliacaoItem[];
  onNavigateSubTab: (tab: BpcSubTab) => void;
  onOpenNewCase: () => void;
}

export const BpcDashboardSection: React.FC<BpcDashboardSectionProps> = ({
  cases,
  pendencias,
  deadlines,
  avaliacoes,
  onNavigateSubTab,
  onOpenNewCase,
}) => {
  const idosoCount = cases.filter((c) => c.modality === 'idoso').length;
  const pcdCount = cases.filter((c) => c.modality === 'pcd').length;
  const activeCaseIds = new Set(cases.map((item) => item.id));

  const openPendencias = pendencias.filter(
    (item) => activeCaseIds.has(item.caseId) && !item.resolved
  );
  const pendingDeadlines = deadlines.filter(
    (item) => activeCaseIds.has(item.caseId) && item.status === 'Pendente'
  );
  const scheduledAvaliacoes = avaliacoes.filter(
    (item) => activeCaseIds.has(item.caseId) && item.status === 'Agendada'
  );

  const attentionCaseIds = new Set([
    ...openPendencias.map((item) => item.caseId),
    ...pendingDeadlines.map((item) => item.caseId),
    ...scheduledAvaliacoes.map((item) => item.caseId),
  ]);

  const quickNavCards: {
    tab: BpcSubTab;
    title: string;
    description: string;
    icon: string;
    badge?: string;
  }[] = [
    {
      tab: 'cases',
      title: 'Casos BPC',
      description: 'Gestão dos requerimentos ativos de Idoso e Pessoa com Deficiência.',
      icon: 'folder_open',
      badge: `${cases.length} casos`,
    },
    {
      tab: 'new-case',
      title: 'Novo Caso BPC',
      description: 'Abertura de requerimento vinculado a cliente já cadastrado.',
      icon: 'person_add',
      badge: 'Início',
    },
    {
      tab: 'pendencias',
      title: 'Pendências & Exigências',
      description: 'Pendências reais cadastradas e ainda não resolvidas.',
      icon: 'warning',
      badge: openPendencias.length > 0 ? `${openPendencias.length} abertas` : 'Sem abertas',
    },
    {
      tab: 'prazos',
      title: 'Prazos & Agendamentos',
      description: 'Prazos reais cadastrados e ainda pendentes.',
      icon: 'event',
      badge: pendingDeadlines.length > 0 ? `${pendingDeadlines.length} pendentes` : 'Sem pendentes',
    },
    {
      tab: 'avaliacoes',
      title: 'Avaliações Médica & Social',
      description: 'Perícias médicas e avaliações sociais registradas para casos BPC PCD.',
      icon: 'medical_services',
      badge: scheduledAvaliacoes.length > 0 ? `${scheduledAvaliacoes.length} agendadas` : undefined,
    },
    {
      tab: 'auditorias',
      title: 'Histórico & Auditoria',
      description: 'Trilha cronológica das movimentações persistidas no módulo BPC.',
      icon: 'history',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Total de Casos BPC</span>
            <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
              <span className="material-symbols-outlined text-base">accessibility_new</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{cases.length}</span>
            <span className="text-[11px] text-slate-500 block mt-0.5">Casos ativos persistidos</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">BPC Idoso (65+)</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200/60 flex items-center justify-center text-amber-700">
              <span className="material-symbols-outlined text-base">elderly</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{idosoCount}</span>
            <span className="text-[11px] text-amber-700 font-medium block mt-0.5">Modalidade informada</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">BPC PCD</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200/60 flex items-center justify-center text-blue-700">
              <span className="material-symbols-outlined text-base">accessible_forward</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{pcdCount}</span>
            <span className="text-[11px] text-blue-700 font-medium block mt-0.5">Modalidade informada</span>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Casos com Atenção</span>
            <div className="w-8 h-8 rounded-xl bg-red-50 border border-red-200/60 flex items-center justify-center text-red-600">
              <span className="material-symbols-outlined text-base">schedule</span>
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900">{attentionCaseIds.size}</span>
            <span className="text-[11px] text-red-600 font-medium block mt-0.5">Pendência, prazo ou avaliação agendada</span>
          </div>
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span className="material-symbols-outlined text-[#C9A227] text-base">dashboard_customize</span>
            <span>Módulos de Trabalho do BPC LOAS</span>
          </h2>
          <span className="text-[11px] text-slate-500 font-medium">Acesso rápido aos fluxos</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {quickNavCards.map((card) => (
            <button
              key={card.tab}
              onClick={() => onNavigateSubTab(card.tab)}
              className="bg-white p-4 rounded-2xl border border-slate-200/90 hover:border-[#C9A227]/70 hover:shadow-md transition-all text-left group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-[#0D0D0D] group-hover:text-[#C9A227] text-slate-700 flex items-center justify-center transition-colors">
                    <span className="material-symbols-outlined text-lg">{card.icon}</span>
                  </div>
                  {card.badge && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {card.badge}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-slate-900 text-xs group-hover:text-blue-900 transition-colors">
                  {card.title}
                </h3>
                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                  {card.description}
                </p>
              </div>

              <div className="mt-4 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-bold text-slate-600 group-hover:text-[#0D0D0D]">
                <span>Acessar área</span>
                <span className="material-symbols-outlined text-sm group-hover:translate-x-0.5 transition-transform">
                  arrow_forward
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
          <div>
            <h3 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[#C9A227] text-base">route</span>
              <span>Workflow & Fases do Requerimento BPC/LOAS</span>
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Estrutura modular arquitetada para expansão progressiva das etapas jurídicas e administrativas
            </p>
          </div>
          <button
            onClick={onOpenNewCase}
            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs"
          >
            <span className="material-symbols-outlined text-sm text-[#C9A227]">add</span>
            <span>Iniciar Requerimento</span>
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2 pt-1">
          {BPC_WORKFLOW_STEPS.slice(0, 12).map((step, idx) => (
            <div
              key={step.id}
              className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-start gap-2 hover:bg-slate-100/80 transition-colors"
              title={step.description}
            >
              <div className="w-6 h-6 rounded-lg bg-white border border-slate-200 flex items-center justify-center shrink-0 text-slate-600 mt-0.5">
                <span className="material-symbols-outlined text-[13px]">{step.icon}</span>
              </div>
              <div className="min-w-0">
                <span className="text-[9px] font-bold text-slate-400 block uppercase tracking-wider">
                  Etapa {idx + 1}
                </span>
                <span className="text-[11px] font-bold text-slate-800 truncate block">
                  {step.label}
                </span>
              </div>
            </div>
          ))}
        </div>

        <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500 bg-slate-50/60 p-3 rounded-xl border border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-amber-600 text-sm">info</span>
            <span>
              As etapas do fluxo estão mapeadas como referência estrutural e serão ativadas progressivamente.
            </span>
          </div>
          <button
            onClick={() => onNavigateSubTab('cases')}
            className="font-bold text-slate-800 hover:underline flex items-center gap-1"
          >
            <span>Ver Casos</span>
            <span className="material-symbols-outlined text-xs">arrow_forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
