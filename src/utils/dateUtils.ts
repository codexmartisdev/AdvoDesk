/**
 * Utility functions for date management according to Official Brazil (Brasília) Timezone (America/Sao_Paulo)
 */

/**
 * Returns current date in YYYY-MM-DD format based on America/Sao_Paulo timezone.
 */
export function getBrasiliaISO(): string {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Sao_Paulo',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  return formatter.format(new Date());
}

/**
 * Returns current date in DD/MM/YYYY format based on America/Sao_Paulo timezone.
 */
export function getBrasiliaFormatted(): string {
  const formatter = new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
  return formatter.format(new Date());
}

/**
 * Formats a date string (YYYY-MM-DD or full date string) to DD/MM/YYYY in Brasília time.
 */
export function formatToPtBR(dateString?: string): string {
  if (!dateString) return getBrasiliaFormatted();

  // If it's already YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    return `${day}/${month}/${year}`;
  }

  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    const formatter = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
    return formatter.format(date);
  } catch {
    return dateString;
  }
}

/**
 * Calculates remaining days from today (in Brasília time) to targetIsoDate (YYYY-MM-DD).
 */
export function getDaysRemaining(targetIsoDate: string): number {
  const todayIso = getBrasiliaISO();
  const today = new Date(todayIso + 'T00:00:00');
  const target = new Date(targetIsoDate + 'T00:00:00');
  const diffTime = target.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Returns urgency level and visual classes (Red <3 days or overdue, Yellow <7 days, Green >=7 days or completed).
 */
export function getUrgencyInfo(fullDate: string, status?: string, customPriority?: string) {
  if (status === 'Concluído') {
    return {
      level: 'concluido' as const,
      color: 'emerald',
      bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
      badgeBg: 'bg-blue-50 text-blue-900 border-blue-200',
      dotClass: 'bg-emerald-500',
      label: 'Concluído',
      daysText: 'Concluído',
    };
  }

  if (status === 'Perdido') {
    return {
      level: 'urgente' as const,
      color: 'red',
      bgClass: 'bg-red-50 text-red-800 border-red-200',
      badgeBg: 'bg-red-100 text-red-900 border-red-300',
      dotClass: 'bg-red-600',
      label: 'Prazo Perdido',
      daysText: 'Perdido',
    };
  }

  if (status === 'Remarcado') {
    return {
      level: 'atencao' as const,
      color: 'purple',
      bgClass: 'bg-purple-50 text-purple-800 border-purple-200',
      badgeBg: 'bg-purple-100 text-purple-900 border-purple-300',
      dotClass: 'bg-purple-600',
      label: 'Remarcado',
      daysText: 'Remarcado',
    };
  }

  const days = getDaysRemaining(fullDate);

  if (customPriority === 'urgente' || days < 3) {
    const daysText = days < 0 ? `Vencido há ${Math.abs(days)}d` : days === 0 ? 'Vence Hoje' : `Vence em ${days}d`;
    return {
      level: 'urgente' as const,
      color: 'red',
      bgClass: 'bg-red-50 text-red-700 border-red-200',
      badgeBg: 'bg-red-50 text-red-700 border-red-200',
      dotClass: 'bg-red-600',
      label: 'Urgente (< 3 dias)',
      daysText,
    };
  }

  if (customPriority === 'atencao' || (days >= 3 && days < 7)) {
    return {
      level: 'atencao' as const,
      color: 'amber',
      bgClass: 'bg-amber-50 text-amber-800 border-amber-200',
      badgeBg: 'bg-amber-50 text-amber-800 border-amber-200',
      dotClass: 'bg-amber-500',
      label: 'Atenção (< 7 dias)',
      daysText: `Faltam ${days} dias`,
    };
  }

  return {
    level: 'normal' as const,
    color: 'emerald',
    bgClass: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    badgeBg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    dotClass: 'bg-emerald-500',
    label: 'No Prazo (≥ 7 dias)',
    daysText: `Faltam ${days} dias`,
  };
}
