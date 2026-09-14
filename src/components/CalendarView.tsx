import React, { useMemo, useState } from 'react';
import { ScheduledEvent, LegalCase, Client } from '../types';
import { formatToPtBR, getBrasiliaISO, getDaysRemaining, getUrgencyInfo } from '../utils/dateUtils';
import { getOperationalAgendaMetrics, isOpenAgendaEvent, sortOperationalEvents } from '../utils/agendaMetrics';
import {
  loginGoogleCalendar,
  logoutGoogleCalendar,
  getCachedGoogleUser,
  getCachedAccessToken,
  syncScheduledEventToGoogle,
  deleteScheduledEventFromGoogle,
} from '../services/googleCalendarService';
import { User } from '@firebase/auth';

interface CalendarViewProps {
  events: ScheduledEvent[];
  cases?: LegalCase[];
  clients?: Client[];
  searchQuery: string;
  onAddEvent: (event: ScheduledEvent) => void;
  onUpdateEvent?: (event: ScheduledEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
  onOpenCase?: (caseId: string) => void;
  onOpenClient?: (clientId: string) => void;
}

type OperationalFilter = 'todos' | 'hoje' | '7dias' | 'vencidos' | 'urgentes';
type EventStatusFilter = 'todos' | ScheduledEvent['status'];
type PriorityFormValue = 'auto' | 'urgente' | 'atencao' | 'normal';
type ReminderFormValue = 'at_time' | '1_hour' | '1_day' | '2_days' | 'custom';

const EVENT_TYPES = [
  'Perícia Médica',
  'Perícia Social',
  'Audiência',
  'Prazo de Recurso',
  'Retorno de Exigência',
  'Prazo de Contestação',
  'Reunião com Cliente',
  'Outro',
] as const;

const MONTH_NAMES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const WEEKDAYS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];

const normalizeText = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const formatDateBadge = (isoDate: string) => {
  const [, month = '', day = ''] = isoDate.split('-');
  const monthIndex = Number(month) - 1;
  return `${day || '--'} ${MONTH_NAMES[monthIndex] || '---'}`;
};

const eventPresentation = (eventType: string) => {
  if (eventType.includes('Recurso') || eventType.includes('Contestação') || eventType.includes('Exigência')) {
    return { type: 'Prazos Fatais (Recursos)', badgeColor: 'recurso' };
  }
  if (eventType.includes('Reunião')) {
    return { type: 'Reuniões Internas', badgeColor: 'reuniao' };
  }
  return { type: 'Audiências & Perícias', badgeColor: 'pericia' };
};

