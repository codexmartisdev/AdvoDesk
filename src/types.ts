export type NavigationTab = 'dashboard' | 'clients' | 'cases' | 'documents' | 'calendar' | 'settings' | 'support' | 'create-case';

export interface UserPermissions {
  canManageWorkflows?: boolean;
  canEditCases?: boolean;
  canDeleteCases?: boolean;
  canManageUsers?: boolean;
  canEditSettings?: boolean;
}

export interface UserProfile {
  uid: string;
  email: string;
  name: string;
  avatarUrl?: string;
  firmId: string; // Ex: 'firm-bizerra'
  firmName?: string;
  role: 'admin' | 'advogado' | 'paralegal' | 'secretaria' | 'estagiario' | string;
  permissions: UserPermissions;
  createdAt: string;
  updatedAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  cpf?: string;
  birthDate?: string;
  kinship?: string; // parentesco (Filho(a), Cônjuge, Pai, Mãe, etc)
  income?: string;
}

export interface ClientDocumentChecklist {
  rgCpf: boolean;
  comprovanteResidencia: boolean;
  carteiraTrabalhoCnis: boolean;
  comprovantesRendaFamilia: boolean;
  laudosMedicos: boolean;
  comprovacaoRural: boolean;
}

export interface Client {
  id: string;
  firmId?: string;
  code: string; // e.g. "092.483.11-X"
  name: string;
  avatarUrl?: string;
  typePill: string; // "BPC Loas", "Auxílio Doença", "Aposentadoria"
  status: 'Pendente' | 'Ativo' | 'Rascunho' | 'Pending' | 'Active' | 'Draft';
  updatedAt: string;
  cpf: string;
  email: string;
  phone: string;
  casesCount: number;

  // 1. Identificação pessoal
  socialName?: string;
  rgNumber?: string;
  rgIssuer?: string;
  rgUf?: string;
  rgIssueDate?: string;
  birthDate?: string;
  nationality?: string;
  birthplace?: string;
  gender?: string;
  motherName?: string;
  fatherName?: string;

  // 2. Estado civil e família
  maritalStatus?: string;
  propertyRegime?: string;
  spouseName?: string;
  familyMembers?: FamilyMember[];

  // 3. Contato
  phoneSecondary?: string;

  // 4. Endereço
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCityUf?: string;
  addressZip?: string;
  addressZone?: 'Urbana' | 'Rural' | string;

  // 5. Profissão e renda
  occupation?: string;
  monthlyIncome?: string;
  employmentStatus?: string;
  inssContributionRegime?: string;

  // 6. Dados previdenciários
  nitPisPasep?: string;
  benefitNumber?: string;

  // 7. Documentos anexos
  documentChecklist?: ClientDocumentChecklist;

  // 8. Dados bancários
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  pixKey?: string;
}

export interface CaseDocument {
  id: string;
  title: string;
  fileSize: string;
  uploadedAt: string;
  type: 'pdf' | 'docx' | 'image';
  tags: string[]; // e.g. ["Principal", "Assinado"], ["Anexo"], ["Prova"]
}

export interface LegalCase {
  id: string;
  firmId?: string;
  caseNumber: string; // e.g. "Caso #2023-8941"
  processNumber: string; // Número do processo/protocolo (administrativo ou judicial)
  court: string; // e.g. "Tribunal de Justiça de São Paulo"
  agencyOrCourt?: string; // Vara ou Agência responsável (ex: APS Parnaíba/PI, 1ª Vara Federal)
  category: string; // Ramo/Categoria (Previdenciário, Trabalhista, Cível)
  benefitType?: string; // Tipo de benefício/ação (BPC Loas, Aux. Doença, Aposentadoria por Invalidez, Rural, etc.)
  instance?: string; // Instância (Administrativo INSS, Judicial 1ª instância, Recurso/2ª instância)
  title: string; // Título / Objeto da ação
  
  // Arquitetura Modular Previdenciária
  processTypeId?: string;
  processTypeName?: string;
  actingType?: 'Administrativo' | 'Judicial' | 'Administrativo + Judicial' | 'Consultivo' | 'Extrajudicial' | 'A definir' | string;
  priority?: 'Baixa' | 'Normal' | 'Alta' | 'Urgente' | string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  responsibleUserOab?: string;
  collaborators?: string[];
  openedAt?: string;
  origin?: string;
  
  // Link do Workflow em Execução
  workflowInstanceId?: string;
  workflowInstance?: WorkflowInstance;

