import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  setDoc,
  where,
} from '@firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BpcDeadlineItem } from '../types/bpc';
import { appendBpcAuditEventSafely } from './bpcAuditFirestoreService';

type PersistedBpcDeadline = BpcDeadlineItem & {
  firmId: string;
};

function removeUndefined<T>(value: T): T {
  if (value === null || value === undefined) return value;

  if (Array.isArray(value)) {
    return value.map((item) => removeUndefined(item)) as unknown as T;
  }

  if (typeof value === 'object' && !(value instanceof Date)) {
    const clean: Record<string, unknown> = {};

    for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
      if (item !== undefined) {
        clean[key] = removeUndefined(item);
      }
    }

    return clean as T;
  }

  return value;
}

export function subscribeToBpcDeadlines(
  firmId: string,
  onDeadlinesChanged: (items: BpcDeadlineItem[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'bpcPrazos';
  const deadlinesQuery = query(
    collection(db, path),
    where('firmId', '==', firmId)
  );

  return onSnapshot(
    deadlinesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((snapshotDoc) => {
        const persisted = snapshotDoc.data() as PersistedBpcDeadline;
        const { firmId: _firmId, ...itemData } = persisted;

        return {
          ...itemData,
          id: snapshotDoc.id,
        } as BpcDeadlineItem;
      });

      onDeadlinesChanged(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError?.(error);
    }
  );
}

export async function saveBpcDeadlineInFirestore(
  item: BpcDeadlineItem,
  firmId: string
): Promise<void> {
  const path = `bpcPrazos/${item.id}`;
  const itemRef = doc(db, 'bpcPrazos', item.id);

  try {
    const previousSnapshot = await getDoc(itemRef);
    const previousItem = previousSnapshot.exists()
      ? (previousSnapshot.data() as PersistedBpcDeadline)
      : null;

    const persistedItem: PersistedBpcDeadline = {
      ...item,
      firmId,
    };

    await setDoc(itemRef, removeUndefined(persistedItem));

    let action = 'Prazo criado';
    let description = `${item.title} — ${item.type} — data ${item.date}.`;

    if (previousItem) {
      if (previousItem.status !== 'Concluído' && item.status === 'Concluído') {
        action = 'Prazo concluído';
      } else if (previousItem.status === 'Concluído' && item.status === 'Pendente') {
        action = 'Prazo reaberto';
      } else {
        action = 'Prazo atualizado';
      }

      description = `${item.title} — ${item.type} — data ${item.date}.`;
    }

    await appendBpcAuditEventSafely(
      {
        caseId: item.caseId,
        clientName: item.clientName,
        category: 'Prazo',
        action,
        description,
      },
      firmId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
