import '../types';

declare module '../types' {
  interface LegalCase {
    archivedAt?: string;
    statusBeforeArchive?: string;
    createdAt?: string;
    updatedAt?: string;
  }
}

export {};