  administrativeData?: {
    requirementNumber?: string;
    benefitNumberNB?: string;
    der?: string;
    dib?: string;
    dip?: string;
    protocol?: string;
    responsibleAgency?: string;
    aps?: string;
    protocolDate?: string;
    adminStatus?: string;
    notes?: string;
  };

  judicialData?: {
    processNumber?: string;
    court?: string;
    judicialSection?: string;
    subSection?: string;
    county?: string;
    courtUnitJEF?: string;
    processClass?: string;
    subject?: string;
    filingDate?: string;
    causeValue?: string;
    defendant?: string;
    notes?: string;
  };

  customFields?: Record<string, any>;
  
  // Status & Resultado
  statusLabel: string; // Situação atual (documentação pendente, protocolado, em análise, exigência, indeferido, concedido, em recurso)
  finalResult?: string; // Resultado final (quando encerrado): Deferido, Indeferido, Concedido, Acordo, Em andamento
  concededValue?: string; // Valor concedido / RPV / Salário de Benefício
  
  // Cliente vinculado
  clientId: string;
  clientName: string;
  clientCpf: string;

  // Datas-chave
  filingDate?: string; // Data de entrada do requerimento (DER) ou distribuição da ação
  lastMovementDate?: string; // Data da última movimentação
  nextDeadlineDate?: string; // Data do próximo prazo/compromisso
  nextDeadlineType?: string; // Tipo do próximo compromisso (Perícia, Recurso, Retorno de Exigência, Audiência)

  // Controle financeiro
  agreedFees?: string; // Honorários combinados (valor fixo ou % do benefício, ex: "30% dos atrasados")
  paymentStatus?: 'Pendente' | 'Pago' | 'Parcelado' | 'Em Andamento' | string; // Status de pagamento

  // Parceria com Advogado & Repasse para Captador
  hasLawyerPartnership?: boolean;
  partnerLawyerName?: string;
  partnerLawyerOab?: string;
  partnerLawyerShare?: string; // ex: "50% dos honorários", "R$ 1.500,00"

  hasScoutCommission?: boolean;
  scoutName?: string;
  scoutFeeOrShare?: string; // ex: "10% dos honorários", "R$ 500,00"
  scoutNotes?: string;

  // Anotações
  quickNotes?: string; // Observações rápidas livres
  notes: string[]; // Histórico de notas do processo

  currentStepIndex: number;
  steps: {
    label: string;
    completed: boolean;
    active: boolean;
  }[];
  documents: CaseDocument[];
  deadlinesCount: number;
  costs: { description: string; value: string; date: string; paid: boolean }[];
}

export interface DocumentTemplate {
  id: string;
  title: string;
  badge?: 'Comum' | 'Essencial' | 'Especial' | 'Common' | 'Essential' | 'Special' | string;
  icon: string;
  description: string;
  category: string; // Tipo/Categoria (Previdenciário, Contratos, Petições, etc.)
  format?: string;   // Formato (Petição Inicial, Requerimento Administrativo, Procuração, Contrato, Recurso, etc.)
  contentPattern?: string; // Texto/minuta padrão pré-definido
}

export interface ScheduledEvent {
  id: string;
  dateStr: string; // e.g. "05 AGO" or "24 OUT"
  fullDate: string; // "YYYY-MM-DD"
  time?: string; // "14:00" or empty
  type: string; // Categorização legada/ampla ex: 'Prazos Fatais (Recursos)' | 'Audiências & Perícias' | 'Reuniões Internas'
  badgeColor?: 'recurso' | 'pericia' | 'reuniao' | string;
  title: string;

  // 1. Vinculação
  caseId?: string;
  clientId?: string;
  clientName?: string;
  benefitType?: string;
  processNumber?: string;

  // 2. Dados do evento
  eventType?: 'Perícia Médica' | 'Perícia Social' | 'Audiência' | 'Prazo de Recurso' | 'Retorno de Exigência' | 'Prazo de Contestação' | 'Reunião com Cliente' | 'Outro' | string;
  location?: string; // Endereço INSS, Vara/Fórum, ou "Online"

  // 3. Urgência / Controle
  status: 'Pendente' | 'Concluído' | 'Remarcado' | 'Perdido';
  priorityLevel?: 'urgente' | 'atencao' | 'normal'; // Calculado ou sob medida (vermelho <3d, amarelo <7d, verde resto)

