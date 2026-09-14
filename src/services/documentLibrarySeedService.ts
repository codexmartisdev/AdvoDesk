import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  setDoc,
  where,
} from '@firebase/firestore';
import { DocumentTemplate, FirmSettings } from '../types';
import { db } from '../lib/firebase';
import { getBrasiliaISO } from '../utils/dateUtils';
import {
  ADVODESK_BASE_DOCUMENT_CATEGORIES,
  ADVODESK_BASE_DOCUMENT_FORMATS,
  ADVODESK_BASE_ORIGIN_LABEL,
  ADVODESK_BASE_TEMPLATE_CATALOG,
  ADVODESK_DOCUMENT_LIBRARY_VERSION,
  buildAdvodeskBaseTemplateId,
} from '../data/defaultDocumentLibrary';
import { DEFAULT_SETTINGS } from './firestoreService';

type LibraryTemplate = DocumentTemplate & {
  firmId?: string;
  origin?: 'advodesk-base' | 'custom';
  originLabel?: string;
  libraryKey?: string;
  libraryVersion?: number;
  libraryRegisteredAt?: string;
  status?: 'Ativo' | 'Arquivado';
  archivedAt?: string | null;
  createdAt?: string;
  updatedAt?: string;
};

type LibrarySettings = FirmSettings & {
  firmId?: string;
  documentCategories?: string[];
  documentFormats?: string[];
  documentBaseTemplateSeededKeys?: string[];
  documentBaseLibraryVersion?: number;
};

export interface DocumentLibrarySeedResult {
  created: number;
  adopted: number;
  skipped: number;
  seededKeys: string[];
}

const normalizeIdentity = (value?: string) =>
  (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/\s+/g, ' ')
    .trim();

const mergeCatalog = (current: string[] | undefined, required: string[]) => {
  const result: string[] = [];
  [...(current || []), ...required].forEach((value) => {
    const clean = value?.trim();
    if (!clean) return;
    if (!result.some((item) => item.localeCompare(clean, 'pt-BR', { sensitivity: 'base' }) === 0)) {
      result.push(clean);
    }
  });
  return result;
};

const getSessionSeedKey = (firmId: string) =>
  `advodesk_document_library_seed_v${ADVODESK_DOCUMENT_LIBRARY_VERSION}_${firmId}`;

const alreadySeededThisSession = (firmId: string) => {
  try {
    return typeof window !== 'undefined' && window.sessionStorage?.getItem(getSessionSeedKey(firmId)) === 'true';
  } catch {
    return false;
  }
};

const markSeededThisSession = (firmId: string) => {
  try {
    if (typeof window !== 'undefined') {
      window.sessionStorage?.setItem(getSessionSeedKey(firmId), 'true');
    }
  } catch {
    // Session storage is only an optimization. Firestore remains the source of truth.
  }
};

const isEquivalentExistingTemplate = (
  existing: LibraryTemplate,
  definition: (typeof ADVODESK_BASE_TEMPLATE_CATALOG)[number]
) => {
  if (existing.libraryKey === definition.libraryKey) return true;
  if (definition.legacyTemplateIds.includes(existing.id)) return true;

  return normalizeIdentity(existing.title) === normalizeIdentity(definition.template.title)
    && normalizeIdentity(existing.category) === normalizeIdentity(definition.template.category)
    && normalizeIdentity(existing.format) === normalizeIdentity(definition.template.format);
};

/**
 * Registra a biblioteca-base de forma incremental e não destrutiva.
 *
 * Regras:
 * - cada libraryKey é disponibilizada no máximo uma vez por escritório;
 * - modelos já existentes são adotados sem alterar título, conteúdo ou status;
 * - modelos editados/arquivados nunca são sobrescritos;
 * - se uma base previamente registrada for removida, ela não é recriada;
 * - novas versões da biblioteca adicionam somente novas libraryKeys.
 */
export async function seedAdvodeskDocumentLibrary(firmId: string): Promise<DocumentLibrarySeedResult> {
  if (!firmId.trim()) {
    throw new Error('Não é possível inicializar a biblioteca documental sem firmId.');
  }

  if (alreadySeededThisSession(firmId)) {
    return { created: 0, adopted: 0, skipped: ADVODESK_BASE_TEMPLATE_CATALOG.length, seededKeys: [] };
  }

  const settingsRef = doc(db, 'settings', firmId);
  const settingsSnap = await getDoc(settingsRef);
  const currentSettings: LibrarySettings = settingsSnap.exists()
    ? ({ ...settingsSnap.data(), firmId } as LibrarySettings)
    : ({ ...DEFAULT_SETTINGS, firmId } as LibrarySettings);

  const previouslySeededKeys = new Set(currentSettings.documentBaseTemplateSeededKeys || []);
  const nextSeededKeys = new Set(previouslySeededKeys);

  const templatesSnap = await getDocs(
    query(collection(db, 'templates'), where('firmId', '==', firmId))
  );
  const existingTemplates: LibraryTemplate[] = templatesSnap.docs.map((snapshot) => ({
    id: snapshot.id,
    ...snapshot.data(),
  } as LibraryTemplate));

  let created = 0;
  let adopted = 0;
  let skipped = 0;
  const now = getBrasiliaISO();

  for (const definition of ADVODESK_BASE_TEMPLATE_CATALOG) {
    if (previouslySeededKeys.has(definition.libraryKey)) {
      skipped += 1;
      continue;
    }

    const existing = existingTemplates.find((template) =>
      isEquivalentExistingTemplate(template, definition)
    );

    if (existing) {
      await setDoc(
        doc(db, 'templates', existing.id),
        {
          origin: 'advodesk-base',
          originLabel: ADVODESK_BASE_ORIGIN_LABEL,
          libraryKey: definition.libraryKey,
          libraryVersion: definition.libraryVersion,
          libraryRegisteredAt: existing.libraryRegisteredAt || now,
        },
        { merge: true }
      );
      adopted += 1;
    } else {
      const templateId = buildAdvodeskBaseTemplateId(firmId, definition.libraryKey);
      const template: LibraryTemplate = {
        id: templateId,
        ...definition.template,
        status: 'Ativo',
        archivedAt: null,
        origin: 'advodesk-base',
        originLabel: ADVODESK_BASE_ORIGIN_LABEL,
        libraryKey: definition.libraryKey,
        libraryVersion: definition.libraryVersion,
        libraryRegisteredAt: now,
        createdAt: now,
        updatedAt: now,
        firmId,
      };
      await setDoc(doc(db, 'templates', templateId), template);
      created += 1;
    }

    nextSeededKeys.add(definition.libraryKey);
  }

  const nextCategories = mergeCatalog(
    currentSettings.documentCategories,
    ADVODESK_BASE_DOCUMENT_CATEGORIES
  );
  const nextFormats = mergeCatalog(
    currentSettings.documentFormats,
    ADVODESK_BASE_DOCUMENT_FORMATS
  );

  await setDoc(
    settingsRef,
    {
      ...(settingsSnap.exists() ? {} : { ...DEFAULT_SETTINGS, firmId }),
      documentCategories: nextCategories,
      documentFormats: nextFormats,
      documentBaseTemplateSeededKeys: Array.from(nextSeededKeys),
      documentBaseLibraryVersion: ADVODESK_DOCUMENT_LIBRARY_VERSION,
    },
    { merge: true }
  );

  markSeededThisSession(firmId);

  return {
    created,
    adopted,
    skipped,
    seededKeys: Array.from(nextSeededKeys),
  };
}
