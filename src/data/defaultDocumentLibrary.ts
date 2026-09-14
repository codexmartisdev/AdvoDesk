import { DocumentTemplate } from '../types';
import { TEMPLATES as LEGACY_TEMPLATES } from './mockData';

export const ADVODESK_DOCUMENT_LIBRARY_VERSION = 1;
export const ADVODESK_BASE_ORIGIN_LABEL = 'Modelo base AdvoDesk';

export interface AdvodeskBaseTemplateDefinition {
  libraryKey: string;
  libraryVersion: number;
  legacyTemplateIds: string[];
  template: Omit<DocumentTemplate, 'id'>;
}

const LEGACY_LIBRARY_KEYS: Record<string, string> = {
  'tpl-procuracao-previdenciaria': 'previdenciario-procuracao-completa',
};

const toBaseDefinition = (template: DocumentTemplate): AdvodeskBaseTemplateDefinition => {
  const { id, ...templateWithoutId } = template;
  return {
    libraryKey: LEGACY_LIBRARY_KEYS[id] || `legacy-${id}`,
    libraryVersion: ADVODESK_DOCUMENT_LIBRARY_VERSION,
    legacyTemplateIds: [id],
    template: templateWithoutId,
  };
};

/**
 * Catálogo oficial de modelos-base distribuídos pelo AdvoDesk.
 *
 * A Etapa 01 apenas registra a infraestrutura e adota a minuta que já existia
 * no produto. As próximas etapas acrescentam novas definições neste catálogo,
 * sempre com uma libraryKey nova e estável.
 */
export const ADVODESK_BASE_TEMPLATE_CATALOG: AdvodeskBaseTemplateDefinition[] =
  LEGACY_TEMPLATES.map(toBaseDefinition);

export const ADVODESK_BASE_DOCUMENT_CATEGORIES = Array.from(
  new Set(ADVODESK_BASE_TEMPLATE_CATALOG.map((item) => item.template.category).filter(Boolean))
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const ADVODESK_BASE_DOCUMENT_FORMATS = Array.from(
  new Set(
    ADVODESK_BASE_TEMPLATE_CATALOG
      .map((item) => item.template.format)
      .filter((value): value is string => Boolean(value))
  )
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

const safeIdPart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const buildAdvodeskBaseTemplateId = (firmId: string, libraryKey: string) =>
  `advodesk-base-${safeIdPart(firmId)}-${safeIdPart(libraryKey)}`;