  // 4. Complementares
  notes?: string; // Nota/Observação rápida
  reminderDays?: number; // Lembrete antecipado em dias
  reminderOption?: 'at_time' | '1_hour' | '1_day' | '2_days' | 'custom' | string; // Opção de alerta (1 hora, 1 dia, 2 dias, hora personalizada)
  customReminderTime?: string; // Horário personalizado para o alerta (ex: "09:00")
  syncedWithGoogleCalendar?: boolean;
  googleEventId?: string;
  googleHtmlLink?: string;
}

// --- WORKFLOW ENGINE ARCHITECTURE INTERFACES ---

export type WorkflowFieldType =
  | 'short_text'
  | 'long_text'
  | 'number'
  | 'integer'
  | 'decimal'
  | 'currency'
  | 'percentage'
  | 'date'
  | 'time'
  | 'datetime'
  | 'boolean'
  | 'single_select'
  | 'multi_select'
  | 'list'
  | 'repeatable_group'
  | 'upload'
  | 'file'
  | 'client_ref'
  | 'client_reference'
  | 'family_member'
  | 'family_member_reference'
  | 'user_ref'
  | 'user'
  | 'cpf'
  | 'phone'
  | 'email'
  | 'calculated'
  | 'auto'
  | 'readonly';

export interface WorkflowField {
  id: string;
  key: string; // Identificador estável (slug: ex: "renda_familiar", "der", "cid")
  label: string; // Nome visual (ex: "Renda Familiar")
  type: WorkflowFieldType;
  required: boolean;
  defaultValue?: any;
  options?: string[]; // Opções para seleção única/múltipla
  placeholder?: string;
  helpText?: string;
  formula?: string; // Para campos calculados/automáticos
  variableName?: string; // ex: "[RENDA_FAMILIAR]"
  subFields?: WorkflowField[]; // Para grupos repetíveis (repeatable_group)
  visibilityCondition?: RuleConditionGroup;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    customErrorMessage?: string;
  };
  order?: number;
}

export type ConditionOperator =
  | 'equals'
  | 'not_equals'
  | 'greater_than'
  | 'less_than'
  | 'greater_or_equal'
  | 'less_or_equal'
  | 'contains'
  | 'not_contains'
  | 'is_empty'
  | 'is_not_empty'
  | 'is_true'
  | 'is_false';

export interface SingleCondition {
  fieldKey: string; // ex: "decisao_inss" ou "possui_deficiencia"
  operator: ConditionOperator;
  value?: any;
}

export interface RuleConditionGroup {
  logicalOperator: 'AND' | 'OR';
  conditions: SingleCondition[];
}

export interface ConditionalBranch {
  id: string;
  label: string; // ex: "Se CONCEDIDO", "Se INDEFERIDO"
  conditionRule: RuleConditionGroup;
  targetStepId: string; // ID da etapa destino
}

export interface ClassifiedDocument {
  id: string;
  title: string;
  classification: 'mandatory' | 'recommended' | 'optional' | 'conditional';
  conditionRule?: RuleConditionGroup;
}

export interface GeneratedDocumentTemplateLink {
  id: string;
  title: string; // ex: "Procuração", "Contrato de Honorários", "Requerimento Administrativo"
  documentTemplateId?: string; // ID do modelo de documento na central
  autoGenerateTiming?: 'on_step_enter' | 'on_step_complete' | 'manual';
}

export interface ChecklistItemWithRules {
  id: string;
  text: string;
  mandatory: boolean;
  conditionRule?: RuleConditionGroup;
  responsibleRole?: string;
  dueDateDays?: number;
  notes?: string;
}

export type StepCompletionCriteria =
  | 'manual'
  | 'all_mandatory_fields_filled'
  | 'mandatory_checklist_completed'
  | 'mandatory_documents_attached'
  | 'lawyer_approval_required'
  | 'combination';

export interface WorkflowAutomationRule {
  id: string;
  timing: 'on_step_enter' | 'on_step_complete';
  actionType:
    | 'create_task'
    | 'create_deadline'
    | 'generate_document'
    | 'change_status'
    | 'assign_responsible'
    | 'show_alert'
    | 'request_document'
    | 'send_notification';
  payload: Record<string, any>;
  conditionRule?: RuleConditionGroup;
}

