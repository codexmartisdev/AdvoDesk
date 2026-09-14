import { DocumentTemplate } from '../types';
import { BpcCaseItem } from './bpc';

export type GeneratedDocumentStatus = 'Rascunho' | 'Finalizado' | 'Arquivado';

export type GeneratedDocumentSource =
  | 'documents'
  | 'clients'
  | 'bpc'
  | 'case'
  | 'workflow';

export interface GeneratedDocument {
  id: string;
  firmId?: string;

  title: string;
  content: string;
  status: GeneratedDocumentStatus;
  source: GeneratedDocumentSource;

  templateId: string;
  templateTitle: string;
  templateSnapshot: DocumentTemplate;

  clientId: string;
  clientName: string;
  clientCpf: string;

  caseId?: string;
  bpcCaseId?: string;
  bpcCaseSnapshot?: BpcCaseItem;
  workflowInstanceId?: string;

  createdAt: string;
  updatedAt: string;
  createdByUid?: string;
  createdByName?: string;
}
