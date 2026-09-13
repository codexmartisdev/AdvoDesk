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
import { BpcCaseItem } from '../types/bpc';
import { appendBpcAuditEventSafely } from './bpcAuditFirestoreService';

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
  const caseRef = doc(db, 'bpcCases', bpcCase.id);

  try {
    const previousSnapshot = await getDoc(caseRef);
    const previousCase = previousSnapshot.exists()
      ? (previousSnapshot.data() as PersistedBpcCase)
      : null;

    const persistedCase: PersistedBpcCase = {
      ...bpcCase,
      firmId,
    };

    // O caso BPC é salvo como registro completo. Assim, campos opcionais
    // removidos na edição também deixam de existir no Firestore.
    await setDoc(caseRef, removeUndefined(persistedCase));

    let action = 'Caso criado';
    let description = `Caso BPC ${bpcCase.modality === 'pcd' ? 'PCD' : 'Idoso'} criado com status ${bpcCase.status}.`;

    if (previousCase) {
      if (!previousCase.archivedAt && bpcCase.archivedAt) {
        action = 'Caso arquivado';
        description = 'Caso BPC arquivado e retirado da operação diária.';
      } else if (previousCase.archivedAt && !bpcCase.archivedAt) {
        action = 'Caso restaurado';
        description = 'Caso BPC restaurado para a operação diária.';
      } else if (previousCase.status !== bpcCase.status) {
        action = 'Status do caso atualizado';
        description = `Status alterado de ${previousCase.status} para ${bpcCase.status}.`;
      } else {
        action = 'Caso atualizado';
        description = 'Dados do caso BPC atualizados.';
      }
    }

    await appendBpcAuditEventSafely(
      {
        caseId: bpcCase.id,
        clientName: bpcCase.clientName,
        category: 'Caso',
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
