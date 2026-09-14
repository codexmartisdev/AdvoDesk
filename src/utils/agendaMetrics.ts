import { LegalCase, ScheduledEvent } from '../types';
import { getDaysRemaining } from './dateUtils';

export const isOpenAgendaEvent = (status?: ScheduledEvent['status']) =>
  status === 'Pendente' || status === 'Remarcado';

export const isHearingOrExpertEvent = (event: ScheduledEvent) => {
  const type = event.eventType || event.type || '';
  return type === 'Audiência' || type === 'Perícia Médica' || type === 'Perícia Social';
};

export const getOperationalAgendaMetrics = (
  events: ScheduledEvent[],
  cases: LegalCase[] = []
) => {
  const openEvents = events.filter((event) => isOpenAgendaEvent(event.status));
  const upcomingOpenEvents = openEvents.filter((event) => getDaysRemaining(event.fullDate) >= 0);
  const activeCases = cases.filter((legalCase) => !(legalCase as LegalCase & { archivedAt?: string }).archivedAt);
  const caseIdsWithOpenEvents = new Set(
    openEvents.map((event) => event.caseId).filter((caseId): caseId is string => Boolean(caseId))
  );

  return {
    open: openEvents.length,
    overdue: openEvents.filter((event) => getDaysRemaining(event.fullDate) < 0).length,
    today: openEvents.filter((event) => getDaysRemaining(event.fullDate) === 0).length,
    nextSevenDays: openEvents.filter((event) => {
      const days = getDaysRemaining(event.fullDate);
      return days >= 0 && days <= 6;
    }).length,
    hearingsAndExpertExams: upcomingOpenEvents.filter(isHearingOrExpertEvent).length,
    casesWithoutNextStep: activeCases.filter((legalCase) =>
      !caseIdsWithOpenEvents.has(legalCase.id) && !legalCase.nextDeadlineDate
    ).length,
  };
};

export const sortOperationalEvents = (events: ScheduledEvent[]) =>
  [...events].sort((a, b) => {
    const dateCompare = (a.fullDate || '').localeCompare(b.fullDate || '');
    if (dateCompare !== 0) return dateCompare;
    const timeCompare = (a.time || '').localeCompare(b.time || '');
    if (timeCompare !== 0) return timeCompare;
    return (a.title || '').localeCompare(b.title || '', 'pt-BR');
  });
