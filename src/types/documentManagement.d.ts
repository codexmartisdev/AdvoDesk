import '../types';

declare module '../types' {
  interface DocumentTemplate {
    status?: 'Ativo' | 'Arquivado';
    archivedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
    origin?: 'advodesk-base' | 'custom';
    originLabel?: string;
    libraryKey?: string;
    libraryVersion?: number;
    libraryRegisteredAt?: string;
  }

  interface FirmSettings {
    documentCategories?: string[];
    documentFormats?: string[];
    documentBaseTemplateSeededKeys?: string[];
    documentBaseLibraryVersion?: number;
  }
}

export {};
