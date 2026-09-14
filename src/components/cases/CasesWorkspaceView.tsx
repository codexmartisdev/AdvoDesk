import React, { useEffect, useMemo, useState } from 'react';
import { Client, DocumentTemplate, FirmSettings, LegalCase, ScheduledEvent } from '../../types';
import { GeneratedDocument } from '../../types/generatedDocument';
import { auth } from '../../lib/firebase';
import {
  getUserProfileInFirestore,
  saveCaseInFirestore,
  saveEventInFirestore,
  subscribeToCases,
  subscribeToClients,
  subscribeToEvents,
  subscribeToSettings,
  subscribeToTemplates,
} from '../../services/firestoreService';
import { saveGeneratedDocumentInFirestore } from '../../services/generatedDocumentService';
import { getBrasiliaISO } from '../../utils/dateUtils';
import { onlyDigits } from '../../utils/clientDataUtils';
import { replaceVariablesInTemplateText } from '../../utils/documentReplacer';
import { replaceCaseVariablesInText } from '../../utils/caseDocumentVariables';
import { DocumentGeneratorModal } from '../DocumentGeneratorModal';

interface CasesWorkspaceViewProps {
  searchQuery?: string;
}

type LifecycleFilter = 'active' | 'archived';
type DeadlineStatus = ScheduledEvent['status'];
type OperationalCase = LegalCase & {
  archivedAt?: string;
  statusBeforeArchive?: string;
  createdAt?: string;
  updatedAt?: string;
  deadlineEventsMigratedAt?: string;
};

type CaseFormState = {
  clientId: string;
  title: string;
  category: string;
  actingType: string;
  processNumber: string;
  agencyOrCourt: string;
  statusLabel: string;
  priority: string;
  openingDate: string;
  filingDate: string;
  caseFacts: string;
  quickNotes: string;
};

type DeadlineFormState = {
  eventType: string;
  title: string;
  fullDate: string;
  time: string;
  location: string;
  notes: string;
};

const STATUS_OPTIONS = [
  'Triagem',
  'Documentação pendente',
  'Protocolado',
  'Em análise',
  'Exigência',
  'Audiência / Perícia',
  'Em recurso',
  'Fase judicial',
  'Aguardando cliente',
  'Concluído',
];

const ACTING_OPTIONS = [
  'A definir',
  'Administrativo',
  'Judicial',
  'Administrativo + Judicial',
  'Consultivo',
  'Extrajudicial',
];

const PRIORITY_OPTIONS = ['Baixa', 'Normal', 'Alta', 'Urgente'];

const DEADLINE_TYPES = [
  'Prazo de Recurso',
  'Retorno de Exigência',
  'Prazo de Contestação',
  'Audiência',
  'Perícia Médica',
  'Perícia Social',
  'Reunião com Cliente',
  'Outro',
];

const normalizeText = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();

const normalizeProcessNumber = (value: string) => value.replace(/[^a-zA-Z0-9]/g, '').toLowerCase();
const today = () => getBrasiliaISO().slice(0, 10);