const createEventId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `ev-${crypto.randomUUID()}`;
  }
  return `ev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
};

const initialMonth = () => {
  const [year, month] = getBrasiliaISO().split('-').map(Number);
  return { year, month: month - 1 };
};

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  cases = [],
  clients = [],
  searchQuery,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
  onOpenCase,
  onOpenClient,
}) => {
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<EventStatusFilter>('todos');
  const [operationalFilter, setOperationalFilter] = useState<OperationalFilter>('todos');
  const [visibleMonth, setVisibleMonth] = useState(initialMonth);

  const [googleUser, setGoogleUser] = useState<User | null>(getCachedGoogleUser());
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(getCachedAccessToken());
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [syncingEventId, setSyncingEventId] = useState<string | null>(null);
  const [googleSyncMessage, setGoogleSyncMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);
  const [formError, setFormError] = useState('');

  const [formCaseId, setFormCaseId] = useState('');
  const [formClientId, setFormClientId] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formBenefitType, setFormBenefitType] = useState('');
  const [formProcessNumber, setFormProcessNumber] = useState('');
  const [formEventType, setFormEventType] = useState<string>('Perícia Médica');
  const [formTitle, setFormTitle] = useState('');
  const [formFullDate, setFormFullDate] = useState(getBrasiliaISO());
  const [formTime, setFormTime] = useState('14:00');
  const [formLocation, setFormLocation] = useState('');
  const [formStatus, setFormStatus] = useState<ScheduledEvent['status']>('Pendente');
  const [formPriorityLevel, setFormPriorityLevel] = useState<PriorityFormValue>('auto');
  const [formNotes, setFormNotes] = useState('');
  const [formReminderOption, setFormReminderOption] = useState<ReminderFormValue>('1_day');
  const [formCustomReminderTime, setFormCustomReminderTime] = useState('09:00');
  const [formSyncWithGoogle, setFormSyncWithGoogle] = useState(true);

  const activeCases = useMemo(
    () => cases.filter((item) => !(item as LegalCase & { archivedAt?: string }).archivedAt),
    [cases]
  );

  const availableClients = useMemo(
    () => clients.filter((client) => String(client.status) !== 'Arquivado'),
    [clients]
  );

  const todayIso = getBrasiliaISO();
  const summary = useMemo(() => getOperationalAgendaMetrics(events, cases), [events, cases]);

  const filteredEvents = useMemo(() => {
    const query = normalizeText(searchQuery);
    const filtered = events.filter((event) => {
      const matchesSearch = !query || normalizeText([
        event.title,
        event.clientName,
        event.processNumber,
        event.location,
        event.benefitType,
        event.eventType,
      ].filter(Boolean).join(' ')).includes(query);

      const matchesType = filterType === 'todos' || event.eventType === filterType || event.type === filterType;
      const matchesStatus = filterStatus === 'todos' || event.status === filterStatus;
      const matchesDay = !selectedDayFilter || event.fullDate === selectedDayFilter;
      const days = getDaysRemaining(event.fullDate);
      const open = isOpenAgendaEvent(event.status);

      let matchesOperational = true;
      if (operationalFilter === 'hoje') matchesOperational = open && days === 0;
      if (operationalFilter === '7dias') matchesOperational = open && days >= 0 && days <= 6;
      if (operationalFilter === 'vencidos') matchesOperational = open && days < 0;
      if (operationalFilter === 'urgentes') matchesOperational = open && (event.priorityLevel === 'urgente' || days < 3);

      return matchesSearch && matchesType && matchesStatus && matchesDay && matchesOperational;
    });
    return sortOperationalEvents(filtered);
  }, [events, filterStatus, filterType, operationalFilter, searchQuery, selectedDayFilter]);

  const calendarDays = useMemo(() => {
    const firstWeekday = new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1)).getUTCDay();
    const daysInMonth = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + 1, 0)).getUTCDate();
    const totalCells = Math.ceil((firstWeekday + daysInMonth) / 7) * 7;
    return Array.from({ length: totalCells }, (_, index) => {
      const day = index - firstWeekday + 1;
      if (day < 1 || day > daysInMonth) return null;
      const month = String(visibleMonth.month + 1).padStart(2, '0');
      return `${visibleMonth.year}-${month}-${String(day).padStart(2, '0')}`;
    });
  }, [visibleMonth]);

  const monthLabel = useMemo(() => {
    const label = new Intl.DateTimeFormat('pt-BR', {
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(new Date(Date.UTC(visibleMonth.year, visibleMonth.month, 1, 12)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  }, [visibleMonth]);

  const resetForm = () => {
    setFormCaseId('');
    setFormClientId('');
    setFormClientName('');
    setFormBenefitType('');
    setFormProcessNumber('');
    setFormEventType('Perícia Médica');
    setFormTitle('');
    setFormFullDate(selectedDayFilter || todayIso);
    setFormTime('14:00');
    setFormLocation('');
    setFormStatus('Pendente');
    setFormPriorityLevel('auto');
    setFormNotes('');
    setFormReminderOption('1_day');
    setFormCustomReminderTime('09:00');
    setFormSyncWithGoogle(Boolean(googleAccessToken));
    setFormError('');
  };

  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    resetForm();
    setModalOpen(true);
  };

  const handleOpenEditModal = (event: ScheduledEvent, mouseEvent?: React.MouseEvent) => {
    mouseEvent?.stopPropagation();
    const linkedCase = event.caseId ? activeCases.find((item) => item.id === event.caseId) : undefined;
    const linkedClient = event.clientId
      ? availableClients.find((item) => item.id === event.clientId)
      : availableClients.find((item) => normalizeText(item.name) === normalizeText(event.clientName));

    setEditingEvent(event);
    setFormCaseId(event.caseId || '');
    setFormClientId(event.clientId || linkedCase?.clientId || linkedClient?.id || '');
    setFormClientName(event.clientName || linkedCase?.clientName || linkedClient?.name || '');
    setFormBenefitType(event.benefitType || linkedCase?.benefitType || linkedCase?.category || '');
    setFormProcessNumber(event.processNumber || linkedCase?.processNumber || linkedCase?.caseNumber || '');
    setFormEventType(event.eventType || 'Outro');
    setFormTitle(event.title || '');
    setFormFullDate(event.fullDate || todayIso);
    setFormTime(event.time || '');
    setFormLocation(event.location || '');
    setFormStatus(event.status || 'Pendente');
    setFormPriorityLevel((event.priorityLevel as PriorityFormValue) || 'auto');
    setFormNotes(event.notes || '');
    setFormReminderOption((event.reminderOption as ReminderFormValue) || '1_day');
    setFormCustomReminderTime(event.customReminderTime || '09:00');
    setFormSyncWithGoogle(event.syncedWithGoogleCalendar ?? Boolean(googleAccessToken));
    setFormError('');
    setModalOpen(true);
  };

  const handleOpenReschedule = (event: ScheduledEvent, mouseEvent: React.MouseEvent) => {
    handleOpenEditModal(event, mouseEvent);
    setFormStatus('Remarcado');
  };

  const handleCaseSelectChange = (caseId: string) => {
    setFormCaseId(caseId);
    setFormError('');
    if (!caseId) {
      setFormClientId('');
      setFormClientName('');
      setFormBenefitType('');
      setFormProcessNumber('');
      return;
    }
    const selectedCase = activeCases.find((item) => item.id === caseId);
    if (!selectedCase) return;
    setFormClientId(selectedCase.clientId);
    setFormClientName(selectedCase.clientName);
    setFormBenefitType(selectedCase.benefitType || selectedCase.category);
    setFormProcessNumber(selectedCase.processNumber || selectedCase.caseNumber);
    if (!formLocation.trim()) setFormLocation(selectedCase.agencyOrCourt || selectedCase.court || '');
    if (!formTitle.trim() || formTitle.includes(' - ') || formTitle.includes(' — ')) {
      setFormTitle(`${formEventType} — ${selectedCase.clientName}`);
    }
  };

  const handleClientSelectChange = (clientId: string) => {
    setFormClientId(clientId);
    const selectedClient = availableClients.find((item) => item.id === clientId);
    setFormClientName(selectedClient?.name || '');
    if (selectedClient && (!formTitle.trim() || formTitle.includes(' - ') || formTitle.includes(' — '))) {
      setFormTitle(`${formEventType} — ${selectedClient.name}`);
    }
  };

  const handleEventTypeChange = (newType: string) => {
    setFormEventType(newType);
    const contextName = formClientName.trim();
    if (contextName && (!formTitle.trim() || formTitle.startsWith(formEventType))) {
      setFormTitle(`${newType} — ${contextName}`);
    }
  };

  const handleConnectGoogle = async () => {
    setIsLoggingInGoogle(true);
    setGoogleSyncMessage(null);
    try {
      const result = await loginGoogleCalendar();
      setGoogleUser(result.user);
      setGoogleAccessToken(result.accessToken);
      setFormSyncWithGoogle(true);
      setGoogleSyncMessage({ text: 'Conta do Google Agenda conectada com sucesso.', type: 'success' });
      setTimeout(() => setGoogleSyncMessage(null), 4000);
    } catch (error: any) {
      setGoogleSyncMessage({ text: error?.message || 'Erro ao autenticar com o Google Agenda.', type: 'error' });
    } finally {
      setIsLoggingInGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogleCalendar();
    setGoogleUser(null);
    setGoogleAccessToken(null);
    setFormSyncWithGoogle(false);
    setGoogleSyncMessage({ text: 'Google Agenda desconectado.', type: 'success' });
    setTimeout(() => setGoogleSyncMessage(null), 3000);
  };

  const handleManualSyncGoogle = async (event: ScheduledEvent, mouseEvent?: React.MouseEvent) => {
    mouseEvent?.stopPropagation();
    let token = googleAccessToken;
    if (!token) {
      try {
        const result = await loginGoogleCalendar();
        token = result.accessToken;
        setGoogleUser(result.user);
        setGoogleAccessToken(result.accessToken);
      } catch {
        return;
      }
    }
    setSyncingEventId(event.id);
    try {
      const result = await syncScheduledEventToGoogle(event, token);
      onUpdateEvent?.({
        ...event,
        syncedWithGoogleCalendar: true,
        googleEventId: result.googleEventId,
        googleHtmlLink: result.htmlLink,
      });
      setGoogleSyncMessage({ text: `“${event.title}” sincronizado com o Google Agenda.`, type: 'success' });
      setTimeout(() => setGoogleSyncMessage(null), 4000);
    } catch (error: any) {
      setGoogleSyncMessage({ text: `Falha ao sincronizar: ${error?.message || 'erro desconhecido'}`, type: 'error' });
    } finally {
      setSyncingEventId(null);
    }
  };

  const handleSaveEvent = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    if (!formTitle.trim()) return setFormError('Informe um título para o compromisso.');
    if (!formFullDate) return setFormError('Informe a data do compromisso.');

    const linkedCase = formCaseId ? activeCases.find((item) => item.id === formCaseId) : undefined;
    if (formCaseId && !linkedCase) return setFormError('O caso vinculado não está mais disponível. Atualize a seleção.');

    if (isOpenAgendaEvent(formStatus)) {
      const duplicate = events.some((existing) => {
        if (existing.id === editingEvent?.id || !isOpenAgendaEvent(existing.status)) return false;
        if (existing.fullDate !== formFullDate) return false;
        if (normalizeText(existing.eventType || existing.type) !== normalizeText(formEventType)) return false;
        if (formCaseId) return existing.caseId === formCaseId;
        return !existing.caseId && normalizeText(existing.title) === normalizeText(formTitle);
      });
      if (duplicate) return setFormError('Já existe um compromisso em aberto com o mesmo caso, tipo e data.');
    }

    const selectedClient = formClientId ? availableClients.find((item) => item.id === formClientId) : undefined;
    const presentation = eventPresentation(formEventType);
    let savedEvent: ScheduledEvent = {
      id: editingEvent?.id || createEventId(),
      dateStr: formatDateBadge(formFullDate),
      fullDate: formFullDate,
      time: formTime || undefined,
      type: presentation.type,
      badgeColor: presentation.badgeColor,
      title: formTitle.trim(),
      caseId: linkedCase?.id,
      clientId: linkedCase?.clientId || selectedClient?.id || formClientId || undefined,
      clientName: linkedCase?.clientName || selectedClient?.name || formClientName.trim() || undefined,
      benefitType: linkedCase?.benefitType || linkedCase?.category || formBenefitType.trim() || undefined,
      processNumber: linkedCase?.processNumber || linkedCase?.caseNumber || formProcessNumber.trim() || undefined,
      eventType: formEventType,
      location: formLocation.trim() || undefined,
      status: formStatus,
      priorityLevel: formPriorityLevel === 'auto' ? undefined : formPriorityLevel,
      notes: formNotes.trim() || undefined,
      reminderDays: formReminderOption === '1_day' ? 1 : formReminderOption === '2_days' ? 2 : 0,
      reminderOption: formReminderOption,
      customReminderTime: formCustomReminderTime,
      syncedWithGoogleCalendar: editingEvent?.syncedWithGoogleCalendar || false,
      googleEventId: editingEvent?.googleEventId,
      googleHtmlLink: editingEvent?.googleHtmlLink,
    };

    if (formSyncWithGoogle && googleAccessToken) {
      try {
        const result = await syncScheduledEventToGoogle(savedEvent, googleAccessToken);
        savedEvent = { ...savedEvent, syncedWithGoogleCalendar: true, googleEventId: result.googleEventId, googleHtmlLink: result.htmlLink };
        setGoogleSyncMessage({ text: 'Compromisso salvo e sincronizado com o Google Agenda.', type: 'success' });
        setTimeout(() => setGoogleSyncMessage(null), 4000);
      } catch (error: any) {
        setGoogleSyncMessage({ text: `Salvo no AdvoDesk, mas o Google Agenda não sincronizou: ${error?.message || 'erro desconhecido'}`, type: 'error' });
      }
    }

    if (editingEvent) onUpdateEvent?.(savedEvent);
    else onAddEvent(savedEvent);
    setModalOpen(false);
  };

  const handleQuickStatusChange = (event: ScheduledEvent, newStatus: ScheduledEvent['status'], mouseEvent: React.MouseEvent) => {
    mouseEvent.stopPropagation();
    onUpdateEvent?.({ ...event, status: newStatus });
  };

  const handleDelete = (eventId: string, mouseEvent?: React.MouseEvent) => {
    mouseEvent?.stopPropagation();
    const target = events.find((event) => event.id === eventId);
    if (target?.caseId) {
      setFormError('Este compromisso pertence ao histórico de um caso e não pode ser excluído. Conclua, remarque ou altere o status.');
      return;
    }
    setDeletingEventId(eventId);
  };

  const shiftMonth = (delta: number) => {
    const next = new Date(Date.UTC(visibleMonth.year, visibleMonth.month + delta, 1));
    setVisibleMonth({ year: next.getUTCFullYear(), month: next.getUTCMonth() });
    setSelectedDayFilter(null);
  };

  const goToCurrentMonth = () => {
    setVisibleMonth(initialMonth());
    setSelectedDayFilter(null);
  };

  const applyOperationalFilter = (filter: OperationalFilter) => {
    setOperationalFilter(filter);
    setSelectedDayFilter(null);
  };

  const linkedCaseInForm = formCaseId ? activeCases.find((item) => item.id === formCaseId) : undefined;
  const editingProtectedHistory = Boolean(editingEvent?.caseId);

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-3 border-b border-slate-200/60 gap-4">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">Prazos & Agenda</h1>
          <p className="text-slate-600 text-sm">Controle operacional de prazos, audiências, perícias e compromissos com contexto reutilizado de Clientes e Casos.</p>
        </div>
        <button onClick={handleOpenCreateModal} className="glass-btn-primary px-4 py-2.5 rounded-xl text-white font-semibold text-xs md:text-sm flex items-center gap-2 shadow-xs transition-all hover:scale-[1.02]">
          <span className="material-symbols-outlined text-[18px]">add</span><span>Novo Evento / Prazo</span>
        </button>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricButton label="Vencidos" value={summary.overdue} active={operationalFilter === 'vencidos'} tone="red" onClick={() => applyOperationalFilter('vencidos')} />
        <MetricButton label="Hoje" value={summary.today} active={operationalFilter === 'hoje'} tone="amber" onClick={() => applyOperationalFilter('hoje')} />
        <MetricButton label="Próximos 7 dias" value={summary.nextSevenDays} active={operationalFilter === '7dias'} tone="blue" onClick={() => applyOperationalFilter('7dias')} />
        <MetricButton label="Em aberto" value={summary.open} active={operationalFilter === 'todos'} tone="slate" onClick={() => applyOperationalFilter('todos')} />
      </div>

      <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-col xl:flex-row xl:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 xl:pb-0">
          <span className="font-bold text-slate-500 whitespace-nowrap">Tipo:</span>
          <button onClick={() => setFilterType('todos')} className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${filterType === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}>Todos</button>
          {EVENT_TYPES.map((type) => <button key={type} onClick={() => setFilterType(type)} className={`px-3 py-1.5 rounded-lg font-bold whitespace-nowrap ${filterType === type ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600'}`}>{type}</button>)}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filterStatus} onChange={(event) => setFilterStatus(event.target.value as EventStatusFilter)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <option value="todos">Todos os status</option><option value="Pendente">Pendentes</option><option value="Remarcado">Remarcados</option><option value="Concluído">Concluídos</option><option value="Perdido">Perdidos</option>
          </select>
          <select value={operationalFilter} onChange={(event) => applyOperationalFilter(event.target.value as OperationalFilter)} className="px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 font-semibold text-slate-700">
            <option value="todos">Todos os períodos</option><option value="hoje">Hoje</option><option value="7dias">Próximos 7 dias</option><option value="vencidos">Vencidos</option><option value="urgentes">Urgentes</option>
          </select>
          {(selectedDayFilter || filterType !== 'todos' || filterStatus !== 'todos' || operationalFilter !== 'todos') && (
            <button type="button" onClick={() => { setSelectedDayFilter(null); setFilterType('todos'); setFilterStatus('todos'); setOperationalFilter('todos'); }} className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold">Limpar filtros</button>
          )}
        </div>
      </div>

      {googleSyncMessage && (
        <div className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center justify-between ${googleSyncMessage.type === 'success' ? 'bg-emerald-50 text-emerald-900 border-emerald-200' : 'bg-red-50 text-red-900 border-red-200'}`}>
          <span>{googleSyncMessage.text}</span><button type="button" onClick={() => setGoogleSyncMessage(null)}><span className="material-symbols-outlined text-sm">close</span></button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-3">
          {selectedDayFilter && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-2.5 flex items-center justify-between text-xs text-blue-950"><span className="font-bold">Exibindo {formatToPtBR(selectedDayFilter)}</span><button type="button" onClick={() => setSelectedDayFilter(null)} className="font-bold hover:underline">Mostrar todas as datas</button></div>}

          {filteredEvents.map((event) => {
            const urgency = getUrgencyInfo(event.fullDate, event.status, event.priorityLevel);
            const linkedCase = event.caseId ? cases.find((item) => item.id === event.caseId) : undefined;
            const linkedClientId = event.clientId || linkedCase?.clientId;
            return (
              <article key={event.id} onClick={(mouseEvent) => handleOpenEditModal(event, mouseEvent)} className={`rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${event.status === 'Concluído' ? 'opacity-80' : ''}`}>
                <div className={`absolute inset-y-0 left-0 w-1.5 ${urgency.level === 'urgente' ? 'bg-red-600' : urgency.level === 'atencao' ? 'bg-amber-500' : urgency.level === 'concluido' ? 'bg-emerald-500' : 'bg-blue-600'}`} />
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-1">
                  <div className="flex items-start gap-4 min-w-0">
                    <div className="w-16 h-16 rounded-xl border border-slate-200 bg-slate-50 flex flex-col items-center justify-center shrink-0"><span className="text-[10px] uppercase font-bold text-slate-500">{formatDateBadge(event.fullDate).split(' ')[1]}</span><span className="text-xl font-black text-slate-900">{formatDateBadge(event.fullDate).split(' ')[0]}</span></div>
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200">{event.eventType || event.type}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${urgency.bgClass}`}>{urgency.daysText}</span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${event.status === 'Concluído' ? 'bg-emerald-100 text-emerald-900 border-emerald-300' : event.status === 'Perdido' ? 'bg-red-100 text-red-900 border-red-300' : event.status === 'Remarcado' ? 'bg-purple-100 text-purple-900 border-purple-300' : 'bg-slate-100 text-slate-700 border-slate-200'}`}>{event.status}</span>
                        <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${event.caseId ? 'bg-slate-900 text-white border-slate-900' : 'bg-slate-50 text-slate-600 border-slate-200'}`}>{event.caseId ? `Caso ${linkedCase?.caseNumber || 'vinculado'}` : 'Compromisso avulso'}</span>
                      </div>
                      <h3 className="font-bold text-slate-900 group-hover:text-blue-900 transition-colors">{event.title}</h3>
                      {(event.clientName || event.processNumber || event.benefitType) && <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600">{event.clientName && <span className="font-bold text-slate-800">{event.clientName}</span>}{event.benefitType && <span>{event.benefitType}</span>}{event.processNumber && <span className="font-mono text-[11px]">{event.processNumber}</span>}</div>}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500"><span className="font-semibold text-slate-700">{formatToPtBR(event.fullDate)}{event.time ? ` às ${event.time}` : ''}</span>{event.location && <span>{event.location}</span>}</div>
                      {event.notes && <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-100">{event.notes}</p>}
                      {(event.caseId || linkedClientId) && (
                        <div className="flex flex-wrap gap-2 pt-1" onClick={(mouseEvent) => mouseEvent.stopPropagation()}>
                          {event.caseId && onOpenCase && <button type="button" onClick={() => onOpenCase(event.caseId!)} className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[10px] font-bold">Abrir caso</button>}
                          {linkedClientId && onOpenClient && <button type="button" onClick={() => onOpenClient(linkedClientId)} className="px-2.5 py-1 rounded-lg bg-blue-50 text-blue-900 border border-blue-200 text-[10px] font-bold">Abrir cliente</button>}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center" onClick={(mouseEvent) => mouseEvent.stopPropagation()}>
                    {event.status === 'Concluído' ? <button type="button" onClick={(mouseEvent) => handleQuickStatusChange(event, 'Pendente', mouseEvent)} className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 border border-slate-300 text-xs font-bold">Reabrir</button> : <><button type="button" onClick={(mouseEvent) => handleQuickStatusChange(event, 'Concluído', mouseEvent)} className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">Concluir</button><button type="button" onClick={(mouseEvent) => handleOpenReschedule(event, mouseEvent)} className="px-2.5 py-1.5 rounded-xl bg-purple-50 text-purple-800 border border-purple-200 text-xs font-bold">Remarcar</button></>}
                    {!event.syncedWithGoogleCalendar && <button type="button" title="Sincronizar Google Agenda" disabled={syncingEventId === event.id} onClick={(mouseEvent) => void handleManualSyncGoogle(event, mouseEvent)} className="p-2 rounded-xl text-slate-500 hover:bg-blue-50 hover:text-blue-900 disabled:opacity-50"><span className="material-symbols-outlined text-lg">sync</span></button>}
                    <button type="button" title="Editar" onClick={(mouseEvent) => handleOpenEditModal(event, mouseEvent)} className="p-2 rounded-xl text-slate-500 hover:bg-slate-100"><span className="material-symbols-outlined text-lg">edit</span></button>
                  </div>
                </div>
              </article>
            );
          })}

          {filteredEvents.length === 0 && <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-2xs space-y-3"><span className="material-symbols-outlined text-3xl text-slate-300">event_busy</span><p className="font-bold text-slate-800">Nenhum compromisso encontrado.</p><p className="text-xs">Ajuste os filtros ou cadastre um novo evento.</p><button type="button" onClick={handleOpenCreateModal} className="glass-btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs">Novo evento</button></div>}
        </div>

        <aside className="lg:col-span-4 space-y-4">
          <div className="rounded-2xl p-5 bg-white border border-slate-200 shadow-2xs">
            <div className="flex items-center justify-between gap-2 mb-4"><button type="button" title="Mês anterior" onClick={() => shiftMonth(-1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"><span className="material-symbols-outlined">chevron_left</span></button><div className="text-center"><h3 className="font-extrabold text-slate-900 text-sm">{monthLabel}</h3><button type="button" onClick={goToCurrentMonth} className="text-[10px] font-bold text-blue-900 hover:underline">Ir para hoje</button></div><button type="button" title="Próximo mês" onClick={() => shiftMonth(1)} className="p-2 rounded-xl hover:bg-slate-100 text-slate-600"><span className="material-symbols-outlined">chevron_right</span></button></div>
            <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-extrabold text-slate-400 mb-1">{WEEKDAYS.map((weekday, index) => <span key={`${weekday}-${index}`}>{weekday}</span>)}</div>
            <div className="grid grid-cols-7 gap-1 text-center">
              {calendarDays.map((isoDate, index) => {
                if (!isoDate) return <span key={`blank-${index}`} className="h-9" />;
                const dayEvents = events.filter((event) => event.fullDate === isoDate);
                const openDayEvents = dayEvents.filter((event) => isOpenAgendaEvent(event.status));
                const isSelected = selectedDayFilter === isoDate;
                const isToday = isoDate === todayIso;
                const hasOverdueOrUrgent = openDayEvents.some((event) => getDaysRemaining(event.fullDate) < 3 || event.priorityLevel === 'urgente');
                const hasAttention = openDayEvents.some((event) => { const days = getDaysRemaining(event.fullDate); return days >= 3 && days < 7; });
                return <button key={isoDate} type="button" onClick={() => setSelectedDayFilter((current) => current === isoDate ? null : isoDate)} className={`h-9 rounded-xl relative text-xs font-bold transition-all ${isSelected ? 'bg-blue-900 text-white shadow-xs' : isToday ? 'bg-blue-100 text-blue-950 border border-blue-300' : 'hover:bg-slate-100 text-slate-800'}`}>{Number(isoDate.slice(-2))}{dayEvents.length > 0 && <span className={`absolute bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full ${hasOverdueOrUrgent ? 'bg-red-600' : hasAttention ? 'bg-amber-500' : openDayEvents.length > 0 ? 'bg-emerald-500' : 'bg-slate-400'}`} />}</button>;
              })}
            </div>
            <div className="mt-4 pt-3 border-t border-slate-100 text-[10px] text-slate-500 grid grid-cols-2 gap-2"><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-600" /> Urgente/vencido</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" /> Atenção</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500" /> Em aberto</span><span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-400" /> Histórico</span></div>
          </div>

          <div className="rounded-2xl p-4 bg-white border border-slate-200 shadow-2xs"><div className="flex items-center justify-between gap-3"><div><div className="text-xs font-bold text-slate-900">Google Agenda</div><div className="text-[10px] text-slate-500 mt-0.5">{googleUser ? googleUser.email : 'Não conectado'}</div></div>{googleUser ? <button type="button" onClick={() => void handleDisconnectGoogle()} className="px-3 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold">Desconectar</button> : <button type="button" disabled={isLoggingInGoogle} onClick={() => void handleConnectGoogle()} className="px-3 py-2 rounded-xl bg-blue-900 text-white text-xs font-bold disabled:opacity-50">{isLoggingInGoogle ? 'Conectando...' : 'Conectar'}</button>}</div></div>
        </aside>
      </div>

      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl border border-slate-200 shadow-2xl relative my-auto max-h-[92vh] flex flex-col overflow-hidden text-left">
            <div className="p-6 border-b border-slate-200 bg-slate-50/70 flex items-start justify-between gap-4"><div><h3 className="text-lg font-extrabold text-slate-900">{editingEvent ? 'Editar evento / prazo' : 'Novo evento / prazo'}</h3><p className="text-xs text-slate-500 mt-1">{editingProtectedHistory ? 'Compromisso vinculado: o histórico do caso será preservado.' : 'Vincule ao caso ou cliente para reutilizar contexto sem redigitação.'}</p></div><button type="button" onClick={() => setModalOpen(false)} className="p-2 rounded-xl hover:bg-slate-200 text-slate-500"><span className="material-symbols-outlined">close</span></button></div>

            <form id="agenda-event-form" onSubmit={handleSaveEvent} className="p-6 space-y-5 text-xs overflow-y-auto">
              {formError && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-bold text-red-800">{formError}</div>}
              {editingProtectedHistory && <div className="rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-900"><strong>Histórico protegido.</strong> Este compromisso pertence a um caso. Ele pode ser concluído, reaberto, remarcado ou editado, mas não excluído nem transferido para outro caso.</div>}

              <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[10px]">Contexto</h4>
                <div><label className="block font-bold text-slate-700 mb-1">Caso / processo vinculado</label><select value={formCaseId} disabled={editingProtectedHistory} onChange={(event) => handleCaseSelectChange(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold disabled:bg-slate-100 disabled:text-slate-500"><option value="">Sem caso vinculado</option>{activeCases.map((legalCase) => <option key={legalCase.id} value={legalCase.id}>{legalCase.clientName} — {legalCase.title} ({legalCase.processNumber || legalCase.caseNumber})</option>)}</select></div>
                {!formCaseId && <div><label className="block font-bold text-slate-700 mb-1">Cliente relacionado <span className="font-normal text-slate-400">(opcional)</span></label><select value={formClientId} onChange={(event) => handleClientSelectChange(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold"><option value="">Sem cliente relacionado</option>{availableClients.map((client) => <option key={client.id} value={client.id}>{client.name} — CPF {client.cpf}</option>)}</select></div>}
                {(formCaseId || formClientId || formClientName) && <div className="grid grid-cols-1 md:grid-cols-3 gap-3"><ReadField label="Cliente" value={formClientName} onChange={setFormClientName} readOnly={Boolean(formCaseId || formClientId)} /><ReadField label="Área / ação" value={formBenefitType} onChange={setFormBenefitType} readOnly={Boolean(formCaseId)} /><ReadField label="Processo / protocolo" value={formProcessNumber} onChange={setFormProcessNumber} readOnly={Boolean(formCaseId)} /></div>}
                {linkedCaseInForm && <div className="text-[10px] text-slate-500">Contexto herdado de {linkedCaseInForm.caseNumber}. Alterações cadastrais devem ser feitas na ficha do caso.</div>}
              </section>

              <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[10px]">Compromisso</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Tipo</label><select value={formEventType} onChange={(event) => handleEventTypeChange(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold">{EVENT_TYPES.map((type) => <option key={type}>{type}</option>)}</select></div><div><label className="block font-bold text-slate-700 mb-1">Título *</label><input required value={formTitle} onChange={(event) => setFormTitle(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5" /></div><div><label className="block font-bold text-slate-700 mb-1">Data *</label><input required type="date" value={formFullDate} onChange={(event) => setFormFullDate(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5" /></div><div><label className="block font-bold text-slate-700 mb-1">Horário</label><input type="time" value={formTime} onChange={(event) => setFormTime(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5" /></div><div className="md:col-span-2"><label className="block font-bold text-slate-700 mb-1">Local / link</label><input value={formLocation} onChange={(event) => setFormLocation(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5" /></div></div>
              </section>

              <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[10px]">Controle</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Status</label><select value={formStatus} onChange={(event) => setFormStatus(event.target.value as ScheduledEvent['status'])} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold"><option>Pendente</option><option>Remarcado</option><option>Concluído</option><option>Perdido</option></select></div><div><label className="block font-bold text-slate-700 mb-1">Prioridade visual</label><select value={formPriorityLevel} onChange={(event) => setFormPriorityLevel(event.target.value as PriorityFormValue)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold"><option value="auto">Automática pela data</option><option value="urgente">Urgente</option><option value="atencao">Atenção</option><option value="normal">Normal</option></select></div></div>
                {formFullDate && (() => { const urgency = getUrgencyInfo(formFullDate, formStatus, formPriorityLevel === 'auto' ? undefined : formPriorityLevel); return <div className={`p-3 rounded-xl border font-bold flex items-center justify-between ${urgency.bgClass}`}><span>{urgency.label}</span><span>{urgency.daysText}</span></div>; })()}
                <div><label className="block font-bold text-slate-700 mb-1">Observação rápida</label><textarea rows={3} value={formNotes} onChange={(event) => setFormNotes(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 resize-none" /></div>
              </section>

              <section className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3"><h4 className="font-extrabold text-blue-900 uppercase tracking-wider text-[10px]">Lembrete</h4><div className="grid grid-cols-1 md:grid-cols-2 gap-3"><div><label className="block font-bold text-slate-700 mb-1">Antecedência</label><select value={formReminderOption} onChange={(event) => setFormReminderOption(event.target.value as ReminderFormValue)} className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 font-semibold"><option value="1_hour">1 hora antes</option><option value="1_day">1 dia antes</option><option value="2_days">2 dias antes</option><option value="custom">Horário personalizado no dia</option><option value="at_time">Na hora</option></select></div>{formReminderOption === 'custom' && <div><label className="block font-bold text-slate-700 mb-1">Horário do alerta</label><input type="time" value={formCustomReminderTime} onChange={(event) => setFormCustomReminderTime(event.target.value)} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5" /></div>}</div><label className="flex items-center gap-2 text-xs font-semibold text-slate-700"><input type="checkbox" checked={formSyncWithGoogle} onChange={(event) => setFormSyncWithGoogle(event.target.checked)} /> Sincronizar no Google Agenda quando conectado</label></section>
            </form>

            <div className="p-4 border-t border-slate-200 bg-white flex items-center justify-between gap-3">
              {editingEvent && !editingProtectedHistory ? <button type="button" onClick={() => handleDelete(editingEvent.id)} className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 border border-red-200 font-bold text-xs">Excluir evento avulso</button> : <div className="text-[10px] text-slate-400">{editingProtectedHistory ? 'Vínculo com caso preservado no histórico.' : ''}</div>}
              <div className="flex gap-2"><button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancelar</button><button type="submit" form="agenda-event-form" className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-white font-bold text-xs">{editingEvent ? 'Salvar alterações' : 'Salvar na Agenda'}</button></div>
            </div>
          </div>
        </div>
      )}

      {deletingEventId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs"><div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 text-center"><div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto"><span className="material-symbols-outlined text-3xl">delete_forever</span></div><div><h3 className="font-extrabold text-slate-900 text-lg">Excluir compromisso avulso</h3><p className="text-xs text-slate-500 mt-1">Somente eventos sem vínculo com caso podem ser removidos fisicamente.</p></div><div className="flex gap-3"><button type="button" onClick={() => setDeletingEventId(null)} className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold text-xs">Cancelar</button><button type="button" onClick={async () => { const target = events.find((event) => event.id === deletingEventId); if (target?.caseId) { setDeletingEventId(null); return; } if (target?.googleEventId && googleAccessToken) { try { await deleteScheduledEventFromGoogle(target.googleEventId, googleAccessToken); } catch (error) { console.error('Erro ao excluir no Google Agenda:', error); } } onDeleteEvent?.(deletingEventId); if (editingEvent?.id === deletingEventId) setModalOpen(false); setDeletingEventId(null); }} className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs">Excluir</button></div></div></div>
      )}
    </main>
  );
};

const MetricButton = ({ label, value, active, tone, onClick }: { label: string; value: number; active: boolean; tone: 'red' | 'amber' | 'blue' | 'slate'; onClick: () => void }) => {
  const styles = {
    red: active ? 'bg-red-100 border-red-300 text-red-950' : 'bg-red-50 border-red-200 text-red-950',
    amber: active ? 'bg-amber-100 border-amber-300 text-amber-950' : 'bg-amber-50 border-amber-200 text-amber-950',
    blue: active ? 'bg-blue-100 border-blue-300 text-blue-950' : 'bg-blue-50 border-blue-200 text-blue-950',
    slate: active ? 'bg-slate-200 border-slate-300 text-slate-950' : 'bg-slate-100 border-slate-200 text-slate-950',
  };
  return <button type="button" onClick={onClick} className={`text-left rounded-2xl border p-3.5 transition-all ${styles[tone]}`}><div className="text-[10px] uppercase tracking-wider font-extrabold opacity-70">{label}</div><div className="text-2xl font-black mt-1">{value}</div></button>;
};

const ReadField = ({ label, value, onChange, readOnly }: { label: string; value: string; onChange: (value: string) => void; readOnly: boolean }) => <div><label className="block font-bold text-slate-700 mb-1">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} readOnly={readOnly} className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 read-only:bg-slate-100" /></div>;
