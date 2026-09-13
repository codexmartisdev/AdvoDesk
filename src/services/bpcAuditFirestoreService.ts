import {
  addDoc,
  collection,
  onSnapshot,
  query,
  where,
} from '@firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BpcAuditCategory, BpcAuditItem } from '../types/bpc';

type PersistedBpcAudit = Omit<BpcAuditItem, 'id'> & {
  firmId: string;
};

export interface AppendBpcAuditInput {
  caseId: string;
  clientName: string;
  category: BpcAuditCategory;
  action: string;
  description: string;
}

export function subscribeToBpcAudits(
  firmId: string,
  onAuditsChanged: (items: BpcAuditItem[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'bpcAuditorias';
  const auditsQuery = query(
    collection(db, path),
    where('firmId', '==', firmId)
  );

  return onSnapshot(
    auditsQuery,
    (snapshot) => {
      const items = snapshot.docs
        .map((snapshotDoc) => {
          const persisted = snapshotDoc.data() as PersistedBpcAudit;
          const { firmId: _firmId, ...itemData } = persisted;

          return {
            ...itemData,
            id: snapshotDoc.id,
          } as BpcAuditItem;
        })
        .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));

      onAuditsChanged(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError?.(error);
    }
  );
}

export async function appendBpcAuditEvent(
  input: AppendBpcAuditInput,
  firmId: string
): Promise<void> {
  const currentUser = auth.currentUser;
  const actorUid = currentUser?.uid || 'unknown';
  const actorLabel =
    currentUser?.displayName?.trim() ||
    currentUser?.email?.trim() ||
    'Usuário autenticado';

  const persistedItem: PersistedBpcAudit = {
    ...input,
    firmId,
    actorUid,
    actorLabel,
    occurredAt: new Date().toISOString(),
  };

  try {
    await addDoc(collection(db, 'bpcAuditorias'), persistedItem);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'bpcAuditorias');
    throw error;
  }
}

export async function appendBpcAuditEventSafely(
  input: AppendBpcAuditInput,
  firmId: string
): Promise<void> {
  try {
    await appendBpcAuditEvent(input, firmId);
  } catch (error) {
    // A falha de auditoria não desfaz a operação principal já persistida.
    console.error('Não foi possível registrar auditoria BPC:', error);
  }
}
