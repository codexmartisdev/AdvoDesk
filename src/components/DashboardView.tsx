import React, { useMemo } from 'react';
import { ScheduledEvent, Client, DocumentTemplate, NavigationTab, LegalCase } from '../types';
import { formatToPtBR, getDaysRemaining } from '../utils/dateUtils';
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
  onOpenCase?: (caseId: string) => void;
  onOpenClient?: (clientId: string) => void;
}

type DashboardCase = LegalCase & {
  archivedAt?: string;
  updatedAt?: string;
  createdAt?: string;
};

type WorkItem = {
  id: string;
  title: string;
  subtitle: string;
  badge: string;
  tone: 'red' | 'amber' | 'blue' | 'slate';
  actionLabel: string;
  onOpen: () => void;
};

const priorityRank: Record<string, number> = {
  Urgente: 0,
  Alta: 1,
  Normal: 2,
  Baixa: 3,
};

const caseIsArchived = (legalCase: LegalCase) => Boolean((legalCase as DashboardCase).archivedAt);

export const DashboardView: React.FC<DashboardViewProps> = ({
  events,
  clients,
  cases = [],
  templates,
  onNavigateToTab,
  onOpenNewClientModal,
  onOpenDocModal,
  onSelectClientForDoc,
  onOpenCase,
  onOpenClient,
}) => {
  const metrics = useMemo(() => getOperationalAgendaMetrics(events, cases), [events, cases]);
  const activeClients = useMemo(() => clients.filter((client) => String(client.status) !== 'Arquivado'), [clients]);
  const activeCases = useMemo(() => cases.filter((legalCase) => !caseIsArchived(legalCase)), [cases]);
  const urgentCases = useMemo(
    () => activeCases.filter((legalCase) => legalCase.priority === 'Urgente' && legalCase.statusLabel !== 'Concluído'),
    [activeCases]
  );
  const recentClients = useMemo(() => [...activeClients].slice(0, 5), [activeClients]);
  const upcomingEvents = useMemo(
    () => sortOperationalEvents(
      events.filter((event) => isOpenAgendaEvent(event.status) && getDaysRemaining(event.fullDate) >= 0)
    ).slice(0, 5),
    [events]
  );

  const casesToResume = useMemo(() => {
    return [...activeCases]
      .filter((legalCase) => legalCase.statusLabel !== 'Concluído')
      .sort((a, b) => {
        const priorityDiff = (priorityRank[a.priority || 'Normal'] ?? 2) - (priorityRank[b.priority || 'Normal'] ?? 2);
        if (priorityDiff !== 0) return priorityDiff;
        const aNoNextStep = !a.nextDeadlineDate ? 0 : 1;
        const bNoNextStep = !b.nextDeadlineDate ? 0 : 1;
        if (aNoNextStep !== bNoNextStep) return aNoNextStep - bNoNextStep;
        const aUpdated = (a as DashboardCase).updatedAt || a.lastMovementDate || a.openingDate || '';
        const bUpdated = (b as DashboardCase).updatedAt || b.lastMovementDate || b.openingDate || '';
        return bUpdated.localeCompare(aUpdated);
      })
      .slice(0, 5);
  }, [activeCases]);

  const workQueue = useMemo<WorkItem[]>(() => {
    const items: WorkItem[] = [];

    sortOperationalEvents(events.filter((event) => isOpenAgendaEvent(event.status) && getDaysRemaining(event.fullDate) < 0))
      .slice(0, 3)
      .forEach((event) => {
        const days = Math.abs(getDaysRemaining(event.fullDate));
        items.push({
          id: `overdue-${event.id}`,
          title: event.title,
          subtitle: `${event.clientName || 'Compromisso'} • ${formatToPtBR(event.fullDate)}`,
          badge: days === 1 ? 'Vencido há 1 dia' : `Vencido há ${days} dias`,
          tone: 'red',
          actionLabel: event.caseId ? 'Abrir caso' : 'Abrir agenda',
          onOpen: () => event.caseId && onOpenCase ? onOpenCase(event.caseId) : onNavigateToTab('calendar'),
        });
      });

    sortOperationalEvents(events.filter((event) => isOpenAgendaEvent(event.status) && getDaysRemaining(event.fullDate) === 0))
      .slice(0, 3)
      .forEach((event) => {
        items.push({
          id: `today-${event.id}`,
          title: event.title,
          subtitle: `${event.clientName || 'Compromisso'}${event.time ? ` • ${event.time}` : ''}`,
          badge: 'Hoje',
          tone: 'amber',
          actionLabel: event.caseId ? 'Abrir caso' : 'Abrir agenda',
          onOpen: () => event.caseId && onOpenCase ? onOpenCase(event.caseId) : onNavigateToTab('calendar'),
        });
      });

    urgentCases.slice(0, 3).forEach((legalCase) => {
      items.push({
        id: `urgent-case-${legalCase.id}`,
        title: legalCase.title,
        subtitle: `${legalCase.clientName} • ${legalCase.caseNumber}`,
        badge: 'Caso urgente',
        tone: 'blue',
        actionLabel: 'Abrir caso',
        onOpen: () => onOpenCase ? onOpenCase(legalCase.id) : onNavigateToTab('cases' as NavigationTab),
      });
    });

    activeCases
      .filter((legalCase) => legalCase.statusLabel !== 'Concluído' && !legalCase.nextDeadlineDate)
      .slice(0, 3)
      .forEach((legalCase) => {
        items.push({
          id: `no-step-${legalCase.id}`,
          title: legalCase.title,
          subtitle: `${legalCase.clientName} • ${legalCase.caseNumber}`,
          badge: 'Sem próximo passo',
          tone: 'slate',
          actionLabel: 'Abrir caso',
          onOpen: () => onOpenCase ? onOpenCase(legalCase.id) : onNavigateToTab('cases' as NavigationTab),
        });
      });

    const toneRank: Record<WorkItem['tone'], number> = { red: 0, amber: 1, blue: 2, slate: 3 };
    return items.sort((a, b) => toneRank[a.tone] - toneRank[b.tone]).slice(0, 8);
  }, [activeCases, events, onNavigateToTab, onOpenCase, urgentCases]);

  const openCasesTab = () => onNavigateToTab('cases' as NavigationTab);

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col xl:flex-row xl:items-end justify-between gap-4 pb-4 border-b border-slate-200/70">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">Painel Principal</h1>
          <p className="text-slate-600 text-sm mt-1 max-w-3xl">O que precisa de atenção agora, sem navegar por várias telas para descobrir.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button type="button" onClick={onOpenNewClientModal} className="glass-btn-primary px-3.5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5 shadow-sm"><span className="material-symbols-outlined text-[18px]">person_add</span>Novo cliente</button>
          <button type="button" onClick={openCasesTab} className="bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-slate-800 font-bold text-xs flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">folder_open</span>Novo caso</button>
          <button type="button" onClick={() => onNavigateToTab('calendar')} className="bg-white hover:bg-slate-50 border border-slate-300 px-3.5 py-2.5 rounded-xl text-slate-800 font-bold text-xs flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px]">event</span>Novo prazo</button>
          <button type="button" onClick={onOpenDocModal} className="bg-[#0D0D0D] hover:bg-black border border-[#C9A227]/60 px-3.5 py-2.5 rounded-xl text-white font-bold text-xs flex items-center gap-1.5"><span className="material-symbols-outlined text-[18px] text-[#C9A227]">description</span>Gerar minuta</button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <SummaryCard title="Casos ativos" value={activeCases.length} icon="folder_open" onClick={openCasesTab} action="Ver casos" />
        <SummaryCard title="Clientes ativos" value={activeClients.length} icon="groups" onClick={() => onNavigateToTab('clients')} action="Ver clientes" />
        <SummaryCard title="Compromissos em aberto" value={metrics.open} icon="alarm" onClick={() => onNavigateToTab('calendar')} action="Ver agenda" />
        <SummaryCard title="Vencidos" value={metrics.overdue} icon="warning" onClick={() => onNavigateToTab('calendar')} action="Resolver" warning={metrics.overdue > 0} />
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div><h2 className="font-title-md text-sm font-extrabold text-slate-900">Atenção operacional</h2><p className="text-[11px] text-slate-500 mt-0.5">Os mesmos critérios usados pela Agenda e pelos Casos.</p></div>
          <div className="text-[10px] text-slate-500 font-semibold">{templates.filter((template) => template.status !== 'Arquivado').length} modelo(s) de documento ativo(s)</div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <OperationalMetric label="Hoje" value={metrics.today} icon="today" tone="amber" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Próximos 7 dias" value={metrics.nextSevenDays} icon="date_range" tone="blue" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Vencidos" value={metrics.overdue} icon="warning" tone="red" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Audiências / perícias" value={metrics.hearingsAndExpertExams} icon="gavel" tone="purple" onClick={() => onNavigateToTab('calendar')} />
          <OperationalMetric label="Sem próximo passo" value={metrics.casesWithoutNextStep} icon="rule" tone="slate" onClick={openCasesTab} />
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3">
            <div><h2 className="font-title-md text-base font-extrabold text-slate-900">Fila de trabalho</h2><p className="text-[11px] text-slate-500 mt-0.5">Prioridade automática: vencidos, hoje, casos urgentes e casos sem próximo passo.</p></div>
            <span className="px-2.5 py-1 rounded-full bg-slate-900 text-white text-[10px] font-bold">{workQueue.length} item(ns)</span>
          </div>
          {workQueue.length === 0 ? (
            <div className="p-10 text-center space-y-2"><span className="material-symbols-outlined text-3xl text-emerald-500">task_alt</span><div className="font-bold text-slate-900 text-sm">Nenhuma pendência crítica na fila.</div><p className="text-xs text-slate-500">Os compromissos futuros continuam disponíveis ao lado.</p></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {workQueue.map((item) => <WorkQueueRow key={item.id} item={item} />)}
            </div>
          )}
        </section>

        <section className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"><div><h2 className="font-title-md text-base font-extrabold text-slate-900">Próximos compromissos</h2><p className="text-[11px] text-slate-500 mt-0.5">Agenda futura já ordenada por data e horário.</p></div><button type="button" onClick={() => onNavigateToTab('calendar')} className="text-xs text-blue-900 font-bold hover:underline">Agenda completa</button></div>
          <div className="p-4 space-y-2">
            {upcomingEvents.length === 0 ? (
              <div className="text-center py-10 text-slate-500 text-xs">Sem compromissos futuros em aberto.</div>
            ) : upcomingEvents.map((event) => (
              <button key={event.id} type="button" onClick={() => event.caseId && onOpenCase ? onOpenCase(event.caseId) : onNavigateToTab('calendar')} className="w-full text-left rounded-xl border border-slate-200 p-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="w-11 h-11 rounded-xl bg-slate-100 border border-slate-200 flex flex-col items-center justify-center shrink-0"><span className="text-[9px] font-extrabold text-slate-400 uppercase">{event.dateStr?.split(' ')[1] || ''}</span><span className="font-black text-slate-900 text-sm">{event.dateStr?.split(' ')[0] || ''}</span></div>
                  <div className="min-w-0 flex-1"><div className="flex items-center gap-2 flex-wrap"><span className="text-xs font-bold text-slate-900 truncate">{event.title}</span>{event.status === 'Remarcado' && <span className="px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 text-purple-800 text-[9px] font-bold">Remarcado</span>}</div><div className="text-[10px] text-slate-500 mt-1">{formatToPtBR(event.fullDate)}{event.time ? ` às ${event.time}` : ''}{event.clientName ? ` • ${event.clientName}` : ''}</div>{event.caseId && <div className="text-[10px] text-blue-900 font-bold mt-1">Abrir caso relacionado</div>}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
        <section className="xl:col-span-7 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"><div><h2 className="font-title-md text-base font-extrabold text-slate-900">Casos para retomar</h2><p className="text-[11px] text-slate-500 mt-0.5">Urgência, ausência de próximo passo e movimentação recente definem a ordem.</p></div><button type="button" onClick={openCasesTab} className="text-xs text-blue-900 font-bold hover:underline">Ver carteira</button></div>
          {casesToResume.length === 0 ? (
            <div className="p-10 text-center text-xs text-slate-500">Nenhum caso ativo aguardando continuidade.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {casesToResume.map((legalCase) => (
                <button key={legalCase.id} type="button" onClick={() => onOpenCase ? onOpenCase(legalCase.id) : openCasesTab()} className="w-full text-left p-4 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${legalCase.priority === 'Urgente' ? 'bg-red-50 text-red-800 border-red-200' : legalCase.priority === 'Alta' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{legalCase.priority || 'Normal'}</span><span className="text-[10px] font-mono text-slate-400">{legalCase.caseNumber}</span></div><div className="font-bold text-slate-900 text-xs mt-1 truncate">{legalCase.title}</div><div className="text-[10px] text-slate-500 mt-0.5 truncate">{legalCase.clientName} • {legalCase.statusLabel}</div></div>
                  <div className="md:text-right shrink-0"><div className={`text-[10px] font-bold ${legalCase.nextDeadlineDate ? 'text-slate-700' : 'text-red-700'}`}>{legalCase.nextDeadlineDate ? `${legalCase.nextDeadlineType || 'Próximo prazo'} • ${formatToPtBR(legalCase.nextDeadlineDate)}` : 'Sem próximo passo'}</div><div className="text-[10px] text-blue-900 font-bold mt-1">Retomar caso</div></div>
                </button>
              ))}
            </div>
          )}
        </section>

        <section className="xl:col-span-5 rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 bg-slate-50/70 flex items-center justify-between gap-3"><div><h2 className="font-title-md text-base font-extrabold text-slate-900">Clientes recentes</h2><p className="text-[11px] text-slate-500 mt-0.5">Acesso rápido à ficha e aos documentos.</p></div><button type="button" onClick={() => onNavigateToTab('clients')} className="text-xs text-blue-900 font-bold hover:underline">Ver carteira</button></div>
          <div className="divide-y divide-slate-100">
            {recentClients.length === 0 ? (
              <div className="p-10 text-center text-xs text-slate-500">Nenhum cliente cadastrado ainda.</div>
            ) : recentClients.map((client) => (
              <div key={client.id} className="p-4 flex items-center justify-between gap-3">
                <button type="button" onClick={() => onOpenClient ? onOpenClient(client.id) : onNavigateToTab('clients')} className="min-w-0 text-left flex-1"><div className="font-bold text-slate-900 text-xs truncate">{client.name}</div><div className="text-[10px] text-slate-500 mt-0.5 truncate">CPF {client.cpf || 'não informado'}{client.category ? ` • ${client.category}` : ''}</div></button>
                <div className="flex items-center gap-1.5 shrink-0">{onSelectClientForDoc && <button type="button" onClick={() => onSelectClientForDoc(client)} className="p-2 rounded-xl bg-blue-50 text-blue-900 border border-blue-200" title="Gerar documento"><span className="material-symbols-outlined text-base">description</span></button>}<button type="button" onClick={() => onOpenClient ? onOpenClient(client.id) : onNavigateToTab('clients')} className="p-2 rounded-xl bg-slate-100 text-slate-700" title="Abrir cliente"><span className="material-symbols-outlined text-base">open_in_new</span></button></div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
};

const SummaryCard: React.FC<{ title: string; value: number; icon: string; onClick: () => void; action: string; warning?: boolean }> = ({ title, value, icon, onClick, action, warning = false }) => (
  <button type="button" onClick={onClick} className={`rounded-2xl p-4 md:p-5 border shadow-xs hover:shadow-md transition-all text-left bg-white group ${warning ? 'border-red-200' : 'border-slate-200'}`}>
    <div className="flex items-start justify-between gap-3"><div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${warning ? 'bg-red-50 border border-red-200 text-red-700' : 'bg-[#0D0D0D] border border-[#C9A227]/50 text-[#C9A227]'}`}><span className="material-symbols-outlined text-[22px]">{icon}</span></div><span className="text-[10px] font-bold text-slate-400 group-hover:text-blue-900">{action}</span></div>
    <div className="mt-4"><p className="text-slate-500 font-semibold text-[10px] uppercase tracking-wider">{title}</p><p className={`text-3xl font-black mt-1 ${warning ? 'text-red-800' : 'text-slate-900'}`}>{value}</p></div>
  </button>
);

const OperationalMetric: React.FC<{ label: string; value: number; icon: string; tone: 'amber' | 'blue' | 'red' | 'purple' | 'slate'; onClick: () => void }> = ({ label, value, icon, tone, onClick }) => {
  const styles = {
    amber: 'bg-amber-50 border-amber-200 text-amber-950',
    blue: 'bg-blue-50 border-blue-200 text-blue-950',
    red: 'bg-red-50 border-red-200 text-red-950',
    purple: 'bg-purple-50 border-purple-200 text-purple-950',
    slate: 'bg-slate-50 border-slate-200 text-slate-900',
  };
  return <button type="button" onClick={onClick} className={`rounded-xl border p-3 text-left hover:shadow-sm transition-all ${styles[tone]}`}><div className="flex items-center justify-between gap-2"><span className="text-[10px] uppercase tracking-wider font-extrabold opacity-70">{label}</span><span className="material-symbols-outlined text-base opacity-70">{icon}</span></div><div className="text-2xl font-black mt-1">{value}</div></button>;
};

const WorkQueueRow: React.FC<{ item: WorkItem }> = ({ item }) => {
  const styles = {
    red: 'bg-red-50 text-red-800 border-red-200',
    amber: 'bg-amber-50 text-amber-900 border-amber-200',
    blue: 'bg-blue-50 text-blue-900 border-blue-200',
    slate: 'bg-slate-50 text-slate-700 border-slate-200',
  };

  return (
    <button type="button" onClick={item.onOpen} className="w-full p-4 text-left hover:bg-slate-50 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className={`px-2 py-0.5 rounded-full border text-[9px] font-extrabold ${styles[item.tone]}`}>{item.badge}</span></div><div className="font-bold text-slate-900 text-xs mt-1 truncate">{item.title}</div><div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.subtitle}</div></div>
      <span className="text-[10px] text-blue-900 font-bold shrink-0">{item.actionLabel} →</span>
    </button>
  );
};
