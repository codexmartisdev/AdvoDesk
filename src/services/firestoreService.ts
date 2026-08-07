import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
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
 * Seed initial data if Firestore collections are empty
 */
export async function seedInitialFirestoreData() {
  try {
    // 1. Settings
    const settingsRef = doc(db, 'settings', 'firmSettings');
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(settingsRef, DEFAULT_SETTINGS);
    }

    // 2. Clients
    const clientsSnap = await getDocs(collection(db, 'clients'));
    if (clientsSnap.empty) {
      for (const client of INITIAL_CLIENTS) {
        await setDoc(doc(db, 'clients', client.id), client);
      }
    }

    // 3. Cases
    const casesSnap = await getDocs(collection(db, 'cases'));
    if (casesSnap.empty) {
      for (const c of INITIAL_CASES) {
        await setDoc(doc(db, 'cases', c.id), c);
      }
    }

    // 4. Templates
    const templatesSnap = await getDocs(collection(db, 'templates'));
    if (templatesSnap.empty) {
      for (const t of TEMPLATES) {
        await setDoc(doc(db, 'templates', t.id), t);
      }
    }

    // 5. Events
    const eventsSnap = await getDocs(collection(db, 'events'));
    if (eventsSnap.empty) {
      for (const ev of SCHEDULED_EVENTS) {
        await setDoc(doc(db, 'events', ev.id), ev);
      }
    }
  } catch (error) {
    console.error('Error seeding initial Firestore data:', error);
  }
}

// Subscribe to real-time collections
export function subscribeToClients(callback: (clients: Client[]) => void) {
  const path = 'clients';
  return onSnapshot(
    collection(db, path),
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

export function subscribeToCases(callback: (cases: LegalCase[]) => void) {
  const path = 'cases';
  return onSnapshot(
    collection(db, path),
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

export function subscribeToTemplates(callback: (templates: DocumentTemplate[]) => void) {
  const path = 'templates';
  return onSnapshot(
    collection(db, path),
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

export function subscribeToEvents(callback: (events: ScheduledEvent[]) => void) {
  const path = 'events';
  return onSnapshot(
    collection(db, path),
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

export function subscribeToSettings(callback: (settings: FirmSettings) => void) {
  const path = 'settings/firmSettings';
  return onSnapshot(
    doc(db, 'settings', 'firmSettings'),
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

// Write/Mutation functions
export async function saveClientInFirestore(client: Client) {
  const path = `clients/${client.id}`;
  try {
    await setDoc(doc(db, 'clients', client.id), client, { merge: true });
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

export async function saveCaseInFirestore(legalCase: LegalCase) {
  const path = `cases/${legalCase.id}`;
  try {
    await setDoc(doc(db, 'cases', legalCase.id), legalCase, { merge: true });
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

export async function saveTemplateInFirestore(template: DocumentTemplate) {
  const path = `templates/${template.id}`;
  try {
    await setDoc(doc(db, 'templates', template.id), template, { merge: true });
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

export async function saveEventInFirestore(event: ScheduledEvent) {
  const path = `events/${event.id}`;
  try {
    await setDoc(doc(db, 'events', event.id), event, { merge: true });
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

export async function saveSettingsInFirestore(settings: FirmSettings) {
  const path = 'settings/firmSettings';
  try {
    await setDoc(doc(db, 'settings', 'firmSettings'), settings, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
