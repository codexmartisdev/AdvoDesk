import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  query,
  where,
  orderBy,
  limit,
  writeBatch,
} from 'firebase/firestore';
import { User } from 'firebase/auth';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import {
  Client,
  LegalCase,
  DocumentTemplate,
  ScheduledEvent,
  FirmSettings,
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowAuditLog,
  WorkflowStepInstance,
  UserProfile,
} from '../types';
import {
  TEMPLATES,
  USER_AVATAR_URL,
} from '../data/mockData';
import { INITIAL_WORKFLOWS } from '../data/defaultWorkflows';
import { getBrasiliaISO } from '../utils/dateUtils';

export const DEFAULT_FIRM_ID = 'firm-bizerra';

// Local storage cache keys for zero data loss
export const STORAGE_KEYS = {
  CLIENTS: 'bizerra_cache_clients_v2',
  CASES: 'bizerra_cache_cases_v2',
  EVENTS: 'bizerra_cache_events_v2',
  TEMPLATES: 'bizerra_cache_templates_v2',
  SETTINGS: 'bizerra_cache_settings_v2',
  DRAFT_CASE: 'bizerra_draft_case_v2',
  DRAFT_CLIENT: 'bizerra_draft_client_v2',
};

export function getLocalCache<T>(key: string, fallback: T): T {
  try {
    if (typeof window === 'undefined') return fallback;
    const stored = window.localStorage.getItem(key);
    if (!stored) return fallback;
    const parsed = JSON.parse(stored);
    return parsed ?? fallback;
  } catch (err) {
    console.warn(`[LocalCache] Read warning for ${key}:`, err);
    return fallback;
  }
}

export function setLocalCache<T>(key: string, data: T): void {
  try {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`[LocalCache] Write warning for ${key}:`, err);
  }
}

/**
 * Sanitiza objetos Client removendo propriedades legadas de credenciais (como meuInssPassword).
 * Impede que senhas legadas circulem na aplicação, sejam cacheadas ou regravadas no Firestore.
 */
export function sanitizeClient(client: Client | Record<string, unknown>): Client {
  if (!client || typeof client !== 'object') {
    return client as unknown as Client;
  }
  const { meuInssPassword: _legacyPassword, ...safeClient } = client as Record<string, unknown>;
  return safeClient as unknown as Client;
}

export function saveLocalClient(client: Client): void {
  const safe = sanitizeClient(client);
  const current = getLocalCache<Client[]>(STORAGE_KEYS.CLIENTS, []).map(sanitizeClient);
  const index = current.findIndex((c) => c.id === safe.id);
  let updated: Client[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = safe;
  } else {
    updated = [safe, ...current];
  }
  setLocalCache(STORAGE_KEYS.CLIENTS, updated);
}

export function removeLocalClient(clientId: string): void {
  const current = getLocalCache<Client[]>(STORAGE_KEYS.CLIENTS, []).map(sanitizeClient);
  setLocalCache(STORAGE_KEYS.CLIENTS, current.filter((c) => c.id !== clientId));
}

export function saveLocalCase(legalCase: LegalCase): void {
  const current = getLocalCache<LegalCase[]>(STORAGE_KEYS.CASES, []);
  const index = current.findIndex((c) => c.id === legalCase.id);
  let updated: LegalCase[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = legalCase;
  } else {
    updated = [legalCase, ...current];
  }
  setLocalCache(STORAGE_KEYS.CASES, updated);
}

export function removeLocalCase(caseId: string): void {
  const current = getLocalCache<LegalCase[]>(STORAGE_KEYS.CASES, []);
  setLocalCache(STORAGE_KEYS.CASES, current.filter((c) => c.id !== caseId));
}

export function saveLocalEvent(event: ScheduledEvent): void {
  const current = getLocalCache<ScheduledEvent[]>(STORAGE_KEYS.EVENTS, []);
  const index = current.findIndex((e) => e.id === event.id);
  let updated: ScheduledEvent[];
  if (index >= 0) {
    updated = [...current];
    updated[index] = event;
  } else {
    updated = [event, ...current];
  }
  setLocalCache(STORAGE_KEYS.EVENTS, updated);
}

export function removeLocalEvent(eventId: string): void {
  const current = getLocalCache<ScheduledEvent[]>(STORAGE_KEYS.EVENTS, []);
  setLocalCache(STORAGE_KEYS.EVENTS, current.filter((e) => e.id !== eventId));
}

