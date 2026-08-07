import React, { useState } from 'react';
import { ScheduledEvent, LegalCase, Client } from '../types';
import { getBrasiliaISO, getBrasiliaFormatted, formatToPtBR, getUrgencyInfo, getDaysRemaining } from '../utils/dateUtils';

interface CalendarViewProps {
  events: ScheduledEvent[];
  cases?: LegalCase[];
  clients?: Client[];
  searchQuery: string;
  onAddEvent: (event: ScheduledEvent) => void;
  onUpdateEvent?: (event: ScheduledEvent) => void;
  onDeleteEvent?: (eventId: string) => void;
}

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

export const CalendarView: React.FC<CalendarViewProps> = ({
  events,
  cases = [],
  clients = [],
  searchQuery,
  onAddEvent,
  onUpdateEvent,
  onDeleteEvent,
}) => {
  const [viewMode, setViewMode] = useState<'list' | 'calendar'>('list');
  const [selectedDayFilter, setSelectedDayFilter] = useState<string | null>(null);

  // Filters
  const [filterType, setFilterType] = useState<string>('todos');
  const [filterStatus, setFilterStatus] = useState<string>('todos');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<ScheduledEvent | null>(null);
  const [deletingEventId, setDeletingEventId] = useState<string | null>(null);

  // Form State
  const [formCaseId, setFormCaseId] = useState('');
  const [formClientName, setFormClientName] = useState('');
  const [formBenefitType, setFormBenefitType] = useState('');
  const [formProcessNumber, setFormProcessNumber] = useState('');

  const [formEventType, setFormEventType] = useState<string>('Perícia Médica');
  const [formTitle, setFormTitle] = useState('');
  const [formFullDate, setFormFullDate] = useState(getBrasiliaISO());
  const [formTime, setFormTime] = useState('14:00');
  const [formLocation, setFormLocation] = useState('');

  const [formStatus, setFormStatus] = useState<'Pendente' | 'Concluído' | 'Remarcado' | 'Perdido'>('Pendente');
  const [formPriorityLevel, setFormPriorityLevel] = useState<'auto' | 'urgente' | 'atencao' | 'normal'>('auto');

  const [formNotes, setFormNotes] = useState('');
  const [formReminderDays, setFormReminderDays] = useState<number>(3);

  // Quick Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingEvent(null);
    setFormCaseId('');
    setFormClientName('');
    setFormBenefitType('');
    setFormProcessNumber('');
    setFormEventType('Perícia Médica');
    setFormTitle('');
    setFormFullDate(getBrasiliaISO());
    setFormTime('14:00');
    setFormLocation('');
    setFormStatus('Pendente');
    setFormPriorityLevel('auto');
    setFormNotes('');
    setFormReminderDays(3);
    setModalOpen(true);
  };

  // Quick Open Edit Modal
  const handleOpenEditModal = (ev: ScheduledEvent, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingEvent(ev);
    setFormCaseId(ev.caseId || '');
    setFormClientName(ev.clientName || '');
    setFormBenefitType(ev.benefitType || '');
    setFormProcessNumber(ev.processNumber || '');
    setFormEventType(ev.eventType || 'Perícia Médica');
    setFormTitle(ev.title);
    setFormFullDate(ev.fullDate || getBrasiliaISO());
    setFormTime(ev.time || '');
    setFormLocation(ev.location || '');
    setFormStatus(ev.status || 'Pendente');
    setFormPriorityLevel(ev.priorityLevel || 'auto');
    setFormNotes(ev.notes || '');
    setFormReminderDays(ev.reminderDays !== undefined ? ev.reminderDays : 3);
    setModalOpen(true);
  };

  // Case Selection Change in Form -> Auto-fills client, benefit, process
  const handleCaseSelectChange = (caseId: string) => {
    setFormCaseId(caseId);
    if (!caseId) return;

    const selectedCase = cases.find((c) => c.id === caseId);
    if (selectedCase) {
      setFormClientName(selectedCase.clientName);
      setFormBenefitType(selectedCase.benefitType || selectedCase.category);
      setFormProcessNumber(selectedCase.processNumber || selectedCase.caseNumber);
      if (!formTitle) {
        setFormTitle(`${formEventType} - ${selectedCase.clientName}`);
      }
    }
  };

  // Event Type Change -> updates default title if title is empty or matching pattern
  const handleEventTypeChange = (newType: string) => {
    setFormEventType(newType);
    if (formClientName && (!formTitle || formTitle.startsWith(formEventType))) {
      setFormTitle(`${newType} - ${formClientName}`);
    }
  };

  // Form Submit Handler
  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) return;

    // Format date string for badge e.g. "05 AGO"
    let dateStr = '05 AGO';
    if (formFullDate) {
      const [yr, mo, dy] = formFullDate.split('-');
      const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
      const monthIdx = parseInt(mo, 10) - 1;
      dateStr = `${dy} ${monthNames[monthIdx] || 'AGO'}`;
    }

    // Determine high level category badge
    let categoryType = 'Audiências & Perícias';
    let badgeColor = 'pericia';
    if (formEventType.includes('Recurso') || formEventType.includes('Contestação') || formEventType.includes('Exigência')) {
      categoryType = 'Prazos Fatais (Recursos)';
      badgeColor = 'recurso';
    } else if (formEventType.includes('Reunião')) {
      categoryType = 'Reuniões Internas';
      badgeColor = 'reuniao';
    }

    const savedEvent: ScheduledEvent = {
      id: editingEvent ? editingEvent.id : `ev-${Date.now()}`,
      dateStr,
      fullDate: formFullDate,
      time: formTime,
      type: categoryType,
      badgeColor,
      title: formTitle.trim(),

      // 1. Vinculação
      caseId: formCaseId || undefined,
      clientName: formClientName.trim() || undefined,
      benefitType: formBenefitType.trim() || undefined,
      processNumber: formProcessNumber.trim() || undefined,

      // 2. Dados do evento
      eventType: formEventType,
      location: formLocation.trim() || undefined,

      // 3. Urgência / Controle
      status: formStatus,
      priorityLevel: formPriorityLevel === 'auto' ? undefined : formPriorityLevel,

      // 4. Complementares
      notes: formNotes.trim() || undefined,
      reminderDays: formReminderDays,
    };

    if (editingEvent && onUpdateEvent) {
      onUpdateEvent(savedEvent);
    } else {
      onAddEvent(savedEvent);
    }

    setModalOpen(false);
  };

  // Quick Status Toggle Handler
  const handleQuickStatusChange = (ev: ScheduledEvent, newStatus: 'Pendente' | 'Concluído' | 'Remarcado' | 'Perdido', e: React.MouseEvent) => {
    e.stopPropagation();
    if (onUpdateEvent) {
      onUpdateEvent({
        ...ev,
        status: newStatus,
      });
    }
  };

  // Delete Handler
  const handleDelete = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setDeletingEventId(eventId);
  };

  // Filtering Logic
  const filteredEvents = events.filter((ev) => {
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      ev.title.toLowerCase().includes(query) ||
      (ev.clientName && ev.clientName.toLowerCase().includes(query)) ||
      (ev.processNumber && ev.processNumber.toLowerCase().includes(query)) ||
      (ev.location && ev.location.toLowerCase().includes(query)) ||
      (ev.benefitType && ev.benefitType.toLowerCase().includes(query));

    const matchesType = filterType === 'todos' || ev.eventType === filterType || ev.type === filterType;
    const matchesStatus = filterStatus === 'todos' || ev.status === filterStatus;
    const matchesDay = !selectedDayFilter || ev.fullDate === selectedDayFilter;

    return matchesSearch && matchesType && matchesStatus && matchesDay;
  });

  // Calculate Urgent / Attention Stats
  const urgentCount = events.filter((e) => {
    const u = getUrgencyInfo(e.fullDate, e.status, e.priorityLevel);
    return u.level === 'urgente';
  }).length;

  const attentionCount = events.filter((e) => {
    const u = getUrgencyInfo(e.fullDate, e.status, e.priorityLevel);
    return u.level === 'atencao';
  }).length;

  const completedCount = events.filter((e) => e.status === 'Concluído').length;
  const pendingCount = events.filter((e) => e.status === 'Pendente').length;

  return (
    <main className="md:ml-64 pt-24 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-end justify-between pb-2 border-b border-slate-200/60 gap-4">
        <div>
          <h1 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight mb-1">
            Prazos & Agenda
          </h1>
          <p className="text-slate-600 text-sm">
            Acompanhamento de perícias, audiências, prazos recursais e exigências com alerta visual de proximidade.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          {/* List / Calendar Toggle */}
          <div className="bg-white p-1 rounded-xl flex items-center border border-slate-300 shadow-xs">
            <button
              onClick={() => setViewMode('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'list' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Lista
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                viewMode === 'calendar' ? 'bg-blue-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Calendário
            </button>
          </div>

          <button
            onClick={handleOpenCreateModal}
            className="glass-btn-primary px-4 py-2.5 rounded-xl text-white font-semibold text-xs md:text-sm flex items-center space-x-2 shadow-xs transition-all hover:scale-[1.02]"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            <span>Novo Evento / Prazo</span>
          </button>
        </div>
      </div>

      {/* Visual Proximity Summary Banner */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-red-50/90 border border-red-200 p-3.5 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 text-red-700 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">warning</span>
          </div>
          <div>
            <p className="text-xs font-bold text-red-800">Urgentes (&lt; 3 dias)</p>
            <p className="text-lg font-extrabold text-red-950">{urgentCount} compromissos</p>
          </div>
        </div>

        <div className="bg-amber-50/90 border border-amber-200 p-3.5 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">schedule</span>
          </div>
          <div>
            <p className="text-xs font-bold text-amber-900">Atenção (&lt; 7 dias)</p>
            <p className="text-lg font-extrabold text-amber-950">{attentionCount} compromissos</p>
          </div>
        </div>

        <div className="bg-blue-50/90 border border-blue-200 p-3.5 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-900 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">pending_actions</span>
          </div>
          <div>
            <p className="text-xs font-bold text-blue-900">Pendentes Totais</p>
            <p className="text-lg font-extrabold text-blue-950">{pendingCount} na fila</p>
          </div>
        </div>

        <div className="bg-emerald-50/90 border border-emerald-200 p-3.5 rounded-2xl flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined">check_circle</span>
          </div>
          <div>
            <p className="text-xs font-bold text-emerald-900">Concluídos</p>
            <p className="text-lg font-extrabold text-emerald-950">{completedCount} finalizados</p>
          </div>
        </div>
      </div>

      {/* Main Grid: Event List + Calendar Widget Sidebar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Scheduled List */}
        <div className="lg:col-span-8 space-y-4">
          {/* Active Filter Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center space-x-2 overflow-x-auto pb-1 md:pb-0">
              <span className="font-bold text-slate-500 whitespace-nowrap">Filtrar por tipo:</span>
              <button
                onClick={() => setFilterType('todos')}
                className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                  filterType === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>
              {EVENT_TYPES.slice(0, 5).map((type) => (
                <button
                  key={type}
                  onClick={() => setFilterType(type)}
                  className={`px-3 py-1 rounded-lg font-bold transition-all whitespace-nowrap ${
                    filterType === type ? 'bg-blue-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>

            {selectedDayFilter && (
              <button
                onClick={() => setSelectedDayFilter(null)}
                className="text-xs font-bold text-blue-900 hover:underline flex items-center space-x-1"
              >
                <span className="material-symbols-outlined text-sm">filter_alt_off</span>
                <span>Limpar filtro por data</span>
              </button>
            )}
          </div>

          {/* List of Events */}
          {filteredEvents.map((ev) => {
            const urgency = getUrgencyInfo(ev.fullDate, ev.status, ev.priorityLevel);

            return (
              <div
                key={ev.id}
                onClick={(e) => handleOpenEditModal(ev, e)}
                className={`glass-panel rounded-2xl p-5 bg-white border border-slate-200/90 shadow-2xs hover:shadow-md transition-all cursor-pointer group relative overflow-hidden ${
                  ev.status === 'Concluído' ? 'opacity-85 bg-slate-50/50' : ''
                }`}
              >
                {/* Proximity Color Bar on the Left Edge */}
                <div
                  className={`absolute top-0 left-0 bottom-0 w-1.5 ${
                    urgency.level === 'urgente'
                      ? 'bg-red-600'
                      : urgency.level === 'atencao'
                      ? 'bg-amber-500'
                      : urgency.level === 'concluido'
                      ? 'bg-blue-600'
                      : 'bg-emerald-500'
                  }`}
                />

                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pl-1">
                  <div className="flex items-start space-x-4">
                    {/* Date Badge */}
                    <div
                      className={`w-16 h-16 rounded-xl border flex flex-col items-center justify-center shrink-0 shadow-2xs ${
                        urgency.level === 'urgente'
                          ? 'bg-red-50 border-red-200 text-red-900'
                          : urgency.level === 'atencao'
                          ? 'bg-amber-50 border-amber-200 text-amber-900'
                          : 'bg-slate-100 border-slate-200 text-slate-900'
                      }`}
                    >
                      <span className="text-[10px] uppercase font-bold opacity-75">{ev.dateStr.split(' ')[1] || 'AGO'}</span>
                      <span className="text-xl font-extrabold">{ev.dateStr.split(' ')[0] || '05'}</span>
                    </div>

                    <div className="space-y-1.5">
                      {/* Top Chips */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Event Type Chip */}
                        <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-900 border border-blue-200/80">
                          {ev.eventType || ev.type}
                        </span>

                        {/* Proximity / Status Visual Alert Chip */}
                        <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border flex items-center gap-1 ${urgency.bgClass}`}>
                          <span className={`w-2 h-2 rounded-full ${urgency.dotClass}`} />
                          <span>{urgency.daysText}</span>
                        </span>

                        {/* Status Chip */}
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            ev.status === 'Concluído'
                              ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                              : ev.status === 'Perdido'
                              ? 'bg-red-100 text-red-900 border-red-300'
                              : ev.status === 'Remarcado'
                              ? 'bg-purple-100 text-purple-900 border-purple-300'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          {ev.status || 'Pendente'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-title-md text-base font-bold text-slate-900 group-hover:text-blue-900 transition-colors flex items-center space-x-2">
                        <span>{ev.title}</span>
                      </h3>

                      {/* Vinculação Details (Client + Benefit + Process) */}
                      {(ev.clientName || ev.benefitType || ev.processNumber) && (
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-600 font-medium">
                          {ev.clientName && (
                            <span className="flex items-center gap-1 font-bold text-slate-800">
                              <span className="material-symbols-outlined text-sm text-slate-400">person</span>
                              {ev.clientName}
                            </span>
                          )}
                          {ev.benefitType && (
                            <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md font-semibold text-[11px]">
                              {ev.benefitType}
                            </span>
                          )}
                          {ev.processNumber && (
                            <span className="text-slate-500 font-mono text-[11px]">
                              Proc: {ev.processNumber}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Event Details: Time + Location */}
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500 font-medium pt-0.5">
                        {ev.time && (
                          <span className="flex items-center gap-1 font-semibold text-slate-700">
                            <span className="material-symbols-outlined text-sm text-blue-900">schedule</span>
                            Horário: {ev.time}
                          </span>
                        )}
                        {ev.location && (
                          <span className="flex items-center gap-1 text-slate-600">
                            <span className="material-symbols-outlined text-sm text-slate-400">location_on</span>
                            {ev.location}
                          </span>
                        )}
                        {ev.reminderDays !== undefined && (
                          <span className="flex items-center gap-1 text-amber-800 font-semibold bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60 text-[11px]">
                            <span className="material-symbols-outlined text-sm text-amber-600">notifications_active</span>
                            Lembrete {ev.reminderDays}d antes
                          </span>
                        )}
                      </div>

                      {/* Notes Preview */}
                      {ev.notes && (
                        <p className="text-xs text-slate-600 italic bg-slate-50/80 p-2 rounded-xl border border-slate-200/60 mt-1">
                          "{ev.notes}"
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Actions & Quick Status Switch */}
                  <div className="flex items-center space-x-2 shrink-0 self-end sm:self-center pt-2 sm:pt-0">
                    {/* Quick Status Buttons */}
                    {ev.status !== 'Concluído' ? (
                      <button
                        title="Marcar como Concluído"
                        onClick={(e) => handleQuickStatusChange(ev, 'Concluído', e)}
                        className="px-2.5 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 text-xs font-bold flex items-center space-x-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">check</span>
                        <span>Concluir</span>
                      </button>
                    ) : (
                      <button
                        title="Reabrir / Voltar para Pendente"
                        onClick={(e) => handleQuickStatusChange(ev, 'Pendente', e)}
                        className="px-2.5 py-1.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300 text-xs font-bold flex items-center space-x-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">undo</span>
                        <span>Reabrir</span>
                      </button>
                    )}

                    {/* Edit Button */}
                    <button
                      title="Editar Evento"
                      onClick={(e) => handleOpenEditModal(ev, e)}
                      className="p-2 rounded-xl text-slate-500 hover:text-blue-900 hover:bg-blue-50 border border-transparent hover:border-blue-200 transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">edit</span>
                    </button>

                    {/* Delete Button */}
                    <button
                      title="Excluir Evento"
                      onClick={(e) => handleDelete(ev.id, e)}
                      className="p-2 rounded-xl text-slate-400 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all"
                    >
                      <span className="material-symbols-outlined text-lg">delete</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredEvents.length === 0 && (
            <div className="bg-white rounded-2xl p-12 text-center text-slate-500 border border-slate-200 shadow-2xs space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                <span className="material-symbols-outlined text-2xl">event_busy</span>
              </div>
              <p className="font-bold text-slate-800 text-base">Nenhum compromisso ou prazo encontrado.</p>
              <p className="text-xs text-slate-500">Tente ajustar os filtros ou agende um novo evento.</p>
              <button
                onClick={handleOpenCreateModal}
                className="glass-btn-primary px-4 py-2 rounded-xl text-white font-bold text-xs"
              >
                Agendar Novo Evento
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Calendar Widget & Filters */}
        <div className="lg:col-span-4 space-y-6">
          {/* Calendar Widget (August 2026 - Official Brasilia Context) */}
          <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-2xs">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-title-md font-extrabold text-slate-900 text-sm flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-900 text-lg">calendar_month</span>
                <span>Agosto 2026</span>
              </h3>
              <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                Fuso Brasília
              </span>
            </div>

            {/* Weekdays header */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
              <span>D</span>
              <span>S</span>
              <span>T</span>
              <span>Q</span>
              <span>Q</span>
              <span>S</span>
              <span>S</span>
            </div>

            {/* Days grid for August 2026 (Starts on Saturday, Aug 1) */}
            <div className="grid grid-cols-7 gap-1 text-center text-xs font-semibold text-slate-700">
              {/* Offset for Aug 1 being Saturday */}
              <span className="p-2 text-slate-300">26</span>
              <span className="p-2 text-slate-300">27</span>
              <span className="p-2 text-slate-300">28</span>
              <span className="p-2 text-slate-300">29</span>
              <span className="p-2 text-slate-300">30</span>
              <span className="p-2 text-slate-300">31</span>

              {/* Days 1 to 31 */}
              {Array.from({ length: 31 }, (_, i) => {
                const dayNum = i + 1;
                const formattedDay = dayNum < 10 ? `0${dayNum}` : `${dayNum}`;
                const isoDate = `2026-08-${formattedDay}`;

                // Find events on this day
                const dayEvents = events.filter((e) => e.fullDate === isoDate);
                const hasUrgent = dayEvents.some((e) => getUrgencyInfo(e.fullDate, e.status, e.priorityLevel).level === 'urgente');
                const hasAttention = dayEvents.some((e) => getUrgencyInfo(e.fullDate, e.status, e.priorityLevel).level === 'atencao');
                const hasNormal = dayEvents.length > 0;

                const isSelected = selectedDayFilter === isoDate;
                const isToday = isoDate === getBrasiliaISO();

                return (
                  <button
                    key={dayNum}
                    onClick={() => {
                      if (selectedDayFilter === isoDate) {
                        setSelectedDayFilter(null);
                      } else {
                        setSelectedDayFilter(isoDate);
                      }
                    }}
                    className={`p-2 rounded-xl cursor-pointer relative transition-all text-xs font-bold ${
                      isSelected
                        ? 'bg-blue-900 text-white shadow-xs scale-105'
                        : isToday
                        ? 'bg-blue-100 text-blue-950 border border-blue-300'
                        : 'hover:bg-slate-100 text-slate-800'
                    }`}
                  >
                    <span>{dayNum}</span>

                    {/* Color dot for events */}
                    {dayEvents.length > 0 && (
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex space-x-0.5">
                        {hasUrgent ? (
                          <span className="w-1.5 h-1.5 bg-red-600 rounded-full" />
                        ) : hasAttention ? (
                          <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        ) : (
                          <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                        )}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between font-medium">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-red-600" /> &lt; 3d Urgentes
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-amber-500" /> &lt; 7d Atenção
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500" /> ≥ 7d No prazo
              </span>
            </div>
          </div>

          {/* Quick Filters Box */}
          <div className="glass-panel rounded-2xl p-6 bg-white border border-slate-200/90 shadow-2xs space-y-4">
            <h3 className="font-title-md font-bold text-slate-900 text-sm">
              Filtro por Situação
            </h3>

            <div className="space-y-2 text-xs">
              {[
                { label: 'Todos os Status', value: 'todos' },
                { label: 'Somente Pendentes', value: 'Pendente' },
                { label: 'Concluídos', value: 'Concluído' },
                { label: 'Remarcados', value: 'Remarcado' },
                { label: 'Prazo Perdido', value: 'Perdido' },
              ].map((st) => (
                <label
                  key={st.value}
                  className="flex items-center space-x-3 cursor-pointer text-slate-700 hover:text-slate-900 font-semibold p-1.5 rounded-xl hover:bg-slate-50 transition-colors"
                >
                  <input
                    type="radio"
                    name="filterStatusRadio"
                    checked={filterStatus === st.value}
                    onChange={() => setFilterStatus(st.value)}
                    className="w-4 h-4 text-blue-900 focus:ring-blue-900 border-slate-300"
                  />
                  <span>{st.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* CREATE / EDIT EVENT MODAL */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl p-6 md:p-8 border border-slate-200 shadow-2xl relative my-auto max-h-[90vh] flex flex-col overflow-hidden text-left">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors z-10"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="mb-4 pr-8">
              <h3 className="font-display-lg text-xl font-extrabold text-slate-900 mb-1 flex items-center space-x-2">
                <span className="material-symbols-outlined text-blue-900">
                  {editingEvent ? 'edit_calendar' : 'event'}
                </span>
                <span>{editingEvent ? 'Editar Evento / Prazo' : 'Cadastrar Novo Evento'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                Preencha os dados de vinculação ao caso, informações do compromisso e níveis de urgência para o alerta visual.
              </p>
            </div>

            <form onSubmit={handleSaveEvent} className="space-y-5 text-xs overflow-y-auto pr-1 pb-2 flex-1">
              {/* SECTION 1: VINCULAÇÃO */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">link</span>
                  <span>1. Vinculação de Cliente e Caso</span>
                </h4>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Caso / Processo Vinculado <span className="text-slate-400 font-normal">(Puxa dados automaticamente)</span>
                  </label>
                  <select
                    value={formCaseId}
                    onChange={(e) => handleCaseSelectChange(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="">-- Sem caso vinculado (Evento Avulso / Reunião) --</option>
                    {cases.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.clientName} - {c.benefitType || c.category} ({c.processNumber || c.caseNumber})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nome do Cliente</label>
                    <input
                      type="text"
                      value={formClientName}
                      onChange={(e) => setFormClientName(e.target.value)}
                      placeholder="Ex: João Silva e Oliveira"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Benefício / Ação</label>
                    <input
                      type="text"
                      value={formBenefitType}
                      onChange={(e) => setFormBenefitType(e.target.value)}
                      placeholder="Ex: BPC/LOAS, Auxílio Doença"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Nº do Processo / Protocolo</label>
                    <input
                      type="text"
                      value={formProcessNumber}
                      onChange={(e) => setFormProcessNumber(e.target.value)}
                      placeholder="Ex: 5001234-56.2026.4.01.3200"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: DADOS DO EVENTO */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">event_note</span>
                  <span>2. Dados do Evento</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Evento</label>
                    <select
                      value={formEventType}
                      onChange={(e) => handleEventTypeChange(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      {EVENT_TYPES.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Título do Evento</label>
                    <input
                      type="text"
                      required
                      value={formTitle}
                      onChange={(e) => setFormTitle(e.target.value)}
                      placeholder="Ex: Perícia Médica Presencial - INSS Parnaíba"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data do Evento</label>
                    <input
                      type="date"
                      required
                      value={formFullDate}
                      onChange={(e) => setFormFullDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Horário (Opcional)</label>
                    <input
                      type="time"
                      value={formTime}
                      onChange={(e) => setFormTime(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Local / Endereço / Link</label>
                    <input
                      type="text"
                      value={formLocation}
                      onChange={(e) => setFormLocation(e.target.value)}
                      placeholder="Ex: APS Parnaíba, 1ª Vara, ou Online"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: URGÊNCIA E CONTROLE */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">alarm</span>
                  <span>3. Urgência & Controle de Status</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status do Evento</label>
                    <select
                      value={formStatus}
                      onChange={(e: any) => setFormStatus(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Concluído">Concluído</option>
                      <option value="Remarcado">Remarcado</option>
                      <option value="Perdido">Prazo Perdido</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Prioridade / Nível Visual</label>
                    <select
                      value={formPriorityLevel}
                      onChange={(e: any) => setFormPriorityLevel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value="auto">Automático (&lt; 3d Vermelho, &lt; 7d Amarelo, Verde resto)</option>
                      <option value="urgente">Forçar Urgente (Vermelho)</option>
                      <option value="atencao">Forçar Atenção (Amarelo)</option>
                      <option value="normal">Forçar Normal (Verde)</option>
                    </select>
                  </div>
                </div>

                {/* Preview Banner of Calculated Alert */}
                {formFullDate && (
                  <div className="pt-1">
                    {(() => {
                      const computed = getUrgencyInfo(formFullDate, formStatus, formPriorityLevel === 'auto' ? undefined : formPriorityLevel);
                      return (
                        <div className={`p-3 rounded-xl border flex items-center justify-between font-bold ${computed.bgClass}`}>
                          <span className="flex items-center space-x-2">
                            <span className={`w-3 h-3 rounded-full ${computed.dotClass}`} />
                            <span>Alerta Visual do Calendário: {computed.label}</span>
                          </span>
                          <span className="text-xs opacity-90">{computed.daysText}</span>
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* SECTION 4: COMPLEMENTARES */}
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/90 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs uppercase tracking-wider text-blue-900 flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base">notes</span>
                  <span>4. Informações Complementares</span>
                </h4>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Observação / Nota Rápida</label>
                    <textarea
                      rows={2}
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      placeholder="Ex: Levar laudo médico original com CID e RG do cliente."
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Lembrete Antecipado</label>
                    <select
                      value={formReminderDays}
                      onChange={(e) => setFormReminderDays(Number(e.target.value))}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                    >
                      <option value={0}>No próprio dia</option>
                      <option value={1}>1 dia antes</option>
                      <option value={2}>2 dias antes</option>
                      <option value={3}>3 dias antes</option>
                      <option value={5}>5 dias antes</option>
                      <option value={7}>7 dias antes</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>

            {/* MODAL FOOTER */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3 mt-2 shrink-0">
              {editingEvent ? (
                <button
                  type="button"
                  onClick={() => handleDelete(editingEvent.id)}
                  className="px-4 py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 font-bold text-xs flex items-center space-x-1.5 transition-colors"
                >
                  <span className="material-symbols-outlined text-sm">delete</span>
                  <span>Excluir Evento</span>
                </button>
              ) : (
                <div />
              )}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold transition-colors text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSaveEvent}
                  className="glass-btn-primary px-6 py-2.5 rounded-xl text-white font-bold transition-all shadow-md text-xs"
                >
                  {editingEvent ? 'Salvar Alterações' : 'Salvar na Agenda'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deletingEventId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 border border-slate-200 shadow-2xl space-y-4 text-center relative">
            <div className="w-14 h-14 rounded-2xl bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <span className="material-symbols-outlined text-3xl">delete_forever</span>
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg">Excluir Compromisso</h3>
              <p className="text-xs text-slate-500 mt-1">
                Tem certeza que deseja excluir este compromisso da agenda? Esta ação removerá o evento do histórico.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEventId(null)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 hover:bg-slate-200 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteEvent) {
                    onDeleteEvent(deletingEventId);
                  }
                  if (editingEvent && editingEvent.id === deletingEventId) {
                    setModalOpen(false);
                  }
                  setDeletingEventId(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition-colors shadow-md"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