export interface WorkflowStepTemplate {
  id: string;
  order: number;
  name: string;
  code?: string;
  description: string;
  stepType: 'mandatory' | 'optional' | 'conditional';
  slaDays: number; // SLA Interno para o escritório
  processDeadlineDays?: number; // Prazo Processual/Administrativo
  responsibleType?: 'role' | 'case_responsible' | 'specific_user';
  responsibleRole: 'Advogado Titular' | 'Advogado Associado' | 'Paralegal' | 'Estagiário' | 'Secretaria' | string;
  responsibleUserId?: string;
  requiresLawyerReview: boolean; // Exige revisão/aprovação do advogado antes de concluir
  completionCriteria: StepCompletionCriteria[];
  fields: WorkflowField[];
  checklist: ChecklistItemWithRules[];
  requiredDocuments: ClassifiedDocument[];
  generatedDocuments: GeneratedDocumentTemplateLink[];
  automations: WorkflowAutomationRule[];
  nextStepId?: string; // Próxima etapa padrão linear
  conditionalNextSteps?: ConditionalBranch[]; // Ramificações condicionais
  conditionRule?: RuleConditionGroup; // Visibilidade/Aplicação da etapa
}

export interface WorkflowTemplate {
  id: string;
  firmId?: string;
  parentTemplateId?: string; // ID do template pai para histórico de versões
  code: string; // ex: "WF-PREV-BPC-PCD"
  title: string;
  category: string;
  typePill: string;
  description: string;
  processTypeIds: string[]; // Vínculo com os tipos de processo (ex: ["bpc_pcd", "bpc_idoso"])
  version: number; // 1, 2, 3...
  status: 'draft' | 'published' | 'archived';
  publishedAt?: string;
  author: string;
  changelog?: string;
  estimatedTotalDays: number;
  isDefault?: boolean;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  steps: WorkflowStepTemplate[];
}

// Backwards compatibility alias
export type WorkflowStep = WorkflowStepTemplate;
export type ProcessWorkflow = WorkflowTemplate;

export type WorkflowStepInstanceStatus =
  | 'locked'
  | 'available'
  | 'not_started'
  | 'in_progress'
  | 'awaiting_document'
  | 'waiting_document'
  | 'awaiting_client'
  | 'waiting_client'
  | 'awaiting_third_party'
  | 'waiting_third_party'
  | 'awaiting_review'
  | 'waiting_review'
  | 'completed'
  | 'skipped'
  | 'blocked'
  | 'cancelled';

export interface WorkflowStepInstance {
  id: string;
  stepTemplateId: string;
  name: string;
  description: string;
  order: number;
  status: WorkflowStepInstanceStatus;
  assignedRole: string;
  assignedUserId?: string;
  assignedUserName?: string;
  slaDays: number;
  processDeadlineDays?: number;
  dueDate?: string;
  startedAt?: string;
  completedAt?: string;
  completedByUserId?: string;
  completedByUserName?: string;
  requiresLawyerReview: boolean;
  isReviewedByLawyer?: boolean;
  reviewedByUserId?: string;
  reviewedByUserName?: string;
  reviewedAt?: string;
  fieldsData: Record<string, any>; // Valores preenchidos indexados por field.key
  checklistData: {
    checklistItemId: string;
    text: string;
    completed: boolean;
    completedAt?: string;
    completedBy?: string;
  }[];
  attachedDocuments: {
    docId: string;
    title: string;
    fileUrl?: string;
    uploadedAt: string;
  }[];
  skippedReason?: string;
  forceProceedJustification?: {
    userId: string;
    userName: string;
    timestamp: string;
    reason: string;
    ignoredPendencies: string[];
  };
}

export interface WorkflowAuditLog {
  id: string;
  timestamp: string;
  userId: string;
  userName: string;
  action: string;
  stepId?: string;
  stepName?: string;
  fieldKey?: string;
  oldValue?: any;
  newValue?: any;
  details: string;
}

export interface WorkflowInstance {
  id: string;
  firmId?: string;
  caseId: string;
  clientId: string;
  templateId: string;
  templateCode: string;
  templateTitle: string;
  version: number;
  processTypeId: string;
  status: 'active' | 'completed' | 'cancelled' | 'paused';
  currentStepId: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
  templateSnapshot?: WorkflowTemplate; // Snapshot congelado do template para congelamento absoluto
  steps: WorkflowStepInstance[];
  auditLogs: WorkflowAuditLog[];
  variables: Record<string, any>; // Variáveis consolidadas do workflow + cliente
}

export interface FirmSettings {
  firmId?: string;
  firmName: string;
  firmSubtitle: string;
  logoUrl: string;
  lawyerName: string;
  lawyerTitle: string;
  lawyerAvatarUrl: string;
  oabNumber: string;
  notificationEmail?: string;
  practiceAreas: string[];
  clientCategories: string[];
  workflows?: WorkflowTemplate[];
}