export const DEFAULT_SETTINGS: FirmSettings = {
  firmName: '',
  firmSubtitle: '',
  logoUrl: '',
  lawyerName: '',
  lawyerTitle: '',
  lawyerAvatarUrl: '',
  oabNumber: '',
  notificationEmail: '',
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

function sanitizeForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObj: any = {};
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined) {
        cleanObj[key] = sanitizeForFirestore(value);
      }
    }
    return cleanObj as T;
  }
  return data;
}

export function createDefaultUserProfile(authUser: User): UserProfile {
  const isOwner = authUser.email === 'codex.martis.dev@gmail.com' || authUser.uid === 'usr-1';

  return {
    uid: authUser.uid,
    email: authUser.email || '',
    name: authUser.displayName || authUser.email?.split('@')[0] || (isOwner ? 'Dr. Bizerra Neto' : 'Advogado Associado'),
    avatarUrl: authUser.photoURL || USER_AVATAR_URL,
    firmId: DEFAULT_FIRM_ID,
    firmName: 'Bizerra Neto Advocacia',
    role: isOwner ? 'admin' : 'advogado',
    permissions: {
      canManageWorkflows: isOwner,
      canEditCases: true,
      canDeleteCases: isOwner,
      canManageUsers: isOwner,
      canEditSettings: isOwner,
    },
    createdAt: getBrasiliaISO(),
    updatedAt: getBrasiliaISO(),
  };
}

/**
 * Seed initial structure (settings, templates, workflows) without populating fake clients or cases
 */
export async function seedInitialFirestoreData(userProfile: UserProfile) {
  // Check if already executed in this session to prevent repeated queries
  try {
    if (typeof window !== 'undefined' && window.sessionStorage?.getItem('bizerra_db_seeded_v2')) {
      return;
    }
  } catch {
    // Ignore storage restrictions
  }

  // Only proceed if user has administrative rights or is system owner
  const isAuthorized = userProfile.role === 'admin' ||
    userProfile.permissions?.canManageWorkflows === true ||
    userProfile.email === 'codex.martis.dev@gmail.com';

  if (!isAuthorized) {
    return;
  }

  if (!userProfile.firmId) {
    console.error('[Firestore Seed Error] Cannot seed data without userProfile.firmId.');
    return;
  }

  const firmId = userProfile.firmId;

  try {
    // 1. Settings (Office settings and branding)
    const settingsRef = doc(db, 'settings', firmId);
    const settingsSnap = await getDoc(settingsRef);
    if (!settingsSnap.exists()) {
      await setDoc(
        settingsRef,
        sanitizeForFirestore({ ...DEFAULT_SETTINGS, firmId })
      );
    }

    // 2. Document Templates (Document generation templates like Procuração, Contrato, etc.)
    const templatesSnap = await getDocs(query(collection(db, 'templates'), where('firmId', '==', firmId), limit(1)));
    if (templatesSnap.empty) {
      for (const t of TEMPLATES) {
        await setDoc(doc(db, 'templates', t.id), sanitizeForFirestore({ ...t, firmId }));
      }
    }

    // 3. Workflow Templates Subcollection Seed (BPC, Auxílio-Doença, etc.)
    const wfTemplatesSnap = await getDocs(query(collection(db, 'workflowTemplates'), where('firmId', '==', firmId), limit(1)));
    if (wfTemplatesSnap.empty) {
      for (const wf of INITIAL_WORKFLOWS) {
        await saveWorkflowTemplateInFirestore(wf, firmId);
      }
    }

    try {
      if (typeof window !== 'undefined') {
        window.sessionStorage?.setItem('bizerra_db_seeded_v2', 'true');
      }
    } catch {
      // Ignore
    }
  } catch (error) {
    console.warn('Error or skipped seeding initial Firestore data:', error);
  }
}

