export type NavigationTab = 'dashboard' | 'clients' | 'cases' | 'documents' | 'calendar' | 'settings' | 'support';

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
  caseNumber: string; // e.g. "Caso #2023-8941"
  processNumber: string; // Número do processo/protocolo (administrativo ou judicial)
  court: string; // e.g. "Tribunal de Justiça de São Paulo"
  agencyOrCourt?: string; // Vara ou Agência responsável (ex: APS Parnaíba/PI, 1ª Vara Federal)
  category: string; // Ramo/Categoria (Previdenciário, Trabalhista, Cível)
  benefitType?: string; // Tipo de benefício/ação (BPC Loas, Aux. Doença, Aposentadoria por Invalidez, Rural, etc.)
  instance?: string; // Instância (Administrativo INSS, Judicial 1ª instância, Recurso/2ª instância)
  title: string; // Título / Objeto da ação
  
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
}

export interface FirmSettings {
  firmName: string;
  firmSubtitle: string;
  logoUrl: string;
  lawyerName: string;
  lawyerTitle: string;
  lawyerAvatarUrl: string;
  oabNumber: string;
  practiceAreas: string[];
  clientCategories: string[];
}

