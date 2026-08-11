import { signInWithPopup, GoogleAuthProvider, signOut, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { ScheduledEvent } from '../types';

let cachedAccessToken: string | null = null;
let cachedUser: User | null = null;

const calendarProvider = new GoogleAuthProvider();
calendarProvider.addScope('https://www.googleapis.com/auth/calendar.events');
calendarProvider.setCustomParameters({ prompt: 'consent' });

export function getCachedGoogleUser(): User | null {
  return cachedUser || auth.currentUser;
}

export function getCachedAccessToken(): string | null {
  return cachedAccessToken;
}

export async function loginGoogleCalendar(): Promise<{ user: User; accessToken: string }> {
  try {
    const result = await signInWithPopup(auth, calendarProvider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Não foi possível obter a chave de acesso do Google.');
    }
    cachedAccessToken = credential.accessToken;
    cachedUser = result.user;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('A janela do Google foi fechada antes da conclusão do login.');
    }
    console.error('Erro na autenticação Google Calendar:', error);
    throw error;
  }
}

export async function logoutGoogleCalendar(): Promise<void> {
  cachedAccessToken = null;
  cachedUser = null;
  await signOut(auth);
}

/**
 * Calculates reminder override minutes for Google Calendar API
 */
export function calculateReminderMinutes(
  eventFullDate: string,
  eventTime: string | undefined,
  reminderOption: string | undefined,
  customReminderTime: string | undefined
): number {
  const timeStr = eventTime || '09:00';
  const [eventHour, eventMinute] = timeStr.split(':').map((n) => parseInt(n, 10) || 0);

  if (reminderOption === '1_hour') {
    return 60;
  }
  if (reminderOption === '1_day') {
    return 24 * 60; // 1440 mins
  }
  if (reminderOption === '2_days') {
    return 48 * 60; // 2880 mins
  }
  if (reminderOption === 'custom' && customReminderTime) {
    // Custom time on the same day
    const [custHour, custMin] = customReminderTime.split(':').map((n) => parseInt(n, 10) || 0);
    const eventMinsFromStartOfDay = eventHour * 60 + eventMinute;
    const custMinsFromStartOfDay = custHour * 60 + custMin;
    const diff = eventMinsFromStartOfDay - custMinsFromStartOfDay;
    return diff > 0 ? diff : 10; // at least 10 minutes prior
  }

  // Default: at the event time or 15 mins prior
  return 15;
}

/**
 * Syncs an event to Google Calendar (Insert or Update)
 */
export async function syncScheduledEventToGoogle(
  event: ScheduledEvent,
  accessToken: string
): Promise<{ googleEventId: string; htmlLink?: string }> {
  const eventDate = event.fullDate || new Date().toISOString().split('T')[0];
  const timeStr = event.time || '09:00';

  // Parse time and enforce HH:mm padding
  const [rawHrs, rawMins] = timeStr.split(':').map((n) => parseInt(n, 10));
  const hrs = isNaN(rawHrs) ? 9 : rawHrs;
  const mins = isNaN(rawMins) ? 0 : rawMins;

  const startHrsStr = String(hrs).padStart(2, '0');
  const startMinsStr = String(mins).padStart(2, '0');
  const startDateTime = `${eventDate}T${startHrsStr}:${startMinsStr}:00-03:00`;
  
  // Calculate end time (1 hour later)
  const endHrs = (hrs + 1) % 24;
  const endHrsStr = String(endHrs).padStart(2, '0');
  const endDateTime = `${eventDate}T${endHrsStr}:${startMinsStr}:00-03:00`;

  // Calculate reminder minutes
  const reminderMins = calculateReminderMinutes(
    eventDate,
    event.time,
    event.reminderOption,
    event.customReminderTime
  );

  const summary = `[JurisControl] ${event.title}`;
  let description = `COMPROMISSO JURÍDICO JURISCONTROL\n`;
  if (event.clientName) description += `• Cliente: ${event.clientName}\n`;
  if (event.processNumber) description += `• N° Processo: ${event.processNumber}\n`;
  if (event.benefitType) description += `• Ação/Benefício: ${event.benefitType}\n`;
  if (event.eventType) description += `• Tipo de Evento: ${event.eventType}\n`;
  if (event.notes) description += `\nObservações: ${event.notes}`;

  const payload: any = {
    summary,
    description,
    location: event.location || 'Escritório / Não informado',
    start: {
      dateTime: startDateTime,
      timeZone: 'America/Fortaleza',
    },
    end: {
      dateTime: endDateTime,
      timeZone: 'America/Fortaleza',
    },
    reminders: {
      useDefault: false,
      overrides: [
        { method: 'popup', minutes: reminderMins },
        { method: 'email', minutes: reminderMins },
      ],
    },
  };

  const isUpdate = Boolean(event.googleEventId);
  const url = isUpdate
    ? `https://www.googleapis.com/calendar/v3/calendars/primary/events/${event.googleEventId}`
    : `https://www.googleapis.com/calendar/v3/calendars/primary/events`;

  const response = await fetch(url, {
    method: isUpdate ? 'PUT' : 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    if (response.status === 401) {
      cachedAccessToken = null;
      throw new Error('Sessão do Google expirada. Por favor, clique em "Conectar ao Google Agenda" novamente.');
    }
    const errJson = await response.json().catch(() => ({}));
    console.error('Google Calendar Sync Error:', errJson);
    throw new Error(errJson.error?.message || `Falha na sincronização (${response.status})`);
  }

  const result = await response.json();
  return {
    googleEventId: result.id,
    htmlLink: result.htmlLink,
  };
}

/**
 * Deletes an event from Google Calendar
 */
export async function deleteScheduledEventFromGoogle(
  googleEventId: string,
  accessToken: string
): Promise<void> {
  const url = `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`;
  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    const errJson = await response.json().catch(() => ({}));
    console.error('Google Calendar Delete Error:', errJson);
    throw new Error(errJson.error?.message || `Falha ao remover do Google Agenda (${response.status})`);
  }
}
