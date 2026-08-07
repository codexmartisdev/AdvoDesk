import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  deleteDoc,
  getDoc,
  query,
  where,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Client, LegalCase, DocumentTemplate, ScheduledEvent, FirmSettings } from '../types';
import {
  INITIAL_CLIENTS,
  INITIAL_CASES,
  TEMPLATES,
  SCHEDULED_EVENTS,
  LOGO_IMAGE_URL,
  USER_AVATAR_URL,
} from '../data/mockData';

export const DEFAULT_SETTINGS: FirmSettings = {
  firmName: 'Bizerra Neto',
  firmSubtitle: 'Advocacia',
  logoUrl: LOGO_IMAGE_URL,
  lawyerName: 'Dr. Bizerra Neto',
  lawyerTitle: 'Advogado Sócio • OAB/SP',
  lawyerAvatarUrl: USER_AVATAR_URL,
  oabNumber: 'OAB/SP 412.001',
  practiceAreas: [
    'Contencioso Cível',
    'Direito Trabalhista',
    'Direito Previdenciário',
    'Direito de Família',
    'Direito Empresarial',
    'Direito Tributário',
    'Direito Penal',
  ],
  clientCategories: [
    'BPC Loas',
    'Auxílio Doença',
    'Aposentadoria',
    'Trabalhista',
    'Cível',
    'Empresarial',
    'Família / Sucessões',
  ],
};

/**
 * Seed initial data for a specific user ID if their Firestore collections are empty
 */
export async function seedInitialFirestoreData(
  userId: string,
  userDisplayName?: string | null,
  userEmail?: string | null
) {
  if (!userId) return;

  try {
    // 1. Settings per user
    const settingsRef = doc(db, 'settings', userId);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      const userSettings: FirmSettings = {
        ...DEFAULT_SETTINGS,
        lawyerName: userDisplayName || userEmail?.split('@')[0] || 'Dr. Advogado',
      };
      await setDoc(settingsRef, { ...userSettings, userId });
    }

    // 2. Clients per user
    const clientsQuery = query(collection(db, 'clients'), where('userId', '==', userId));
    const clientsSnap = await getDocs(clientsQuery);
    if (clientsSnap.empty) {
      for (const client of INITIAL_CLIENTS) {
        await setDoc(doc(db, 'clients', `${userId}_${client.id}`), {
          ...client,
          id: `${userId}_${client.id}`,
          userId,
        });
      }
    }

    // 3. Cases per user
    const casesQuery = query(collection(db, 'cases'), where('userId', '==', userId));
    const casesSnap = await getDocs(casesQuery);
    if (casesSnap.empty) {
      for (const c of INITIAL_CASES) {
        await setDoc(doc(db, 'cases', `${userId}_${c.id}`), {
          ...c,
          id: `${userId}_${c.id}`,
          clientId: `${userId}_${c.clientId}`,
          userId,
        });
      }
    }

    // 4. Templates per user
    const templatesQuery = query(collection(db, 'templates'), where('userId', '==', userId));
    const templatesSnap = await getDocs(templatesQuery);
    if (templatesSnap.empty) {
      for (const t of TEMPLATES) {
        await setDoc(doc(db, 'templates', `${userId}_${t.id}`), {
          ...t,
          id: `${userId}_${t.id}`,
          userId,
        });
      }
    }

    // 5. Events per user
    const eventsQuery = query(collection(db, 'events'), where('userId', '==', userId));
    const eventsSnap = await getDocs(eventsQuery);
    if (eventsSnap.empty) {
      for (const ev of SCHEDULED_EVENTS) {
        await setDoc(doc(db, 'events', `${userId}_${ev.id}`), {
          ...ev,
          id: `${userId}_${ev.id}`,
          clientId: `${userId}_${ev.clientId}`,
          caseId: `${userId}_${ev.caseId}`,
          userId,
        });
      }
    }
  } catch (error) {
    console.error('Error seeding initial Firestore data for user:', userId, error);
  }
}

// Subscribe to real-time collections filtered by userId
export function subscribeToClients(userId: string, callback: (clients: Client[]) => void) {
  const path = 'clients';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as Client);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToCases(userId: string, callback: (cases: LegalCase[]) => void) {
  const path = 'cases';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: LegalCase[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as LegalCase);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToTemplates(userId: string, callback: (templates: DocumentTemplate[]) => void) {
  const path = 'templates';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: DocumentTemplate[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as DocumentTemplate);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToEvents(userId: string, callback: (events: ScheduledEvent[]) => void) {
  const path = 'events';
  const q = query(collection(db, path), where('userId', '==', userId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: ScheduledEvent[] = [];
      snapshot.forEach((docSnap) => {
        items.push({ id: docSnap.id, ...docSnap.data() } as ScheduledEvent);
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToSettings(userId: string, callback: (settings: FirmSettings) => void) {
  const path = `settings/${userId}`;
  return onSnapshot(
    doc(db, 'settings', userId),
    (docSnap) => {
      if (docSnap.exists()) {
        callback(docSnap.data() as FirmSettings);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Write/Mutation functions with userId tagging
export async function saveClientInFirestore(client: Client, userId: string) {
  const path = `clients/${client.id}`;
  try {
    await setDoc(doc(db, 'clients', client.id), { ...client, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteClientFromFirestore(clientId: string) {
  const path = `clients/${clientId}`;
  try {
    await deleteDoc(doc(db, 'clients', clientId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveCaseInFirestore(legalCase: LegalCase, userId: string) {
  const path = `cases/${legalCase.id}`;
  try {
    await setDoc(doc(db, 'cases', legalCase.id), { ...legalCase, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteCaseFromFirestore(caseId: string) {
  const path = `cases/${caseId}`;
  try {
    await deleteDoc(doc(db, 'cases', caseId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveTemplateInFirestore(template: DocumentTemplate, userId: string) {
  const path = `templates/${template.id}`;
  try {
    await setDoc(doc(db, 'templates', template.id), { ...template, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteTemplateFromFirestore(templateId: string) {
  const path = `templates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'templates', templateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveEventInFirestore(event: ScheduledEvent, userId: string) {
  const path = `events/${event.id}`;
  try {
    await setDoc(doc(db, 'events', event.id), { ...event, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteEventFromFirestore(eventId: string) {
  const path = `events/${eventId}`;
  try {
    await deleteDoc(doc(db, 'events', eventId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function saveSettingsInFirestore(settings: FirmSettings, userId: string) {
  const path = `settings/${userId}`;
  try {
    await setDoc(doc(db, 'settings', userId), { ...settings, userId }, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

