import React from 'react';
import { LegalCase, ScheduledEvent, Client, DocumentTemplate, NavigationTab } from '../types';

interface DashboardViewProps {
  cases: LegalCase[];
  events: ScheduledEvent[];
  clients: Client[];
  templates: DocumentTemplate[];
  onNavigateToTab: (tab: NavigationTab) => void;
  onSelectCase: (caseId: string) => void;
  onOpenNewCaseModal: () => void;
  onOpenNewClientModal: () => void;
  onOpenDocModal: () => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  cases,
  events,
  clients,
  templates,
  onNavigateToTab,
  onSelectCase,
  onOpenNewCaseModal,
  onOpenNewClientModal,
  onOpenDocModal,
}) => {
  // Calculated dynamic metrics
  const activeCases = cases.filter(c => c.statusLabel !== 'Encerrado' && c.statusLabel !== 'Arquivado');
  const activeCasesCount = activeCases.length > 0 ? activeCases.length : cases.length;

  const pendingEvents = events.filter(e => e.status === 'Pendente');
  const urgentEvents = events.filter(e => e.status === 'Pendente' && (e.priorityLevel === 'urgente' || e.badgeColor === 'recurso' || e.badgeColor === 'pericia'));
  
  const recentCases = [...cases].slice(0, 5);
  const upcomingEvents = [...events].filter(e => e.status === 'Pendente').slice(0, 5);

  return (
    <main className="md:ml-64 pt-24 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 flex flex-col space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel Principal
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Visão geral dos processos ativos, prazos fatais, clientes e movimentações recentes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={onOpenNewCaseModal}
            className="glass-btn-primary px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-white font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-sm transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Processo</span>
          </button>

          <button 
            onClick={onOpenNewClientModal}
            className="bg-slate-100 hover:bg-slate-200/80 border border-slate-300 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-slate-800 font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            <span>Novo Cliente</span>
          </button>

          <button 
            onClick={onOpenDocModal}
            className="bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-slate-800 font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-xs transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">description</span>
            <span>Gerar Minuta</span>
          </button>
        </div>
      </div>

      {/* Bento Grid Layout - Dynamic Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Summary Card 1: Processos Ativos */}
        <div 
          onClick={() => onNavigateToTab('cases')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center shrink-0 group-hover:bg-blue-100 transition-colors">
              <span className="material-symbols-outlined text-blue-900 text-[26px]">gavel</span>
            </div>
            <span className="px-3 py-1 bg-blue-50 border border-blue-200 rounded-full text-xs text-blue-900 font-bold flex items-center gap-1">
              <span className="material-symbols-outlined text-[14px]">folder_managed</span> Ativos
            </span>
          </div>
          <div className="mt-6">
            <p className="text-slate-500 font-medium text-xs mb-1">Processos em Andamento</p>
            <div className="flex items-baseline justify-between">
              <p className="font-display-lg text-3xl text-slate-900 font-extrabold">{activeCasesCount}</p>
              <span className="text-xs text-blue-900 font-semibold group-hover:underline flex items-center gap-0.5">
                Ver lista <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 2: Prazos Próximos */}
        <div 
          onClick={() => onNavigateToTab('calendar')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center shrink-0 group-hover:bg-amber-100 transition-colors">
              <span className="material-symbols-outlined text-amber-700 text-[26px]">alarm</span>
            </div>
            {urgentEvents.length > 0 ? (
              <span className="px-3 py-1 bg-amber-50 border border-amber-200 rounded-full text-xs text-amber-800 font-bold flex items-center gap-1 animate-pulse">
                <span className="material-symbols-outlined text-[14px]">warning</span> {urgentEvents.length} Urgentes
              </span>
            ) : (
              <span className="px-3 py-1 bg-emerald-50 border border-emerald-200 rounded-full text-xs text-emerald-800 font-bold">
                Em dia
              </span>
            )}
          </div>
          <div className="mt-6">
            <p className="text-slate-500 font-medium text-xs mb-1">Prazos e Compromissos Pendentes</p>
            <div className="flex items-baseline justify-between">
              <p className="font-display-lg text-3xl text-slate-900 font-extrabold">{pendingEvents.length}</p>
              <span className="text-xs text-amber-800 font-semibold group-hover:underline flex items-center gap-0.5">
                Ver agenda <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 3: Clientes & Minutas */}
        <div 
          onClick={() => onNavigateToTab('clients')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md hover:border-slate-300 transition-all cursor-pointer bg-white group"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center shrink-0 group-hover:bg-indigo-100 transition-colors">
              <span className="material-symbols-outlined text-indigo-800 text-[26px]">groups</span>
            </div>
            <span className="px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs text-indigo-700 font-semibold">
              {templates.length} Modelos de Minutas
            </span>
          </div>
          <div className="mt-6">
            <p className="text-slate-500 font-medium text-xs mb-1">Clientes Cadastrados</p>
            <div className="flex items-baseline justify-between">
              <p className="font-display-lg text-3xl text-slate-900 font-extrabold">{clients.length}</p>
              <span className="text-xs text-indigo-800 font-semibold group-hover:underline flex items-center gap-0.5">
                Ver clientes <span className="material-symbols-outlined text-xs">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Activity Area - Recent Cases */}
        <div className="glass-panel rounded-2xl col-span-1 md:col-span-8 p-0 flex flex-col border border-slate-200/90 shadow-sm bg-white overflow-hidden min-h-[380px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-title-md text-base font-bold text-slate-900">Processos e Movimentações Recentes</h2>
              <p className="text-xs text-slate-500 mt-0.5">Clique para abrir detalhes diretamente na aba Processos</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('cases')}
              className="text-blue-900 hover:text-blue-950 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <span>Ver Todos ({cases.length})</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            {recentCases.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <span className="material-symbols-outlined text-slate-300 text-4xl">folder_off</span>
                <p className="text-slate-500 text-sm">Nenhum processo cadastrado ainda.</p>
                <button
                  onClick={onOpenNewCaseModal}
                  className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-xl"
                >
                  Cadastrar Primeiro Processo
                </button>
              </div>
            ) : (
              recentCases.map((c) => (
                <div 
                  key={c.id}
                  onClick={() => { onNavigateToTab('cases'); onSelectCase(c.id); }}
                  className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 transition-all cursor-pointer border border-slate-200/80 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-900 font-bold text-sm shrink-0">
                      <span className="material-symbols-outlined text-lg">folder</span>
                    </div>
                    <div>
                      <h3 className="font-title-md text-sm font-bold text-slate-900 group-hover:text-blue-900 transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700">{c.caseNumber}</span>
                        <span>•</span>
                        <span>Cliente: <strong>{c.clientName}</strong></span>
                        {c.benefitType && (
                          <>
                            <span>•</span>
                            <span className="text-blue-800 font-semibold">{c.benefitType}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 self-end sm:self-center">
                    <span className="px-3 py-1 rounded-full bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200">
                      {c.steps?.[c.currentStepIndex]?.label || c.statusLabel}
                    </span>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-slate-800 transition-colors text-sm">
                      chevron_right
                    </span>
                  </div>
                </div>
              ))
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Base de Dados Sincronizada em Tempo Real
              </span>
              <span className="text-slate-500">{cases.length} processos ativos</span>
            </div>
          </div>
        </div>

        {/* Side Widget: Key Deadlines & Calendar Events */}
        <div className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm bg-white">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <h2 className="font-title-md text-base font-bold text-slate-900">Próximos Prazos & Audiências</h2>
              <button 
                onClick={() => onNavigateToTab('calendar')}
                className="text-xs text-blue-900 font-bold hover:underline"
              >
                Ver Agenda
              </button>
            </div>

            <div className="space-y-3.5">
              {upcomingEvents.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-xs">
                  Sem prazos pendentes para os próximos dias.
                </div>
              ) : (
                upcomingEvents.map((ev) => (
                  <div 
                    key={ev.id} 
                    onClick={() => onNavigateToTab('calendar')}
                    className="flex gap-3 items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0 cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors"
                  >
                    <div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${
                      ev.badgeColor === 'recurso' || ev.priorityLevel === 'urgente'
                        ? 'bg-red-500 shadow-xs' 
                        : ev.badgeColor === 'pericia' 
                          ? 'bg-amber-500 shadow-xs' 
                          : 'bg-blue-600 shadow-xs'
                    }`} />
                    <div className="flex-1">
                      <p className="text-slate-900 font-semibold text-xs leading-snug">{ev.title}</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-slate-700">{ev.dateStr} {ev.time ? `às ${ev.time}` : ''}</span>
                        {ev.clientName && <span>| Cliente: {ev.clientName}</span>}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100">
            <button 
              onClick={() => onNavigateToTab('calendar')}
              className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-sm">calendar_month</span>
              <span>Acessar Prazos & Agenda Completa</span>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

