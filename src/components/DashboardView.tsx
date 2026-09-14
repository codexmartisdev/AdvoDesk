import React, { useMemo } from 'react';
import { ScheduledEvent, Client, DocumentTemplate, NavigationTab, LegalCase } from '../types';
import { getDaysRemaining } from '../utils/dateUtils';
import { getOperationalAgendaMetrics, isOpenAgendaEvent, sortOperationalEvents } from '../utils/agendaMetrics';

interface DashboardViewProps {
  events: ScheduledEvent[];
  clients: Client[];
  cases?: LegalCase[];
  templates: DocumentTemplate[];
  onNavigateToTab: (tab: NavigationTab) => void;
  onOpenNewClientModal: () => void;
  onOpenDocModal: () => void;
  onSelectClientForDoc?: (client: Client) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  clients,
  cases = [],
  templates,
  onNavigateToTab,
  onOpenNewClientModal,
  onOpenDocModal,
  onSelectClientForDoc,
}) => {
  const metrics = useMemo(() => getOperationalAgendaMetrics(events, cases), [events, cases]);
  const activeClients = useMemo(() => clients.filter((client) => String(client.status) !== 'Arquivado'), [clients]);
  const recentClients = useMemo(() => [...activeClients].slice(0, 5), [activeClients]);
  const upcomingEvents = useMemo(
    () => sortOperationalEvents(events.filter((event) => isOpenAgendaEvent(event.status) && getDaysRemaining(event.fullDate) >= 0)).slice(0, 5),
    [events]
  );

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 flex flex-col space-y-6 md:space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200/60">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Painel Principal</h1>
          <p className="text-slate-600 text-sm mt-1">Visão operacional de clientes, casos, documentos e compromissos do escritório.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
          <button onClick={onOpenNewClientModal} className="glass-btn-primary px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-white font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-sm transition-all"><span className="material-symbols-outlined text-[18px]">person_add</span><span>Novo Cliente</span></button>
          <button onClick={onOpenDocModal} className="bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2 md:px-4 md:py-2.5 rounded-xl text-slate-800 font-medium text-xs md:text-sm flex items-center space-x-1.5 shadow-xs transition-all"><span className="material-symbols-outlined text-[18px]">description</span><span>Gerar Minuta</span></button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <SummaryCard title="Clientes ativos" value={activeClients.length} icon="groups" onClick={() => onNavigateToTab('clients')} action="Ver clientes" />
        <SummaryCard title="Compromissos em aberto" value={metrics.open} icon="alarm" onClick={() => onNavigateToTab('calendar')} action="Ver agenda" badge={metrics.overdue > 0 ? `${metrics.overdue} vencido(s)` : 'Em dia'} warning={metrics.overdue > 0} />
        <SummaryCard title="Modelos ativos" value={templates.length} icon="description" onClick={() => onNavigateToTab('documents')} action="Ver modelos" />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div><h2 className="font-title-md text-sm font-extrabold text-slate-900">Atenção operacional</h2><p className="text-[11px] text-slate-500 mt-0.5">Indicadores derivados da mesma base de Agenda e Casos.</p></div>
          <button type="button" onClick={() => onNavigateToTab('calendar')} className="text-xs font-bold text-blue-900 hover:underline">Abrir Agenda</button>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <OperationalMetric label="Hoje" value={metrics.today} icon="today" tone="amber" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Próximos 7 dias" value={metrics.nextSevenDays} icon="date_range" tone="blue" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Vencidos" value={metrics.overdue} icon="warning" tone="red" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Audiências / perícias" value={metrics.hearingsAndExpertExams} icon="gavel" tone="purple" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Casos sem próximo passo" value={metrics.casesWithoutNextStep} icon="rule" tone="slate" onClick={() => onNavigateToTab('cases' as NavigationTab)} />
        </div>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="glass-panel rounded-2xl col-span-1 md:col-span-8 p-0 flex flex-col border border-slate-200/90 shadow-sm bg-white overflow-hidden min-h-[380px]">
          <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div><h2 className="font-title-md text-base font-bold text-slate-900">Clientes Recentes & Atendimentos</h2><p className="text-xs text-slate-500 mt-0.5">Acesso rápido à carteira e emissão de documentos.</p></div>
            <button onClick={() => onNavigateToTab('clients')} className="text-blue-900 hover:text-blue-950 font-semibold text-xs flex items-center gap-1 transition-colors"><span>Ver Todos ({activeClients.length})</span><span className="material-symbols-outlined text-sm">arrow_forward</span></button>
          </div>

          <div className="p-6 flex-1 flex flex-col justify-between space-y-3">
            {recentClients.length === 0 ? (
              <div className="text-center py-10 space-y-3"><span className="material-symbols-outlined text-slate-300 text-4xl">person_off</span><p className="text-slate-500 text-sm">Nenhum cliente cadastrado ainda.</p><button onClick={onOpenNewClientModal} className="px-4 py-2 bg-blue-900 text-white text-xs font-semibold rounded-xl">Cadastrar Primeiro Cliente</button></div>
            ) : recentClients.map((client) => (
              <div key={client.id} className="rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-slate-50 hover:bg-slate-100 transition-all border border-slate-200/80 group">
                <div className="flex items-center space-x-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-blue-100/80 border border-blue-200 flex items-center justify-center text-blue-900 font-bold text-sm shrink-0"><span className="material-symbols-outlined text-lg">person</span></div><div className="min-w-0"><h3 className="font-title-md text-sm font-bold text-slate-900 truncate">{client.name}</h3><p className="text-xs text-slate-500 flex flex-wrap items-center gap-2 mt-0.5"><span className="font-medium text-slate-700">CPF: {client.cpf || 'Não informado'}</span>{client.category && <><span>•</span><span className="text-blue-800 font-semibold">{client.category}</span></>}</p></div></div>
                <div className="flex items-center space-x-2 self-end sm:self-center">{onSelectClientForDoc && <button onClick={() => onSelectClientForDoc(client)} className="px-3 py-1.5 rounded-lg bg-white hover:bg-blue-50 text-blue-900 text-xs font-bold border border-blue-200 flex items-center gap-1 transition-colors"><span className="material-symbols-outlined text-sm">description</span><span>Gerar Minuta</span></button>}<button onClick={() => onNavigateToTab('clients')} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200 transition-colors" title="Ver na aba Clientes"><span className="material-symbols-outlined text-sm">open_in_new</span></button></div>
              </div>
            ))}
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs text-slate-600"><span className="flex items-center gap-2 font-medium"><span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>Base operacional sincronizada</span><span className="text-slate-500">{activeClients.length} clientes ativos</span></div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm bg-white">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100"><h2 className="font-title-md text-base font-bold text-slate-900">Próximos Prazos & Audiências</h2><button onClick={() => onNavigateToTab('calendar')} className="text-xs text-blue-900 font-bold hover:underline">Ver Agenda</button></div>
            <div className="space-y-3.5">
              {upcomingEvents.length === 0 ? <div className="text-center py-6 text-slate-500 text-xs">Sem compromissos futuros em aberto.</div> : upcomingEvents.map((event) => (
                <button key={event.id} type="button" onClick={() => onNavigateToTab('calendar')} className="w-full text-left flex gap-3 items-start pb-3 border-b border-slate-100 last:border-0 last:pb-0 hover:bg-slate-50 p-1.5 rounded-lg transition-colors"><div className={`w-2.5 h-2.5 rounded-full mt-1.5 shrink-0 ${event.priorityLevel === 'urgente' || event.badgeColor === 'recurso' ? 'bg-red-500' : event.badgeColor === 'pericia' ? 'bg-amber-500' : 'bg-blue-600'}`} /><div className="flex-1 min-w-0"><p className="text-slate-900 font-semibold text-xs leading-snug truncate">{event.title}</p><p className="text-slate-500 text-[11px] mt-0.5"><span className="font-bold text-slate-700">{event.dateStr} {event.time ? `às ${event.time}` : ''}</span>{event.clientName ? ` | ${event.clientName}` : ''}</p></div></button>
              ))}
            </div>
          </div>
          <div className="mt-6 pt-4 border-t border-slate-100"><button onClick={() => onNavigateToTab('calendar')} className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 transition-colors"><span className="material-symbols-outlined text-sm">calendar_month</span><span>Acessar Prazos & Agenda Completa</span></button></div>
        </div>
      </div>
    </main>
  );
};

