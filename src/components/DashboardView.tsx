import React from 'react';
import { ScheduledEvent, Client, DocumentTemplate, NavigationTab } from '../types';

interface DashboardViewProps {
  events: ScheduledEvent[];
  clients: Client[];
  templates: DocumentTemplate[];
  onNavigateToTab: (tab: NavigationTab) => void;
  onOpenNewClientModal: () => void;
  onOpenDocModal: () => void;
  onSelectClientForDoc?: (client: Client) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  clients,
  templates,
  onNavigateToTab,
  onOpenNewClientModal,
  onOpenDocModal,
  onSelectClientForDoc,
}) => {
  // Calculated dynamic metrics
  const pendingEvents = events.filter(e => e.status === 'Pendente');
  const urgentEvents = events.filter(e => e.status === 'Pendente' && (e.priorityLevel === 'urgente' || e.badgeColor === 'recurso' || e.badgeColor === 'pericia'));
  
  const recentClients = [...clients].slice(0, 5);
  const upcomingEvents = [...events].filter(e => e.status === 'Pendente').slice(0, 5);

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 flex flex-col space-y-6 md:space-y-8 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
            Painel Principal
          </h1>
          <p className="text-slate-600 text-sm mt-1">
            Visão geral de clientes cadastrados, modelos de minutas, prazos e compromissos do escritório.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button 
            onClick={onOpenNewClientModal}
            className="glass-btn-primary px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-white font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-sm transition-all"
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
        {/* Summary Card 1: Clientes Cadastrados */}
        <div 
          onClick={() => onNavigateToTab('clients')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group gold-accent-edge"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/50 flex items-center justify-center shrink-0 group-hover:border-[#C9A227] transition-colors">
              <span className="material-symbols-outlined text-[#C9A227] text-[26px]">groups</span>
            </div>
            <span className="px-3 py-1 bg-[#0D0D0D] text-white border border-[#C9A227]/60 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[#C9A227] text-[14px]">person</span> Ativos
            </span>
          </div>
          <div className="mt-6">
            <p className="text-slate-500 font-medium text-xs mb-1">Clientes Registrados</p>
            <div className="flex items-baseline justify-between">
              <p className="font-display-lg text-3xl text-[#0D0D0D] font-extrabold">{clients.length}</p>
              <span className="text-xs text-[#0D0D0D] font-bold group-hover:text-[#8c6e14] group-hover:underline flex items-center gap-0.5">
                Ver todos <span className="material-symbols-outlined text-xs text-[#C9A227]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 2: Prazos Próximos */}
        <div 
          onClick={() => onNavigateToTab('calendar')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group gold-accent-edge"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-[#C9A227]/40 flex items-center justify-center shrink-0 group-hover:border-[#C9A227] transition-colors">
              <span className="material-symbols-outlined text-[#8c6e14] text-[26px]">alarm</span>
            </div>
            {urgentEvents.length > 0 ? (
              <span className="px-3 py-1 bg-amber-500/15 border border-[#C9A227] rounded-full text-xs text-[#8c6e14] font-bold flex items-center gap-1 animate-pulse">
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
              <p className="font-display-lg text-3xl text-[#0D0D0D] font-extrabold">{pendingEvents.length}</p>
              <span className="text-xs text-[#0D0D0D] font-bold group-hover:text-[#8c6e14] group-hover:underline flex items-center gap-0.5">
                Ver agenda <span className="material-symbols-outlined text-xs text-[#C9A227]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Summary Card 3: Modelos de Minutas */}
        <div 
          onClick={() => onNavigateToTab('documents')}
          className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md transition-all cursor-pointer bg-white group gold-accent-edge"
        >
          <div className="flex items-start justify-between">
            <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/50 flex items-center justify-center shrink-0 group-hover:border-[#C9A227] transition-colors">
              <span className="material-symbols-outlined text-[#C9A227] text-[26px]">description</span>
            </div>
            <span className="px-3 py-1 bg-[#0D0D0D] text-white border border-[#C9A227]/60 rounded-full text-xs font-bold flex items-center gap-1 shadow-xs">
              <span className="material-symbols-outlined text-[#C9A227] text-[14px]">auto_stories</span> Modelos
            </span>
          </div>
          <div className="mt-6">
            <p className="text-slate-500 font-medium text-xs mb-1">Modelos & Minutas Prontas</p>
            <div className="flex items-baseline justify-between">
              <p className="font-display-lg text-3xl text-[#0D0D0D] font-extrabold">{templates.length}</p>
              <span className="text-xs text-[#0D0D0D] font-bold group-hover:text-[#8c6e14] group-hover:underline flex items-center gap-0.5">
                Ver modelos <span className="material-symbols-outlined text-xs text-[#C9A227]">arrow_forward</span>
              </span>
            </div>
          </div>
        </div>

        {/* Main Activity Area - Recent Clients */}
        <div className="glass-panel rounded-2xl col-span-1 md:col-span-8 p-0 flex flex-col border border-slate-200/90 shadow-sm bg-white overflow-hidden min-h-[380px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div>
              <h2 className="font-title-md text-base font-bold text-slate-900">Clientes Recentes & Atendimentos</h2>
              <p className="text-xs text-slate-500 mt-0.5">Acesso rápido aos dados e emissão de procurações e petições.</p>
            </div>
            <button 
              onClick={() => onNavigateToTab('clients')}
              className="text-blue-900 hover:text-blue-950 font-semibold text-xs flex items-center gap-1 transition-colors"
            >
              <span>Ver Todos ({clients.length})</span>
              <span className="material-symbols-outlined text-sm">arrow_forward</span>
            </button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-10 space-y-3">
                <span className="material-symbols-outlined text-slate-300 text-4xl">person_off</span>
                <p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</p>
                <button
                  onClick={onOpenNewClientModal}
                  className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-xl"
                >
                  Cadastrar Primeiro Cliente
                </button>
              </div>
            ) : (
              recentClients.map((client) => (
                <div 
                  key={client.id}
                  className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200/80 group"
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-900 font-bold text-sm shrink-0">
                      <span className="material-symbols-outlined text-lg">person</span>
                    </div>
                    <div>
                      <h3 className="font-title-md text-sm font-bold text-slate-900">
                        {client.name}
                      </h3>
                      <p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5">
                        <span className="font-medium text-slate-700">CPF: {client.cpf || 'Não informado'}</span>
                        <span>•</span>
                        <span>{client.city || 'Sem cidade'} {client.state ? `/${client.state}` : ''}</span>
                        {client.category && (
                          <>
                            <span>•</span>
                            <span className="text-blue-800 font-semibold">{client.category}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2 self-end sm:self-center">
                    {onSelectClientForDoc && (
                      <button
                        onClick={() => onSelectClientForDoc(client)}
                        className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors"
                        title="Gerar Minuta para este Cliente"
                      >
                        <span className="material-symbols-outlined text-sm">description</span>
                        <span>Gerar Minuta</span>
                      </button>
                    )}
                    <button
                      onClick={() => onNavigateToTab('clients')}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors"
                      title="Ver na aba Clientes"
                    >
                      <span className="material-symbols-outlined text-sm">open_in_new</span>
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-2 font-medium">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Base de Clientes & Documentos Sincronizada
              </span>
              <span className="text-slate-500">{clients.length} clientes ativos</span>
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
