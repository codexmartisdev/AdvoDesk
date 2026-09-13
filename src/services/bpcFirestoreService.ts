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
import { appendBpcAuditEventSafely } from './bpcAuditFirestoreService';

type PersistedBpcCase = BpcCaseItem & {
  firmId: string;
};

type BpcCaseAudit = {
  action: string;
  description: string;
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
  firmId: string,
  audit?: BpcCaseAudit
): Promise<void> {
  const path = `bpcCases/${bpcCase.id}`;
  const caseRef = doc(db, 'bpcCases', bpcCase.id);

  try {
    const persistedCase: PersistedBpcCase = {
      ...bpcCase,
      firmId,
    };

    // O caso BPC é salvo como registro completo. Assim, campos opcionais
    // removidos na edição também deixam de existir no Firestore.
    await setDoc(caseRef, removeUndefined(persistedCase));

    await appendBpcAuditEventSafely(
      {
        caseId: bpcCase.id,
        clientName: bpcCase.clientName,
        category: 'Caso',
        action: audit?.action || 'Caso atualizado',
        description: audit?.description || 'Dados do caso BPC atualizados.',
      },
      firmId
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    throw error;
  }
}
