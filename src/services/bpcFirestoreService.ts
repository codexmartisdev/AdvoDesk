import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from '@firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { BpcCaseItem } from '../types/bpc';

type PersistedBpcCase = BpcCaseItem & {
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

export function subscribeToBpcCases(
  firmId: string,
  onCasesChanged: (cases: BpcCaseItem[]) => void,
  onError?: (error: unknown) => void
) {
  const path = 'bpcCases';
  const bpcCasesQuery = query(
    collection(db, path),
    where('firmId', '==', firmId)
  );

  return onSnapshot(
    bpcCasesQuery,
    (snapshot) => {
      const cases = snapshot.docs.map((snapshotDoc) => {
        const persisted = snapshotDoc.data() as PersistedBpcCase;
        const { firmId: _firmId, ...caseData } = persisted;

        return {
          ...caseData,
          id: snapshotDoc.id,
        } as BpcCaseItem;
      });

      onCasesChanged(cases);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
      onError?.(error);
    }
  );
}

export async function saveBpcCaseInFirestore(
  bpcCase: BpcCaseItem,
  firmId: string
): Promise<void> {
  const path = `bpcCases/${bpcCase.id}`;

  try {
    const persistedCase: PersistedBpcCase = {
      ...bpcCase,
      firmId,
    };

    await setDoc(
      doc(db, 'bpcCases', bpcCase.id),
      removeUndefined(persistedCase),
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
