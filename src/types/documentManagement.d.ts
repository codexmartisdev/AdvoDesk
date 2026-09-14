import '../types';

declare module '../types' {
  interface DocumentTemplate {
    status?: 'Ativo' | 'Arquivado';
    archivedAt?: string | null;
    createdAt?: string;
    updatedAt?: string;
  }

  interface FirmSettings {
    documentCategories?: string[];
    documentFormats?: string[];
  }
}

export {};
