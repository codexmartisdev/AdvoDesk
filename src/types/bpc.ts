/**
 * Tipos e Estrutura de Dados do Módulo BPC LOAS
 * Preparado para expansão progressiva das etapas do fluxo de requerimento
 */

export type BpcSubTab = 
  | 'dashboard'
  | 'cases'
  | 'new-case'
  | 'pendencias'
  | 'prazos'
  | 'avaliacoes'
  | 'auditorias';

export type BpcModality = 'idoso' | 'pcd';

export type BpcStatus = 
  | 'Triagem'
  | 'Coleta de Documentos'
  | 'CadÚnico Pendente'
  | 'Auditoria Pré-Protocolo'
  | 'Protocolado Meu INSS'
  | 'Exigência Aberta'
  | 'Perícia Agendada'
  | 'Avaliação Social Agendada'
  | 'Concedido'
  | 'Indeferido (Recurso)'
  | 'Fase Judicial'
  | 'Ativo / Manutenção';

export type BpcWorkflowPhaseId =
  | 'triagem'
  | 'cadunico'
  | 'biometria'
  | 'composicao_familiar'
  | 'renda'
  | 'cnis'
  | 'documentos'
  | 'avaliacao_pcd'
  | 'auditoria_pre_protocolo'
  | 'protocolo_inss'
  | 'acompanhamento'
  | 'exigencias'
  | 'pericia_medica'
  | 'avaliacao_social'
  | 'decisao'
  | 'recurso'
  | 'judicial'
  | 'manutencao';

export interface BpcWorkflowStepDefinition {
  id: BpcWorkflowPhaseId;
  label: string;
  category: 'Preliminar' | 'Documentação & Renda' | 'Avaliações' | 'Protocolo & Acompanhamento' | 'Pós-Decisão';
  description: string;
  icon: string;
}

export interface BpcCaseItem {
  id: string;
  caseNumber?: string;
  clientId: string;
  clientName: string;
  clientCpf: string;
  clientPhone?: string;
  modality: BpcModality; // 'idoso' | 'pcd'
  status: BpcStatus;
  currentStep: BpcWorkflowPhaseId;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
  
  // Metadados específicos do processo BPC (preparados para preenchimento posterior)
  cadUnicoStatus?: 'Atualizado' | 'Desatualizado' | 'Não Inscrito' | 'Pendente';
  nisNumber?: string;
  protocolNumber?: string; // Número do Requerimento Meu INSS
  derDate?: string; // Data de Entrada do Requerimento
  periciaDate?: string;
  avaliacaoSocialDate?: string;
  exigenciaDeadline?: string;
  cidPrincipal?: string; // Para PCD
  observacoes?: string;
}

export interface BpcPendenciaItem {
  id: string;
  caseId: string;
  clientName: string;
  type: 'Documento' | 'CadÚnico' | 'Biometria' | 'Exigência INSS' | 'Outro';
  description: string;
  deadline?: string;
  resolved: boolean;
  severity: 'alta' | 'media' | 'baixa';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
}

export interface BpcDeadlineItem {
  id: string;
  caseId: string;
  clientName: string;
  title: string;
  date: string;
  type: 'Perícia Médica' | 'Avaliação Social' | 'Cumprimento de Exigência' | 'Prazo Recursal' | 'Outro';
  status: 'Pendente' | 'Concluído';
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface BpcAvaliacaoItem {
  id: string;
  caseId: string;
  clientName: string;
  type: 'Perícia Médica' | 'Avaliação Social';
  date: string;
  status: 'Agendada' | 'Realizada' | 'Cancelada';
  observacoes?: string;
  resultado?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}