// Subscribe to real-time collections with strict multitenant firmId filtering
export function subscribeToClients(firmId: string, callback: (clients: Client[]) => void) {
  const path = 'clients';
  const q = query(collection(db, path), where('firmId', '==', firmId));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Client[] = [];
      snapshot.forEach((docSnap) => {
        const raw = { id: docSnap.id, ...docSnap.data() };
        items.push(sanitizeClient(raw));
      });
      callback(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export function subscribeToCases(firmId: string, callback: (cases: LegalCase[]) => void) {
  const path = 'cases';
  const q = query(collection(db, path), where('firmId', '==', firmId));
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

export function subscribeToTemplates(firmId: string, callback: (templates: DocumentTemplate[]) => void) {
  const path = 'templates';
  const q = query(collection(db, path), where('firmId', '==', firmId));
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

export function subscribeToEvents(firmId: string, callback: (events: ScheduledEvent[]) => void) {
  const path = 'events';
  const q = query(collection(db, path), where('firmId', '==', firmId));
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

export function subscribeToSettings(firmId: string, callback: (settings: FirmSettings) => void) {
  const path = `settings/${firmId}`;
  return onSnapshot(
    doc(db, 'settings', firmId),
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data() as FirmSettings;
        callback({ ...data, firmId });
      } else {
        callback({ ...DEFAULT_SETTINGS, firmId });
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// --- WORKFLOW TEMPLATES (MODULAR SUBCOLLECTION PERSISTENCE) ---

export function subscribeToWorkflowTemplates(firmId: string, callback: (workflows: WorkflowTemplate[]) => void) {
  const path = 'workflowTemplates';
  const q = query(collection(db, path), where('firmId', '==', firmId));
  return onSnapshot(
    q,
    async (snapshot) => {
      try {
        const workflowsList: WorkflowTemplate[] = [];

        for (const docSnap of snapshot.docs) {
          const meta = docSnap.data();
          const templateId = docSnap.id;

          // Fetch active version document from workflowTemplates/{templateId}/versions/
          const versionsSnap = await getDocs(collection(db, 'workflowTemplates', templateId, 'versions'));
          let steps = meta.steps || [];
          let currentVersionData: any = {};

          if (!versionsSnap.empty) {
            // Find current version or default to highest version doc
            const sorted = versionsSnap.docs.map((v) => v.data()).sort((a, b) => (b.version || 0) - (a.version || 0));
            currentVersionData = sorted.find((v) => v.version === meta.version) || sorted[0];
            if (currentVersionData && currentVersionData.steps) {
              steps = currentVersionData.steps;
            }
          }

          const reconstructedWf: WorkflowTemplate = {
            id: templateId,
            code: meta.code || 'WF-CODE',
            title: meta.title || 'Workflow sem título',
            category: meta.category || 'Geral',
            typePill: meta.typePill || 'Processo',
            description: meta.description || '',
            processTypeIds: meta.processTypeIds || [],
            version: meta.version || 1,
            status: meta.status || 'published',
            publishedAt: meta.publishedAt || getBrasiliaISO(),
            author: meta.author || 'Equipe',
            estimatedTotalDays: meta.estimatedTotalDays || 0,
            active: meta.active ?? true,
            createdAt: meta.createdAt || getBrasiliaISO(),
            updatedAt: meta.updatedAt || getBrasiliaISO(),
            steps: steps,
          };

          workflowsList.push(reconstructedWf);
        }

        callback(workflowsList.length > 0 ? workflowsList : INITIAL_WORKFLOWS);
      } catch (err) {
        console.error('Error hydrating workflowTemplates subcollections:', err);
        callback(INITIAL_WORKFLOWS);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveWorkflowTemplateInFirestore(template: WorkflowTemplate, firmId: string) {
  const templatePath = `workflowTemplates/${template.id}`;
  const versionId = `v${template.version || 1}`;
  const versionPath = `workflowTemplates/${template.id}/versions/${versionId}`;

  try {
    // 1. Save metadata in main document workflowTemplates/{templateId}
    const metadata = {
      id: template.id,
      firmId,
      code: template.code,
      title: template.title,
      category: template.category,
      typePill: template.typePill,
      description: template.description,
      processTypeIds: template.processTypeIds,
      version: template.version,
      status: template.status,
      publishedAt: template.publishedAt,
      author: template.author,
      estimatedTotalDays: template.estimatedTotalDays,
      active: template.active ?? true,
      createdAt: template.createdAt,
      updatedAt: getBrasiliaISO(),
      currentVersionId: versionId,
    };
    await setDoc(doc(db, 'workflowTemplates', template.id), sanitizeForFirestore(metadata), { merge: true });

    // 2. Save complete version configuration in subcollection workflowTemplates/{templateId}/versions/{versionId}
    const versionDocData = {
      id: versionId,
      version: template.version,
      status: template.status,
      publishedAt: template.publishedAt,
      createdAt: template.createdAt,
      updatedAt: getBrasiliaISO(),
      author: template.author,
      steps: template.steps,
    };
    await setDoc(doc(db, 'workflowTemplates', template.id, 'versions', versionId), sanitizeForFirestore(versionDocData), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, templatePath);
  }
}

export async function deleteWorkflowTemplateFromFirestore(templateId: string) {
  const path = `workflowTemplates/${templateId}`;
  try {
    await deleteDoc(doc(db, 'workflowTemplates', templateId));
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

// --- WORKFLOW INSTANCES & AUDIT LOGS (MODULAR SUBCOLLECTIONS) ---

export async function saveWorkflowInstanceInFirestore(instance: WorkflowInstance, firmId: string) {
  const instancePath = `workflowInstances/${instance.id}`;

  try {
    const batch = writeBatch(db);

    // 1. Main instance document
    const instanceRef = doc(db, 'workflowInstances', instance.id);
    const instanceMeta = {
      id: instance.id,
      firmId,
      caseId: instance.caseId,
      clientId: instance.clientId,
      templateId: instance.templateId,
      templateCode: instance.templateCode,
      templateTitle: instance.templateTitle,
      version: instance.version,
      processTypeId: instance.processTypeId,
      status: instance.status,
      currentStepId: instance.currentStepId,
      startedAt: instance.startedAt,
      updatedAt: getBrasiliaISO(),
      completedAt: instance.completedAt || null,
      variables: instance.variables || {},
      templateSnapshot: instance.templateSnapshot,
    };
    batch.set(instanceRef, sanitizeForFirestore(instanceMeta), { merge: true });

    // 2. Step Instances subcollection
    if (instance.steps && instance.steps.length > 0) {
      for (const stepInst of instance.steps) {
        const stepRef = doc(db, 'workflowInstances', instance.id, 'steps', stepInst.id);
        batch.set(stepRef, sanitizeForFirestore(stepInst), { merge: true });
      }
    }

    // 3. Audit Logs append-only subcollection
    if (instance.auditLogs && instance.auditLogs.length > 0) {
      for (const log of instance.auditLogs) {
        const logRef = doc(db, 'workflowInstances', instance.id, 'auditLogs', log.id);
        batch.set(logRef, sanitizeForFirestore(log), { merge: true });
      }
    }

    // 4. Update parent LegalCase document atomically
    if (instance.caseId) {
      const caseRef = doc(db, 'cases', instance.caseId);
      batch.update(caseRef, {
        workflowInstanceId: instance.id,
        workflowTemplateId: instance.templateId,
        workflowVersion: instance.version,
        currentStepId: instance.currentStepId,
        workflowStatus: instance.status,
        workflowInstance: sanitizeForFirestore({ ...instance, firmId }),
      });
    }

    // Commit entire transaction batch atomically
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, instancePath);
  }
}

/**
 * Add a single audit log event to the append-only subcollection: workflowInstances/{instanceId}/auditLogs/{logId}
 */
export async function addWorkflowAuditLog(instanceId: string, log: WorkflowAuditLog) {
  const logPath = `workflowInstances/${instanceId}/auditLogs/${log.id}`;
  try {
    await setDoc(
      doc(db, 'workflowInstances', instanceId, 'auditLogs', log.id),
      sanitizeForFirestore(log),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, logPath);
  }
}

/**
 * Subscribe to paginated audit logs for a workflow instance, ordered by timestamp desc
 */
export function subscribeToWorkflowAuditLogs(
  instanceId: string,
  limitCount: number = 30,
  callback: (logs: WorkflowAuditLog[]) => void
) {
  const path = `workflowInstances/${instanceId}/auditLogs`;
  const q = query(
    collection(db, 'workflowInstances', instanceId, 'auditLogs'),
    orderBy('timestamp', 'desc'),
    limit(limitCount)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const logs: WorkflowAuditLog[] = [];
      snapshot.forEach((docSnap) => {
        logs.push({ id: docSnap.id, ...docSnap.data() } as WorkflowAuditLog);
      });
      callback(logs);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

// --- USER PROFILE & PERMISSIONS MANAGEMENT ---

export async function getUserProfileInFirestore(uid: string): Promise<UserProfile | null> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error: any) {
    const isOffline = error?.message?.includes('the client is offline') ||
      error?.message?.includes('offline') ||
      error?.code === 'unavailable';
    if (isOffline) {
      console.warn('[Firestore Offline] Client is offline; proceeding with local user profile.');
    } else {
      console.warn('Unable to fetch remote user profile:', error);
    }
    return null;
  }
}

export async function ensureUserProfileInFirestore(authUser: User): Promise<UserProfile | null> {
  const isOwner = authUser.email === 'codex.martis.dev@gmail.com';

  const userRef = doc(db, 'users', authUser.uid);
  try {
    const existing = await getUserProfileInFirestore(authUser.uid);
    if (existing) {
      return existing;
    }

    // Temporary bootstrap exception: only the owner account is auto-created if profile doesn't exist
    if (isOwner) {
      const ownerProfile: UserProfile = {
        uid: authUser.uid,
        email: authUser.email || 'codex.martis.dev@gmail.com',
        name: authUser.displayName || 'Dr. Bizerra Neto',
        avatarUrl: authUser.photoURL || USER_AVATAR_URL,
        firmId: DEFAULT_FIRM_ID,
        firmName: 'Bizerra Neto Advocacia',
        role: 'admin',
        permissions: {
          canManageWorkflows: true,
          canEditCases: true,
          canDeleteCases: true,
          canManageUsers: true,
          canEditSettings: true,
        },
        createdAt: getBrasiliaISO(),
        updatedAt: getBrasiliaISO(),
      };

      await setDoc(userRef, sanitizeForFirestore(ownerProfile), { merge: true });
      return ownerProfile;
    }

    // Common user without existing profile in Firestore: do not auto-create, do not assign DEFAULT_FIRM_ID
    return null;
  } catch (error: any) {
    console.error('Error in ensureUserProfileInFirestore:', error);
    return null;
  }
}

export function subscribeToUserProfile(uid: string, callback: (profile: UserProfile | null) => void) {
  const userRef = doc(db, 'users', uid);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        callback(snap.data() as UserProfile);
      } else {
        callback(null);
      }
    },
    (error: any) => {
      const isOffline = error?.message?.includes('the client is offline') ||
        error?.message?.includes('offline') ||
        error?.code === 'unavailable';
      if (!isOffline) {
        console.warn('UserProfile listener notice:', error);
      }
      callback(null);
    }
  );
}

export async function saveUserProfileInFirestore(profile: UserProfile) {
  const path = `users/${profile.uid}`;
  try {
    await setDoc(doc(db, 'users', profile.uid), sanitizeForFirestore(profile), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// Write/Mutation functions
export async function saveClientInFirestore(client: Client, firmId: string) {
  const safeClient = sanitizeClient(client);
  const path = `clients/${safeClient.id}`;
  try {
    const dataWithFirm = { ...safeClient, firmId };
    await setDoc(doc(db, 'clients', safeClient.id), sanitizeForFirestore(dataWithFirm), { merge: true });
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

export async function saveCaseInFirestore(legalCase: LegalCase, firmId: string) {
  const path = `cases/${legalCase.id}`;
  try {
    const dataWithFirm = { ...legalCase, firmId };
    await setDoc(doc(db, 'cases', legalCase.id), sanitizeForFirestore(dataWithFirm), { merge: true });
    // Also sync workflowInstance subcollection if embedded
    if (legalCase.workflowInstance) {
      await saveWorkflowInstanceInFirestore(legalCase.workflowInstance, firmId);
    }
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

export async function saveTemplateInFirestore(template: DocumentTemplate, firmId: string) {
  const path = `templates/${template.id}`;
  try {
    const dataWithFirm = { ...template, firmId };
    await setDoc(doc(db, 'templates', template.id), sanitizeForFirestore(dataWithFirm), { merge: true });
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

export async function saveEventInFirestore(event: ScheduledEvent, firmId: string) {
  const path = `events/${event.id}`;
  try {
    const dataWithFirm = { ...event, firmId };
    await setDoc(doc(db, 'events', event.id), sanitizeForFirestore(dataWithFirm), { merge: true });
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

export async function saveSettingsInFirestore(settings: FirmSettings, firmId: string) {
  const path = `settings/${firmId}`;
  try {
    const dataWithFirm = { ...settings, firmId };
    await setDoc(doc(db, 'settings', firmId), sanitizeForFirestore(dataWithFirm), { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