const formatDate = (value?: string) => {
  if (!value) return '—';
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

const formatDateBadge = (value: string) => {
  const [, month = '', day = ''] = value.split('-');
  const monthNames = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
  const monthIndex = Math.max(0, Number(month) - 1);
  return `${day || '—'} ${monthNames[monthIndex] || '—'}`;
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

const sortEvents = (items: ScheduledEvent[]) =>
  [...items].sort((a, b) => {
    const dateCompare = (a.fullDate || '').localeCompare(b.fullDate || '');
    if (dateCompare !== 0) return dateCompare;
    return (a.time || '').localeCompare(b.time || '');
  });

const getPendingCaseEvents = (caseId: string, events: ScheduledEvent[]) =>
  sortEvents(events.filter((event) => event.caseId === caseId && event.status === 'Pendente'));

const getCaseEventSummary = (caseId: string, events: ScheduledEvent[]) => {
  const pending = getPendingCaseEvents(caseId, events);
  const next = pending[0];
  return {
    nextDeadlineDate: next?.fullDate || undefined,
    nextDeadlineType: next?.eventType || next?.title || undefined,
    deadlinesCount: pending.length,
  };
};

const createCaseId = () => {
  const rawId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  const compact = rawId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  return { id: `case-${rawId}`, caseNumber: `CASO-${compact.slice(-8)}` };
};

const emptyCaseForm = (category = 'Geral'): CaseFormState => ({
  clientId: '',
  title: '',
  category,
  actingType: 'A definir',
  processNumber: '',
  agencyOrCourt: '',
  statusLabel: 'Triagem',
  priority: 'Normal',
  openingDate: today(),
  filingDate: '',
  caseFacts: '',
  quickNotes: '',
});

const formFromCase = (legalCase: LegalCase): CaseFormState => ({
  clientId: legalCase.clientId,
  title: legalCase.title || '',
  category: legalCase.category || 'Geral',
  actingType: legalCase.actingType || legalCase.instance || 'A definir',
  processNumber: legalCase.processNumber || '',
  agencyOrCourt: legalCase.agencyOrCourt || legalCase.court || '',
  statusLabel: legalCase.statusLabel || 'Triagem',
  priority: legalCase.priority || 'Normal',
  openingDate: legalCase.openingDate || legalCase.openedAt || '',
  filingDate: legalCase.filingDate || '',
  caseFacts: legalCase.caseFacts || '',
  quickNotes: legalCase.quickNotes || '',
});

const emptyDeadlineForm = (legalCase?: LegalCase): DeadlineFormState => ({
  eventType: 'Prazo de Recurso',
  title: legalCase ? `Prazo de Recurso — ${legalCase.clientName}` : '',
  fullDate: today(),
  time: '',
  location: legalCase?.agencyOrCourt || legalCase?.court || '',
  notes: '',
});

const priorityClass = (priority?: string) => {
  if (priority === 'Urgente') return 'bg-red-50 text-red-700 border-red-200';
  if (priority === 'Alta') return 'bg-amber-50 text-amber-800 border-amber-200';
  if (priority === 'Baixa') return 'bg-slate-50 text-slate-600 border-slate-200';
  return 'bg-blue-50 text-blue-800 border-blue-200';
};

const statusClass = (status: DeadlineStatus) => {
  if (status === 'Concluído') return 'bg-emerald-50 text-emerald-800 border-emerald-200';
  if (status === 'Perdido') return 'bg-red-50 text-red-800 border-red-200';
  if (status === 'Remarcado') return 'bg-purple-50 text-purple-800 border-purple-200';
  return 'bg-amber-50 text-amber-800 border-amber-200';
};

export const CasesWorkspaceView: React.FC<CasesWorkspaceViewProps> = ({ searchQuery = '' }) => {
  const [cases, setCases] = useState<OperationalCase[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [events, setEvents] = useState<ScheduledEvent[]>([]);
  const [eventsLoaded, setEventsLoaded] = useState(false);
  const [settings, setSettings] = useState<FirmSettings | undefined>(undefined);
  const [firmId, setFirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [lifecycleFilter, setLifecycleFilter] = useState<LifecycleFilter>('active');
  const [categoryFilter, setCategoryFilter] = useState('Todos');
  const [statusFilter, setStatusFilter] = useState('Todos');
  const [localSearch, setLocalSearch] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CaseFormState>(() => emptyCaseForm());
  const [createError, setCreateError] = useState('');
  const [selectedCase, setSelectedCase] = useState<OperationalCase | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState<CaseFormState>(() => emptyCaseForm());
  const [editError, setEditError] = useState('');
  const [saving, setSaving] = useState(false);

  const [deadlineCase, setDeadlineCase] = useState<OperationalCase | null>(null);
  const [deadlineForm, setDeadlineForm] = useState<DeadlineFormState>(() => emptyDeadlineForm());
  const [deadlineError, setDeadlineError] = useState('');
  const [deadlineSaving, setDeadlineSaving] = useState(false);

  const [documentCase, setDocumentCase] = useState<OperationalCase | null>(null);
  const [documentDraft, setDocumentDraft] = useState<GeneratedDocument | null>(null);
  const [documentTemplate, setDocumentTemplate] = useState<DocumentTemplate | null>(null);
  const [documentPreparing, setDocumentPreparing] = useState(false);

  useEffect(() => {
    let active = true;
    let unsubscribeCases: (() => void) | undefined;
    let unsubscribeClients: (() => void) | undefined;
    let unsubscribeTemplates: (() => void) | undefined;
    let unsubscribeEvents: (() => void) | undefined;
    let unsubscribeSettings: (() => void) | undefined;

    const connect = async () => {
      const currentUser = auth.currentUser;
      if (!currentUser) {
        if (active) {
          setLoadError('Não foi possível identificar o usuário autenticado.');
          setLoading(false);
        }
        return;
      }

      const profile = await getUserProfileInFirestore(currentUser.uid);
      const resolvedFirmId = profile?.firmId?.trim();
      if (!resolvedFirmId || !active) {
        if (active) {
          setLoadError('O usuário autenticado não possui escritório vinculado.');
          setLoading(false);
        }
        return;
      }

      setFirmId(resolvedFirmId);
      unsubscribeCases = subscribeToCases(resolvedFirmId, (items) => {
        if (!active) return;
        setCases(items as OperationalCase[]);
        setLoading(false);
        setLoadError('');
      });
      unsubscribeClients = subscribeToClients(resolvedFirmId, (items) => {
        if (active) setClients(items);
      });
      unsubscribeTemplates = subscribeToTemplates(resolvedFirmId, (items) => {
        if (active) setTemplates(items);
      });
      unsubscribeEvents = subscribeToEvents(resolvedFirmId, (items) => {
        if (!active) return;
        setEvents(items);
        setEventsLoaded(true);
      });
      unsubscribeSettings = subscribeToSettings(resolvedFirmId, (value) => {
        if (active) setSettings(value);
      });
    };

    void connect().catch((error) => {
      console.error('Erro ao carregar carteira de casos:', error);
      if (active) {
        setLoadError('Não foi possível carregar a carteira de casos.');
        setLoading(false);
      }
    });

    return () => {
      active = false;
      unsubscribeCases?.();
      unsubscribeClients?.();
      unsubscribeTemplates?.();
      unsubscribeEvents?.();
      unsubscribeSettings?.();
    };
  }, []);

  useEffect(() => {
    if (!selectedCase) return;
    const current = cases.find((item) => item.id === selectedCase.id);
    if (current) setSelectedCase(current);
  }, [cases, selectedCase?.id]);

  useEffect(() => {
    if (!firmId || !eventsLoaded || cases.length === 0) return;

    const migrateLegacyDeadlines = async () => {
      for (const legalCase of cases) {
        if (legalCase.archivedAt || legalCase.deadlineEventsMigratedAt || !legalCase.nextDeadlineDate) continue;
        const linkedEvents = events.filter((event) => event.caseId === legalCase.id);
        if (linkedEvents.length > 0) continue;

        const eventType = legalCase.nextDeadlineType || 'Outro';
        const presentation = eventPresentation(eventType);
        const legacyEvent: ScheduledEvent = {
          id: `legacy-deadline-${legalCase.id}-${legalCase.nextDeadlineDate}`,
          dateStr: formatDateBadge(legalCase.nextDeadlineDate),
          fullDate: legalCase.nextDeadlineDate,
          type: presentation.type,
          badgeColor: presentation.badgeColor,
          title: `${eventType} — ${legalCase.clientName}`,
          caseId: legalCase.id,
          clientId: legalCase.clientId,
          clientName: legalCase.clientName,
          benefitType: legalCase.category,
          processNumber: legalCase.processNumber || legalCase.caseNumber,
          eventType,
          status: 'Pendente',
          reminderDays: 1,
          reminderOption: '1_day',
          syncedWithGoogleCalendar: false,
          notes: 'Prazo migrado automaticamente da ficha do caso para a Agenda.',
        };
        await saveEventInFirestore(legacyEvent, firmId);
      }
    };

    void migrateLegacyDeadlines();
  }, [cases, events, eventsLoaded, firmId]);

  useEffect(() => {
    if (!firmId || !eventsLoaded || cases.length === 0) return;

    const synchronizeCaseSummaries = async () => {
      const now = getBrasiliaISO();
      const updates: OperationalCase[] = [];

      for (const legalCase of cases) {
        if (legalCase.archivedAt) continue;
        const linkedEvents = events.filter((event) => event.caseId === legalCase.id);
        if (linkedEvents.length === 0 && legalCase.nextDeadlineDate && !legalCase.deadlineEventsMigratedAt) continue;

        const summary = getCaseEventSummary(legalCase.id, events);
        const migratedAt = linkedEvents.length > 0 ? (legalCase.deadlineEventsMigratedAt || now) : legalCase.deadlineEventsMigratedAt;
        const changed =
          (legalCase.nextDeadlineDate || undefined) !== summary.nextDeadlineDate ||
          (legalCase.nextDeadlineType || undefined) !== summary.nextDeadlineType ||
          (legalCase.deadlinesCount || 0) !== summary.deadlinesCount ||
          legalCase.deadlineEventsMigratedAt !== migratedAt;

        if (!changed) continue;
        updates.push({
          ...legalCase,
          nextDeadlineDate: summary.nextDeadlineDate,
          nextDeadlineType: summary.nextDeadlineType,
          deadlinesCount: summary.deadlinesCount,
          deadlineEventsMigratedAt: migratedAt,
          updatedAt: now,
        });
      }

      if (updates.length === 0) return;
      await Promise.all(updates.map((item) => saveCaseInFirestore(item, firmId)));
      setCases((current) => current.map((item) => updates.find((updated) => updated.id === item.id) || item));
    };

    void synchronizeCaseSummaries();
  }, [cases, events, eventsLoaded, firmId]);

  const eligibleClients = useMemo(
    () => clients.filter((client) => String(client.status) !== 'Arquivado'),
    [clients]
  );

  const activeCases = useMemo(() => cases.filter((item) => !item.archivedAt), [cases]);
  const archivedCases = useMemo(() => cases.filter((item) => Boolean(item.archivedAt)), [cases]);

  const categories = useMemo(() => {
    const values = new Set<string>();
    settings?.practiceAreas?.forEach((item) => item?.trim() && values.add(item.trim()));
    cases.forEach((item) => item.category?.trim() && values.add(item.category.trim()));
    if (values.size === 0) values.add('Geral');
    return Array.from(values).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [cases, settings?.practiceAreas]);

  const statuses = useMemo(() => {
    const values = new Set(STATUS_OPTIONS);
    cases.forEach((item) => item.statusLabel?.trim() && values.add(item.statusLabel.trim()));
    return Array.from(values);
  }, [cases]);

  const combinedSearch = normalizeText([searchQuery, localSearch].filter(Boolean).join(' '));
  const searchDigits = onlyDigits([searchQuery, localSearch].filter(Boolean).join(' '));

  const filteredCases = useMemo(() => {
    const base = lifecycleFilter === 'active' ? activeCases : archivedCases;
    return base
      .filter((item) => {
        if (categoryFilter !== 'Todos' && item.category !== categoryFilter) return false;
        if (statusFilter !== 'Todos' && item.statusLabel !== statusFilter) return false;
        if (!combinedSearch && !searchDigits) return true;

        const haystack = normalizeText([
          item.caseNumber,
          item.processNumber,
          item.title,
          item.category,
          item.statusLabel,
          item.clientName,
          item.clientCpf,
          item.agencyOrCourt || item.court,
          item.nextDeadlineType || '',
        ].join(' '));
        const digits = onlyDigits(`${item.processNumber} ${item.clientCpf}`);
        return haystack.includes(combinedSearch) || (searchDigits.length >= 3 && digits.includes(searchDigits));
      })
      .sort((a, b) => {
        const priorityRank: Record<string, number> = { Urgente: 0, Alta: 1, Normal: 2, Baixa: 3 };
        const priorityDiff = (priorityRank[a.priority || 'Normal'] ?? 2) - (priorityRank[b.priority || 'Normal'] ?? 2);
        if (priorityDiff !== 0) return priorityDiff;
        return (b.updatedAt || b.openingDate || '').localeCompare(a.updatedAt || a.openingDate || '');
      });
  }, [activeCases, archivedCases, lifecycleFilter, categoryFilter, statusFilter, combinedSearch, searchDigits]);

  const selectedCaseEvents = useMemo(
    () => selectedCase ? sortEvents(events.filter((event) => event.caseId === selectedCase.id)) : [],
    [events, selectedCase?.id]
  );

  const openCreate = () => {
    setCreateForm(emptyCaseForm(categories[0] || 'Geral'));
    setCreateError('');
    setCreateOpen(true);
  };

  const validateForm = (form: CaseFormState, currentId?: string) => {
    if (!form.clientId) return 'Selecione o cliente vinculado ao caso.';
    if (form.title.trim().length < 3) return 'Informe o objeto do caso com pelo menos 3 caracteres.';
    if (!form.category.trim()) return 'Informe a área jurídica do caso.';
    if (!form.statusLabel.trim()) return 'Informe a situação atual do caso.';

    const normalizedProcess = normalizeProcessNumber(form.processNumber);
    if (normalizedProcess) {
      const duplicate = cases.some((item) =>
        item.id !== currentId &&
        !item.archivedAt &&
        normalizeProcessNumber(item.processNumber) === normalizedProcess
      );
      if (duplicate) return 'Já existe um caso ativo com este número de processo/protocolo.';
    }
    return '';
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!firmId || saving) return;
    const validation = validateForm(createForm);
    if (validation) {
      setCreateError(validation);
      return;
    }

    const client = clients.find((item) => item.id === createForm.clientId);
    if (!client || String(client.status) === 'Arquivado') {
      setCreateError('O cliente selecionado não está disponível para abertura de novo caso.');
      return;
    }

    const identity = createCaseId();
    const now = getBrasiliaISO();
    const legalCase: OperationalCase = {
      id: identity.id,
      caseNumber: identity.caseNumber,
      processNumber: createForm.processNumber.trim(),
      court: createForm.agencyOrCourt.trim(),
      agencyOrCourt: createForm.agencyOrCourt.trim() || undefined,
      category: createForm.category.trim(),
      title: createForm.title.trim(),
      actingType: createForm.actingType,
      priority: createForm.priority,
      statusLabel: createForm.statusLabel.trim(),
      clientId: client.id,
      clientName: client.name,
      clientCpf: client.cpf,
      openingDate: createForm.openingDate || today(),
      openedAt: createForm.openingDate || today(),
      filingDate: createForm.filingDate || undefined,
      caseFacts: createForm.caseFacts.trim() || undefined,
      quickNotes: createForm.quickNotes.trim() || undefined,
      notes: [],
      currentStepIndex: 0,
      steps: [],
      deadlinesCount: 0,
      costs: [],
      deadlineEventsMigratedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    setSaving(true);
    try {
      await saveCaseInFirestore(legalCase, firmId);
      setCases((current) => [legalCase, ...current.filter((item) => item.id !== legalCase.id)]);
      setCreateOpen(false);
      setSelectedCase(legalCase);
      setEditForm(formFromCase(legalCase));
    } finally {
      setSaving(false);
    }
  };

  const openCase = (legalCase: OperationalCase) => {
    setSelectedCase(legalCase);
    setEditForm(formFromCase(legalCase));
    setEditError('');
    setEditMode(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedCase || !firmId || saving) return;
    const validation = validateForm(editForm, selectedCase.id);
    if (validation) {
      setEditError(validation);
      return;
    }

    const client = clients.find((item) => item.id === selectedCase.clientId);
    const now = getBrasiliaISO();
    const updatedCase: OperationalCase = {
      ...selectedCase,
      title: editForm.title.trim(),
      category: editForm.category.trim(),
      actingType: editForm.actingType,
      processNumber: editForm.processNumber.trim(),
      court: editForm.agencyOrCourt.trim(),
      agencyOrCourt: editForm.agencyOrCourt.trim() || undefined,
      statusLabel: editForm.statusLabel.trim(),
      priority: editForm.priority,
      openingDate: editForm.openingDate || undefined,
      openedAt: editForm.openingDate || undefined,
      filingDate: editForm.filingDate || undefined,
      caseFacts: editForm.caseFacts.trim() || undefined,
      quickNotes: editForm.quickNotes.trim() || undefined,
      clientName: client?.name || selectedCase.clientName,
      clientCpf: client?.cpf || selectedCase.clientCpf,
      updatedAt: now,
      lastMovementDate: now.slice(0, 10),
    };

    setSaving(true);
    try {
      await saveCaseInFirestore(updatedCase, firmId);
      setCases((current) => current.map((item) => item.id === updatedCase.id ? updatedCase : item));
      setSelectedCase(updatedCase);
      setEditForm(formFromCase(updatedCase));
      setEditMode(false);
      setEditError('');
    } finally {
      setSaving(false);
    }
  };

  const openDeadline = (legalCase: OperationalCase) => {
    setDeadlineCase(legalCase);
    setDeadlineForm(emptyDeadlineForm(legalCase));
    setDeadlineError('');
  };

  const handleSaveDeadline = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!deadlineCase || !firmId || deadlineSaving) return;
    if (!deadlineForm.fullDate) {
      setDeadlineError('Informe a data do prazo ou compromisso.');
      return;
    }
    if (!deadlineForm.title.trim()) {
      setDeadlineError('Informe um título para o prazo ou compromisso.');
      return;
    }

    const duplicate = events.some((item) =>
      item.caseId === deadlineCase.id &&
      item.status === 'Pendente' &&
      item.fullDate === deadlineForm.fullDate &&
      (item.eventType || '') === deadlineForm.eventType
    );
    if (duplicate) {
      setDeadlineError('Já existe um prazo pendente deste tipo e nesta data para o caso.');
      return;
    }

    const presentation = eventPresentation(deadlineForm.eventType);
    const newEvent: ScheduledEvent = {
      id: `ev-case-${deadlineCase.id}-${Date.now()}`,
      dateStr: formatDateBadge(deadlineForm.fullDate),
      fullDate: deadlineForm.fullDate,
      time: deadlineForm.time || undefined,
      type: presentation.type,
      badgeColor: presentation.badgeColor,
      title: deadlineForm.title.trim(),
      caseId: deadlineCase.id,
      clientId: deadlineCase.clientId,
      clientName: deadlineCase.clientName,
      benefitType: deadlineCase.category,
      processNumber: deadlineCase.processNumber || deadlineCase.caseNumber,
      eventType: deadlineForm.eventType,
      location: deadlineForm.location.trim() || undefined,
      status: 'Pendente',
      notes: deadlineForm.notes.trim() || undefined,
      reminderDays: 1,
      reminderOption: '1_day',
      syncedWithGoogleCalendar: false,
    };

    setDeadlineSaving(true);
    try {
      await saveEventInFirestore(newEvent, firmId);
      setEvents((current) => [newEvent, ...current.filter((item) => item.id !== newEvent.id)]);
      setDeadlineCase(null);
      setDeadlineError('');
    } finally {
      setDeadlineSaving(false);
    }
  };

  const handleDeadlineStatus = async (scheduledEvent: ScheduledEvent, status: DeadlineStatus) => {
    if (!firmId) return;
    const updated = { ...scheduledEvent, status };
    await saveEventInFirestore(updated, firmId);
    setEvents((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const archiveCase = async (legalCase: OperationalCase) => {
    if (!firmId) return;
    const pending = getPendingCaseEvents(legalCase.id, events);
    if (pending.length > 0) {
      window.alert(`Este caso possui ${pending.length} prazo(s) pendente(s). Conclua, remarque ou resolva os prazos antes de arquivar.`);
      return;
    }
    if (!window.confirm(`Arquivar o caso ${legalCase.caseNumber} de ${legalCase.clientName}?`)) return;
    const now = getBrasiliaISO();
    const updated: OperationalCase = {
      ...legalCase,
      statusBeforeArchive: legalCase.statusLabel,
      archivedAt: now,
      updatedAt: now,
    };
    await saveCaseInFirestore(updated, firmId);
    setCases((current) => current.map((item) => item.id === updated.id ? updated : item));
    setSelectedCase(null);
  };

  const restoreCase = async (legalCase: OperationalCase) => {
    if (!firmId) return;
    const now = getBrasiliaISO();
    const updated: OperationalCase = {
      ...legalCase,
      statusLabel: legalCase.statusBeforeArchive || legalCase.statusLabel || 'Triagem',
      archivedAt: undefined,
      updatedAt: now,
    };
    await saveCaseInFirestore(updated, firmId);
    setCases((current) => current.map((item) => item.id === updated.id ? updated : item));
  };

  const openDocumentFlow = (legalCase: OperationalCase) => {
    const client = clients.find((item) => item.id === legalCase.clientId);
    if (!client) {
      window.alert('A ficha do cliente vinculada a este caso não foi encontrada.');
      return;
    }
    if (String(client.status) === 'Arquivado') {
      window.alert('O cliente vinculado está arquivado. Restaure o cliente antes de criar um novo documento.');
      return;
    }
    setDocumentCase(legalCase);
    setDocumentDraft(null);
    setDocumentTemplate(null);
  };

  const activeTemplates = templates.filter((item) => item.status !== 'Arquivado');

  const prepareDocument = async (template: DocumentTemplate) => {
    if (!documentCase || !firmId || documentPreparing) return;
    const client = clients.find((item) => item.id === documentCase.clientId);
    if (!client || String(client.status) === 'Arquivado') {
      window.alert('O cliente vinculado não está disponível para gerar documento.');
      return;
    }

    setDocumentPreparing(true);
    try {
      const clientAnalysis = replaceVariablesInTemplateText(
        template.contentPattern || '',
        client,
        settings,
        'placeholder',
        '[Não informado]'
      );
      const caseAnalysis = replaceCaseVariablesInText(clientAnalysis.replacedText, documentCase, '[Não informado]');
      const now = getBrasiliaISO();
      const rawId =
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const currentUser = auth.currentUser;
      const draft: GeneratedDocument = {
        id: `document-${rawId}`,
        title: `${template.title} — ${client.name} — ${documentCase.caseNumber}`,
        content: caseAnalysis.replacedText,
        status: 'Rascunho',
        source: 'case',
        templateId: template.id,
        templateTitle: template.title,
        templateSnapshot: { ...template },
        clientId: client.id,
        clientName: client.name,
        clientCpf: client.cpf,
        caseId: documentCase.id,
        createdAt: now,
        updatedAt: now,
        createdByUid: currentUser?.uid,
        createdByName: currentUser?.displayName || currentUser?.email || undefined,
      };

      const saved = await saveGeneratedDocumentInFirestore(draft, firmId);
      if (!saved) {
        window.alert('Não foi possível salvar o rascunho do documento.');
        return;
      }
      setDocumentTemplate(template);
      setDocumentDraft(draft);
    } finally {
      setDocumentPreparing(false);
    }
  };

  const closeDocumentFlow = () => {
    setDocumentCase(null);
    setDocumentTemplate(null);
    setDocumentDraft(null);
  };

  return (
    <>
      <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen bg-slate-50">
        <div className="max-w-7xl mx-auto space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-4 pb-4 border-b border-slate-200">
            <div>
              <h1 className="text-2xl md:text-3xl font-black text-slate-900 tracking-tight">Casos & Processos</h1>
              <p className="text-xs md:text-sm text-slate-600 mt-1 max-w-3xl">
                Caso, prazo e documento compartilham o mesmo contexto. Registre uma vez e retome o trabalho sem redigitação.
              </p>
            </div>
            <button type="button" onClick={openCreate} className="px-4 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-black text-white text-xs font-bold inline-flex items-center gap-2 border border-[#C9A227]/60 shadow-md">
              <span className="material-symbols-outlined text-base text-[#C9A227]">add</span>
              Novo caso
            </button>
          </div>

          {loading && <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-xs font-semibold text-slate-500">Carregando casos...</div>}
          {loadError && <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold text-amber-900">{loadError}</div>}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <button type="button" onClick={() => setLifecycleFilter('active')} className="text-left rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Casos ativos</div>
              <div className="text-2xl font-black text-slate-900 mt-1">{activeCases.length}</div>
            </button>
            <div className="rounded-2xl border border-red-200 bg-red-50/60 p-4 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-red-600">Urgentes</div>
              <div className="text-2xl font-black text-red-800 mt-1">{activeCases.filter((item) => item.priority === 'Urgente').length}</div>
            </div>
            <div className="rounded-2xl border border-amber-200 bg-amber-50/60 p-4 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-amber-700">Prazos pendentes</div>
              <div className="text-2xl font-black text-amber-900 mt-1">{events.filter((event) => event.status === 'Pendente' && event.caseId && activeCases.some((item) => item.id === event.caseId)).length}</div>
            </div>
            <button type="button" onClick={() => setLifecycleFilter('archived')} className="text-left rounded-2xl border border-slate-200 bg-slate-100/70 p-4 shadow-xs">
              <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-500">Arquivados</div>
              <div className="text-2xl font-black text-slate-700 mt-1">{archivedCases.length}</div>
            </button>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col lg:flex-row gap-3 lg:items-center justify-between">
              <div className="inline-flex p-1 rounded-xl bg-slate-100 self-start">
                <button type="button" onClick={() => setLifecycleFilter('active')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lifecycleFilter === 'active' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>Ativos ({activeCases.length})</button>
                <button type="button" onClick={() => setLifecycleFilter('archived')} className={`px-3 py-1.5 rounded-lg text-xs font-bold ${lifecycleFilter === 'archived' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600'}`}>Arquivados ({archivedCases.length})</button>
              </div>
              <div className="relative w-full lg:w-80">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-slate-400 text-sm">search</span>
                <input value={localSearch} onChange={(event) => setLocalSearch(event.target.value)} placeholder="Cliente, CPF, processo, título..." className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs focus:bg-white focus:outline-none" />
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <option>Todos</option>
                {categories.map((item) => <option key={item}>{item}</option>)}
              </select>
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700">
                <option>Todos</option>
                {statuses.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white shadow-xs overflow-hidden">
            {filteredCases.length === 0 ? (
              <div className="p-12 text-center">
                <span className="material-symbols-outlined text-3xl text-slate-300">folder_off</span>
                <h3 className="font-bold text-slate-900 text-sm mt-2">Nenhum caso encontrado</h3>
                <p className="text-xs text-slate-500 mt-1">Ajuste os filtros ou abra o primeiro caso.</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                <div className="hidden lg:grid grid-cols-12 gap-4 px-5 py-3 bg-slate-50/80 text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  <div className="col-span-4">Caso / Cliente</div><div className="col-span-2">Área</div><div className="col-span-2">Situação</div><div className="col-span-2">Próximo prazo</div><div className="col-span-2 text-right">Ações</div>
                </div>
                {filteredCases.map((item) => (
                  <div key={item.id} className="p-4 lg:px-5 lg:py-3.5 grid grid-cols-1 lg:grid-cols-12 gap-2 lg:gap-4 lg:items-center hover:bg-slate-50/70 transition-colors">
                    <div className="lg:col-span-4 min-w-0">
                      <div className="flex items-center gap-2"><span className={`px-2 py-0.5 rounded-md border text-[9px] font-extrabold ${priorityClass(item.priority)}`}>{item.priority || 'Normal'}</span><span className="text-[10px] font-mono text-slate-400">{item.caseNumber}</span></div>
                      <div className="font-bold text-slate-900 text-xs mt-1 truncate">{item.title}</div>
                      <div className="text-[10px] text-slate-500 mt-0.5 truncate">{item.clientName} • CPF {item.clientCpf}</div>
                      {item.processNumber && <div className="text-[10px] font-mono text-slate-400 mt-0.5 truncate">{item.processNumber}</div>}
                    </div>
                    <div className="lg:col-span-2 text-xs"><span className="font-semibold text-slate-800 block truncate">{item.category}</span><span className="text-[10px] text-slate-500">{item.actingType || 'A definir'}</span></div>
                    <div className="lg:col-span-2"><span className="inline-flex px-2 py-1 rounded-lg bg-blue-50 border border-blue-100 text-blue-900 text-[10px] font-bold">{item.statusLabel}</span></div>
                    <div className="lg:col-span-2 text-xs"><span className="font-semibold text-slate-800 block">{item.nextDeadlineType || 'Sem prazo pendente'}</span><span className="text-[10px] text-slate-500">{item.nextDeadlineDate ? formatDate(item.nextDeadlineDate) : '—'}</span></div>
                    <div className="lg:col-span-2 flex lg:justify-end gap-1.5 flex-wrap">
                      {item.archivedAt ? (
                        <button type="button" onClick={() => void restoreCase(item)} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">Restaurar</button>
                      ) : (
                        <>
                          <button type="button" onClick={() => openDeadline(item)} className="px-2.5 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold">Prazo</button>
                          <button type="button" onClick={() => openDocumentFlow(item)} className="px-2.5 py-1.5 rounded-lg bg-blue-50 border border-blue-200 text-blue-900 text-[11px] font-bold">Documento</button>
                          <button type="button" onClick={() => openCase(item)} className="px-2.5 py-1.5 rounded-lg bg-slate-900 text-white text-[11px] font-bold">Abrir</button>
                          <button type="button" onClick={() => void archiveCase(item)} className="px-2.5 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-700 text-[11px] font-bold">Arquivar</button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>

      {createOpen && (
        <CaseFormModal
          title="Abrir novo caso"
          subtitle="Cadastre apenas o essencial agora. O restante pode ser completado durante o atendimento."
          form={createForm}
          setForm={setCreateForm}
          clients={eligibleClients}
          categories={categories}
          error={createError}
          saving={saving}
          onClose={() => setCreateOpen(false)}
          onSubmit={handleCreate}
        />
      )}

      {selectedCase && (
        <CaseDetailModal
          legalCase={selectedCase}
          form={editForm}
          setForm={setEditForm}
          categories={categories}
          editMode={editMode}
          error={editError}
          saving={saving}
          caseEvents={selectedCaseEvents}
          onEdit={() => { setEditForm(formFromCase(selectedCase)); setEditMode(true); setEditError(''); }}
          onCancelEdit={() => { setEditForm(formFromCase(selectedCase)); setEditMode(false); setEditError(''); }}
          onSave={() => void handleSaveEdit()}
          onDocument={() => openDocumentFlow(selectedCase)}
          onAddDeadline={() => openDeadline(selectedCase)}
          onDeadlineStatus={(scheduledEvent, status) => void handleDeadlineStatus(scheduledEvent, status)}
          onClose={() => setSelectedCase(null)}
        />
      )}

      {deadlineCase && (
        <DeadlineModal
          legalCase={deadlineCase}
          form={deadlineForm}
          setForm={setDeadlineForm}
          error={deadlineError}
          saving={deadlineSaving}
          onClose={() => setDeadlineCase(null)}
          onSubmit={handleSaveDeadline}
        />
      )}

      {documentCase && !documentDraft && (
        <div className="fixed inset-0 z-[65] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white w-full max-w-3xl rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 mb-5"><div><h3 className="text-lg font-black text-slate-900">Documento do caso</h3><p className="text-xs text-slate-500 mt-1">{documentCase.clientName} • {documentCase.caseNumber} • {documentCase.title}</p></div><button type="button" onClick={closeDocumentFlow} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><span className="material-symbols-outlined">close</span></button></div>
            {activeTemplates.length === 0 ? <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Nenhum modelo ativo está disponível. Cadastre ou restaure um modelo em Documentos.</div> : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {activeTemplates.map((template) => <button key={template.id} type="button" disabled={documentPreparing} onClick={() => void prepareDocument(template)} className="text-left p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-all disabled:opacity-50"><div className="font-bold text-slate-900 text-xs">{template.title}</div><div className="text-[10px] text-slate-500 mt-1">{template.category}{template.format ? ` • ${template.format}` : ''}</div><div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{template.description || 'Sem descrição.'}</div></button>)}
              </div>
            )}
          </div>
        </div>
      )}

      {documentCase && documentDraft && documentTemplate && (
        <DocumentGeneratorModal
          isOpen={true}
          onClose={closeDocumentFlow}
          template={documentTemplate}
          clients={clients}
          initialClientId={documentDraft.clientId}
          initialDocument={documentDraft}
          settings={settings}
        />
      )}
    </>
  );
};

interface CaseFormModalProps {
  title: string;
  subtitle: string;
  form: CaseFormState;
  setForm: React.Dispatch<React.SetStateAction<CaseFormState>>;
  clients: Client[];
  categories: string[];
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const CaseFormModal: React.FC<CaseFormModalProps> = ({ title, subtitle, form, setForm, clients, categories, error, saving, onClose, onSubmit }) => (
  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div className="bg-white w-full max-w-3xl rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
      <div className="flex items-start justify-between gap-4 mb-5"><div><h3 className="text-lg font-black text-slate-900">{title}</h3><p className="text-xs text-slate-500 mt-1">{subtitle}</p></div><button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><span className="material-symbols-outlined">close</span></button></div>
      <form onSubmit={onSubmit} className="space-y-4 text-xs">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800">{error}</div>}
        <div><label className="block font-bold text-slate-700 mb-1">Cliente *</label><select value={form.clientId} onChange={(event) => setForm((current) => ({ ...current, clientId: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold"><option value="">Selecione um cliente...</option>{clients.map((client) => <option key={client.id} value={client.id}>{client.name} — CPF {client.cpf}</option>)}</select></div>
        <div><label className="block font-bold text-slate-700 mb-1">Objeto do caso *</label><input value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} placeholder="Ex: Aposentadoria por idade" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold" /></div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div><label className="block font-bold text-slate-700 mb-1">Área jurídica *</label><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="block font-bold text-slate-700 mb-1">Atuação</label><select value={form.actingType} onChange={(event) => setForm((current) => ({ ...current, actingType: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">{ACTING_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="block font-bold text-slate-700 mb-1">Situação atual</label><select value={form.statusLabel} onChange={(event) => setForm((current) => ({ ...current, statusLabel: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="block font-bold text-slate-700 mb-1">Prioridade</label><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">{PRIORITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
          <div><label className="block font-bold text-slate-700 mb-1">Processo / protocolo</label><input value={form.processNumber} onChange={(event) => setForm((current) => ({ ...current, processNumber: event.target.value }))} placeholder="Pode ser preenchido depois" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-mono" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Órgão / Vara / Agência</label><input value={form.agencyOrCourt} onChange={(event) => setForm((current) => ({ ...current, agencyOrCourt: event.target.value }))} placeholder="Ex: 2ª Vara Federal" className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Data de abertura</label><input type="date" value={form.openingDate} onChange={(event) => setForm((current) => ({ ...current, openingDate: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Data do protocolo</label><input type="date" value={form.filingDate} onChange={(event) => setForm((current) => ({ ...current, filingDate: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
        </div>
        <div><label className="block font-bold text-slate-700 mb-1">Fatos / resumo inicial</label><textarea rows={4} value={form.caseFacts} onChange={(event) => setForm((current) => ({ ...current, caseFacts: event.target.value }))} className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 resize-none" placeholder="Registre apenas o que for útil para retomar o trabalho depois." /></div>
        <div className="pt-3 border-t border-slate-100 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancelar</button><button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Abrir caso'}</button></div>
      </form>
    </div>
  </div>
);

interface DeadlineModalProps {
  legalCase: OperationalCase;
  form: DeadlineFormState;
  setForm: React.Dispatch<React.SetStateAction<DeadlineFormState>>;
  error: string;
  saving: boolean;
  onClose: () => void;
  onSubmit: (event: React.FormEvent) => void;
}

const DeadlineModal: React.FC<DeadlineModalProps> = ({ legalCase, form, setForm, error, saving, onClose, onSubmit }) => {
  const updateType = (eventType: string) => {
    setForm((current) => ({
      ...current,
      eventType,
      title: !current.title || current.title.includes('—') ? `${eventType} — ${legalCase.clientName}` : current.title,
    }));
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white w-full max-w-xl rounded-3xl p-6 border border-slate-200 shadow-2xl max-h-[92vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-5"><div><h3 className="text-lg font-black text-slate-900">Novo prazo / compromisso</h3><p className="text-xs text-slate-500 mt-1">{legalCase.clientName} • {legalCase.caseNumber}</p></div><button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 text-slate-500"><span className="material-symbols-outlined">close</span></button></div>
        <form onSubmit={onSubmit} className="space-y-4 text-xs">
          {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800">{error}</div>}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div><label className="block font-bold text-slate-700 mb-1">Tipo</label><select value={form.eventType} onChange={(event) => updateType(event.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 font-semibold">{DEADLINE_TYPES.map((item) => <option key={item}>{item}</option>)}</select></div>
            <div><label className="block font-bold text-slate-700 mb-1">Data *</label><input required type="date" value={form.fullDate} onChange={(event) => setForm((current) => ({ ...current, fullDate: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Horário</label><input type="time" value={form.time} onChange={(event) => setForm((current) => ({ ...current, time: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Local / link</label><input value={form.location} onChange={(event) => setForm((current) => ({ ...current, location: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
          </div>
          <div><label className="block font-bold text-slate-700 mb-1">Título *</label><input required value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
          <div><label className="block font-bold text-slate-700 mb-1">Observação</label><textarea rows={3} value={form.notes} onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 resize-none" placeholder="Somente o que for útil para cumprir este prazo." /></div>
          <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-blue-900 font-semibold">Ao salvar, este compromisso aparecerá automaticamente em Agenda & Prazos e atualizará o próximo prazo da ficha.</div>
          <div className="pt-3 border-t border-slate-100 flex justify-end gap-2"><button type="button" onClick={onClose} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancelar</button><button type="submit" disabled={saving} className="px-5 py-2.5 rounded-xl bg-amber-700 text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar prazo'}</button></div>
        </form>
      </div>
    </div>
  );
};

interface CaseDetailModalProps {
  legalCase: OperationalCase;
  form: CaseFormState;
  setForm: React.Dispatch<React.SetStateAction<CaseFormState>>;
  categories: string[];
  editMode: boolean;
  error: string;
  saving: boolean;
  caseEvents: ScheduledEvent[];
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: () => void;
  onDocument: () => void;
  onAddDeadline: () => void;
  onDeadlineStatus: (scheduledEvent: ScheduledEvent, status: DeadlineStatus) => void;
  onClose: () => void;
}

const CaseDetailModal: React.FC<CaseDetailModalProps> = ({ legalCase, form, setForm, categories, editMode, error, saving, caseEvents, onEdit, onCancelEdit, onSave, onDocument, onAddDeadline, onDeadlineStatus, onClose }) => (
  <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
    <div className="bg-white w-full max-w-4xl rounded-3xl border border-slate-200 shadow-2xl max-h-[94vh] overflow-y-auto">
      <div className="p-5 md:p-6 border-b border-slate-200 bg-slate-50/70 flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div><div className="flex items-center gap-2 flex-wrap"><span className="text-[10px] font-mono text-slate-400">{legalCase.caseNumber}</span><span className={`px-2 py-0.5 rounded-md border text-[9px] font-bold ${priorityClass(legalCase.priority)}`}>{legalCase.priority || 'Normal'}</span></div><h2 className="text-lg font-black text-slate-900 mt-1">{legalCase.title}</h2><p className="text-xs text-slate-500 mt-1">{legalCase.clientName} • CPF {legalCase.clientCpf}</p></div>
        <div className="flex gap-2 flex-wrap"><button type="button" onClick={onAddDeadline} className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-bold">Novo prazo</button><button type="button" onClick={onDocument} className="px-3 py-2 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 text-xs font-bold">Documento</button>{!editMode && <button type="button" onClick={onEdit} className="px-3 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold">Editar caso</button>}<button type="button" onClick={onClose} className="p-2 rounded-full hover:bg-slate-200 text-slate-500"><span className="material-symbols-outlined">close</span></button></div>
      </div>
      <div className="p-5 md:p-6 space-y-5 text-xs">
        {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 font-semibold text-red-800">{error}</div>}
        {!editMode ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Info label="Situação" value={legalCase.statusLabel} /><Info label="Área" value={legalCase.category} /><Info label="Atuação" value={legalCase.actingType || 'A definir'} /><Info label="Prioridade" value={legalCase.priority || 'Normal'} />
              <Info label="Processo / protocolo" value={legalCase.processNumber || 'Não informado'} /><Info label="Órgão / Vara" value={legalCase.agencyOrCourt || legalCase.court || 'Não informado'} /><Info label="Abertura" value={legalCase.openingDate ? formatDate(legalCase.openingDate) : 'Não informado'} /><Info label="Próximo prazo" value={legalCase.nextDeadlineDate ? `${legalCase.nextDeadlineType || 'Prazo'} • ${formatDate(legalCase.nextDeadlineDate)}` : 'Nenhum prazo pendente'} />
            </div>
            <section className="rounded-2xl border border-amber-200 bg-amber-50/40 p-4 space-y-3">
              <div className="flex items-center justify-between gap-3"><div><div className="font-extrabold text-slate-900">Prazos e compromissos</div><div className="text-[10px] text-slate-500 mt-0.5">A mesma informação aparece na Agenda; concluir ou reabrir aqui atualiza ambos.</div></div><button type="button" onClick={onAddDeadline} className="px-3 py-2 rounded-xl bg-amber-700 text-white font-bold">Adicionar prazo</button></div>
              {caseEvents.length === 0 ? (
                <div className="rounded-xl border border-dashed border-amber-200 bg-white/70 p-4 text-center text-slate-500">Nenhum prazo ou compromisso vinculado ao caso.</div>
              ) : (
                <div className="space-y-2">
                  {caseEvents.map((scheduledEvent) => (
                    <div key={scheduledEvent.id} className="rounded-xl border border-slate-200 bg-white p-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div className="min-w-0"><div className="flex items-center gap-2 flex-wrap"><span className="font-bold text-slate-900">{scheduledEvent.eventType || scheduledEvent.title}</span><span className={`px-2 py-0.5 rounded-full border text-[9px] font-bold ${statusClass(scheduledEvent.status)}`}>{scheduledEvent.status}</span></div><div className="text-[10px] text-slate-500 mt-1">{formatDate(scheduledEvent.fullDate)}{scheduledEvent.time ? ` às ${scheduledEvent.time}` : ''}{scheduledEvent.location ? ` • ${scheduledEvent.location}` : ''}</div>{scheduledEvent.notes && <div className="text-[10px] text-slate-500 mt-1 truncate">{scheduledEvent.notes}</div>}</div>
                      <div className="flex gap-2 shrink-0">{scheduledEvent.status === 'Concluído' ? <button type="button" onClick={() => onDeadlineStatus(scheduledEvent, 'Pendente')} className="px-2.5 py-1.5 rounded-lg bg-slate-100 border border-slate-200 text-slate-700 font-bold">Reabrir</button> : <button type="button" onClick={() => onDeadlineStatus(scheduledEvent, 'Concluído')} className="px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 font-bold">Concluir</button>}</div>
                    </div>
                  ))}
                </div>
              )}
            </section>
            <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"><div className="font-bold text-slate-800 mb-2">Fatos / contexto</div><p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{legalCase.caseFacts || 'Nenhum resumo registrado.'}</p></section>
            <section className="rounded-2xl border border-slate-200 bg-white p-4"><div className="font-bold text-slate-800 mb-2">Observações rápidas</div><p className="text-slate-600 whitespace-pre-wrap leading-relaxed">{legalCase.quickNotes || 'Nenhuma observação registrada.'}</p></section>
          </>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Field label="Objeto do caso" value={form.title} onChange={(value) => setForm((current) => ({ ...current, title: value }))} />
              <div><label className="block font-bold text-slate-700 mb-1">Área jurídica</label><select value={form.category} onChange={(event) => setForm((current) => ({ ...current, category: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">{categories.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Atuação</label><select value={form.actingType} onChange={(event) => setForm((current) => ({ ...current, actingType: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">{ACTING_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Situação</label><select value={form.statusLabel} onChange={(event) => setForm((current) => ({ ...current, statusLabel: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">{STATUS_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
              <div><label className="block font-bold text-slate-700 mb-1">Prioridade</label><select value={form.priority} onChange={(event) => setForm((current) => ({ ...current, priority: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200">{PRIORITY_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></div>
              <Field label="Processo / protocolo" value={form.processNumber} onChange={(value) => setForm((current) => ({ ...current, processNumber: value }))} />
              <Field label="Órgão / Vara / Agência" value={form.agencyOrCourt} onChange={(value) => setForm((current) => ({ ...current, agencyOrCourt: value }))} />
              <div><label className="block font-bold text-slate-700 mb-1">Data de abertura</label><input type="date" value={form.openingDate} onChange={(event) => setForm((current) => ({ ...current, openingDate: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
              <div><label className="block font-bold text-slate-700 mb-1">Data do protocolo</label><input type="date" value={form.filingDate} onChange={(event) => setForm((current) => ({ ...current, filingDate: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>
            </div>
            <div className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2.5 text-blue-900 font-semibold">Prazos não são mais digitados nesta edição. Use “Novo prazo” para que Caso e Agenda permaneçam sincronizados.</div>
            <div><label className="block font-bold text-slate-700 mb-1">Fatos / contexto</label><textarea rows={5} value={form.caseFacts} onChange={(event) => setForm((current) => ({ ...current, caseFacts: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 resize-none" /></div>
            <div><label className="block font-bold text-slate-700 mb-1">Observações rápidas</label><textarea rows={3} value={form.quickNotes} onChange={(event) => setForm((current) => ({ ...current, quickNotes: event.target.value }))} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 resize-none" /></div>
            <div className="pt-3 border-t border-slate-100 flex justify-end gap-2"><button type="button" onClick={onCancelEdit} className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-700 font-bold">Cancelar alterações</button><button type="button" onClick={onSave} disabled={saving} className="px-5 py-2.5 rounded-xl bg-[#0A1F44] text-white font-bold disabled:opacity-50">{saving ? 'Salvando...' : 'Salvar caso'}</button></div>
          </div>
        )}
      </div>
    </div>
  </div>
);

const Info = ({ label, value }: { label: string; value: string }) => <div className="rounded-xl border border-slate-200 bg-white p-3"><div className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">{label}</div><div className="text-[11px] font-semibold text-slate-800 mt-1 break-words">{value}</div></div>;
const Field = ({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) => <div><label className="block font-bold text-slate-700 mb-1">{label}</label><input value={value} onChange={(event) => onChange(event.target.value)} className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200" /></div>;
