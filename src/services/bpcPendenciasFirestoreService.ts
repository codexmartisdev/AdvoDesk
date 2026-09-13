import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from '@firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BpcPendenciaItem } from '../types/bpc';

type PersistedBpcPendencia = BpcPendenciaItem & {
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

export function subscribeToBpcPendencias(
  firmId: string,
  onPendenciasChanged: (items: BpcPendenciaItem[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'bpcPendencias';
  const pendenciasQuery = query(
    collection(db, path),
    where('firmId', '==', firmId)
  );

  return onSnapshot(
    pendenciasQuery,
    (snapshot) => {
      const items = snapshot.docs.map((snapshotDoc) => {
        const persisted = snapshotDoc.data() as PersistedBpcPendencia;
        const { firmId: _firmId, ...itemData } = persisted;

        return {
          ...itemData,
          id: snapshotDoc.id,
        } as BpcPendenciaItem;
      });

      onPendenciasChanged(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError?.(error);
    }
  );
}

export async function saveBpcPendenciaInFirestore(
  item: BpcPendenciaItem,
  firmId: string
): Promise<void> {
  const path = `bpcPendencias/${item.id}`;

  try {
    const persistedItem: PersistedBpcPendencia = {
      ...item,
      firmId,
    };

    await setDoc(
      doc(db, 'bpcPendencias', item.id),
      removeUndefined(persistedItem)
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