const SummaryCard = ({ title, value, icon, onClick, action, badge, warning = false }: { title: string; value: number; icon: string; onClick: () => void; action: string; badge?: string; warning?: boolean }) => (
  <button type="button" onClick={onClick} className="glass-panel rounded-2xl col-span-1 md:col-span-4 p-6 flex flex-col justify-between border border-slate-200/90 shadow-sm hover:shadow-md transition-all text-left bg-white group gold-accent-edge">
    <div className="flex items-start justify-between"><div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/50 flex items-center justify-center shrink-0"><span className="material-symbols-outlined text-[#C9A227] text-[26px]">{icon}</span></div>{badge && <span className={`px-3 py-1 rounded-full text-xs font-bold border ${warning ? 'bg-red-50 text-red-800 border-red-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'}`}>{badge}</span>}</div>
    <div className="mt-6"><p className="text-slate-500 font-medium text-xs mb-1">{title}</p><div className="flex items-baseline justify-between"><p className="font-display-lg text-3xl text-[#0D0D0D] font-extrabold">{value}</p><span className="text-xs text-[#0D0D0D] font-bold group-hover:text-[#8c6e14] group-hover:underline flex items-center gap-0.5">{action}<span className="material-symbols-outlined text-xs text-[#C9A227]">arrow_forward</span></span></div></div>
  </button>
);

const OperationalMetric = ({ label, value, icon, tone, onClick }: { label: string; value: number; icon: string; tone: 'amber' | 'blue' | 'red' | 'purple' | 'slate'; onClick: () => void }) => {
  const styles = {
    amber: 'bg-amber-50 border-amber-200 text-amber-950',
    blue: 'bg-blue-50 border-blue-200 text-blue-950',
    red: 'bg-red-50 border-red-200 text-red-950',
    purple: 'bg-purple-50 border-purple-200 text-purple-950',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
  };
  return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-left hover:shadow-sm transition-all ${styles[tone]}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wider font-extrabold opacity-70">{label}</span><span className="material-symbols-outlined text-base opacity-70">{icon}</span></div><div className="text-2xl font-black mt-1">{value}</div></button>;
};
