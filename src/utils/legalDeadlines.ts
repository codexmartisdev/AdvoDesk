/**
 * Specialized Legal Deadline and Business Days Calculation Engine (CPC vs INSS)
 * Handles Brazilian National and Judicial Holidays, counting rules (Art. 219 CPC, Art. 303 INSS PRES/128).
 */

// Common Brazilian National Holidays (Fixed and Movable approximations for practical computation)
export const BRAZIL_FIXED_HOLIDAYS = [
  '01-01', // Confraternização Universal
  '04-21', // Tiradentes
  '05-01', // Dia do Trabalho
  '09-07', // Independência do Brasil
  '10-12', // Nossa Senhora Aparecida
  '11-02', // Finados
  '11-15', // Proclamação da República
  '11-20', // Dia da Consciência Negra
  '12-25', // Natal
];

// Special judicial recess (Art. 220 CPC: 20 de dezembro a 20 de janeiro suspensão dos prazos processuais)
export function isJudicialRecess(date: Date): boolean {
  const month = date.getMonth(); // 0-indexed: 11 is Dec, 0 is Jan
  const day = date.getDate();
  if (month === 11 && day >= 20) return true;
  if (month === 0 && day <= 20) return true;
  return false;
}

export function isWeekend(date: Date): boolean {
  const dayOfWeek = date.getDay(); // 0 is Sunday, 6 is Saturday
  return dayOfWeek === 0 || dayOfWeek === 6;
}

export function isHoliday(date: Date): boolean {
  const monthStr = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  const mmdd = `${monthStr}-${dayStr}`;
  return BRAZIL_FIXED_HOLIDAYS.includes(mmdd);
}

export type DeadlineType = 'judicial_cpc' | 'administrative_inss' | 'corridos';

/**
 * Checks if a given date is considered a business day for the deadline type.
 */
export function isBusinessDay(date: Date, type: DeadlineType = 'judicial_cpc'): boolean {
  if (type === 'corridos') return true;
  if (isWeekend(date)) return false;
  if (isHoliday(date)) return false;
  if (type === 'judicial_cpc' && isJudicialRecess(date)) return false;
  return true;
}

/**
 * Calculates deadline expiration date starting from a trigger date.
 * - For Judicial (CPC Art. 219): Counts only business days, excludes start day, includes end day.
 * - For Administrative (INSS): Counts running days (dias corridos), but if deadline falls on weekend/holiday, prorogates to next business day (Art. 60 Lei 9.784/99).
 */
export function calculateLegalDeadline(
  startDateStr: string,
  daysCount: number,
  type: DeadlineType = 'judicial_cpc'
): { finalDateIso: string; finalDateFormatted: string; businessDaysCounted: number; isProrogated: boolean } {
  const parts = startDateStr.split('-');
  const start = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));

  let current = new Date(start);
  let daysAdded = 0;
  let isProrogated = false;

  if (type === 'judicial_cpc') {
    // Exclude the first day (dia da intimação)
    current.setDate(current.getDate() + 1);

    while (daysAdded < daysCount) {
      if (isBusinessDay(current, 'judicial_cpc')) {
        daysAdded++;
      }
      if (daysAdded < daysCount) {
        current.setDate(current.getDate() + 1);
      }
    }

    // Ensure expiration falls on business day
    while (!isBusinessDay(current, 'judicial_cpc')) {
      current.setDate(current.getDate() + 1);
      isProrogated = true;
    }
  } else {
    // Administrative / Corridos
    current.setDate(current.getDate() + daysCount);

    // Prorogation rule: if final day is non-business day, extends to next business day
    while (isWeekend(current) || isHoliday(current)) {
      current.setDate(current.getDate() + 1);
      isProrogated = true;
    }
  }

  const y = current.getFullYear();
  const m = String(current.getMonth() + 1).padStart(2, '0');
  const d = String(current.getDate()).padStart(2, '0');
  const finalDateIso = `${y}-${m}-${d}`;
  const finalDateFormatted = `${d}/${m}/${y}`;

  return {
    finalDateIso,
    finalDateFormatted,
    businessDaysCounted: daysCount,
    isProrogated,
  };
}
