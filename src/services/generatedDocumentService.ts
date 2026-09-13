import {
  collection,
  doc,
  onSnapshot,
  query,
  setDoc,
  where,
} from '@firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { GeneratedDocument } from '../types/generatedDocument';

const sanitizeForFirestore = <T,>(data: T): T => {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map((item) => sanitizeForFirestore(item)) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleanObject: Record<string, unknown> = {};
    Object.entries(data as Record<string, unknown>).forEach(([key, value]) => {
      if (value !== undefined) {
        cleanObject[key] = sanitizeForFirestore(value);
      }
    });
    return cleanObject as T;
  }
  return data;
};

export function subscribeToGeneratedDocuments(
  firmId: string,
  callback: (documents: GeneratedDocument[]) => void
) {
  const path = 'generatedDocuments';
  const q = query(collection(db, path), where('firmId', '==', firmId));

  return onSnapshot(
    q,
    (snapshot) => {
      const documents = snapshot.docs.map((documentSnapshot) => ({
        id: documentSnapshot.id,
        ...documentSnapshot.data(),
      })) as GeneratedDocument[];

      documents.sort((a, b) => (b.updatedAt || '').localeCompare(a.updatedAt || ''));
      callback(documents);
    },
    (error) => {
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function saveGeneratedDocumentInFirestore(
  generatedDocument: GeneratedDocument,
  firmId: string
): Promise<boolean> {
  const path = `generatedDocuments/${generatedDocument.id}`;

  try {
    const documentWithFirm = {
      ...generatedDocument,
      firmId,
    };

    await setDoc(
      doc(db, 'generatedDocuments', generatedDocument.id),
      sanitizeForFirestore(documentWithFirm),
      { merge: true }
    );
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
    return false;
  }
}
