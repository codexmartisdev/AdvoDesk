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
import { BpcAvaliacaoItem } from '../types/bpc';
import { appendBpcAuditEventSafely } from './bpcAuditFirestoreService';

type PersistedBpcAvaliacao = BpcAvaliacaoItem & {
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

export function subscribeToBpcAvaliacoes(
  firmId: string,
  onAvaliacoesChanged: (items: BpcAvaliacaoItem[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'bpcAvaliacoes';
  const avaliacoesQuery = query(
    collection(db, path),
    where('firmId', '==', firmId)
  );

  return onSnapshot(
    avaliacoesQuery,
    (snapshot) => {
      const items = snapshot.docs.map((snapshotDoc) => {
        const persisted = snapshotDoc.data() as PersistedBpcAvaliacao;
        const { firmId: _firmId, ...itemData } = persisted;

        return {
          ...itemData,
          id: snapshotDoc.id,
        } as BpcAvaliacaoItem;
      });

      onAvaliacoesChanged(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError?.(error);
    }
  );
}

export async function saveBpcAvaliacaoInFirestore(
  item: BpcAvaliacaoItem,
  firmId: string
): Promise<void> {
  const path = `bpcAvaliacoes/${item.id}`;
  const itemRef = doc(db, 'bpcAvaliacoes', item.id);

  try {
    const previousSnapshot = await getDoc(itemRef);
    const previousItem = previousSnapshot.exists()
      ? (previousSnapshot.data() as PersistedBpcAvaliacao)
      : null;

    const persistedItem: PersistedBpcAvaliacao = {
      ...item,
      firmId,
    };

    await setDoc(itemRef, removeUndefined(persistedItem));

    let action = 'Avaliação criada';
    let description = `${item.type} registrada para ${item.date} com situação ${item.status}.`;

    if (previousItem) {
      if (previousItem.status !== item.status) {
        action = 'Situação da avaliação atualizada';
        description = `${item.type}: situação alterada de ${previousItem.status} para ${item.status}.`;
      } else {
        action = 'Avaliação atualizada';
        description = `${item.type} atualizada para ${item.date}.`;
      }
    }

    await appendBpcAuditEventSafely(
      {
        caseId: item.caseId,
        clientName: item.clientName,
        category: 'Avaliação',
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
