import React, { useState, useMemo, useEffect } from 'react';
import { Client, LegalCase, FirmSettings } from '../types';
import {
  SOCIAL_SECURITY_PROCESS_TYPES,
  PROCESS_CATEGORIES,
  ProcessType,
} from '../data/socialSecurityProcessTypes';
import { getBrasiliaISO, getBrasiliaFormatted } from '../utils/dateUtils';
import { INITIAL_WORKFLOWS } from '../data/defaultWorkflows';
import { instantiateWorkflow } from '../services/workflowEngine';

interface RegisterCaseWizardProps {
  clients: Client[];
  onCaseCreated: (newCase: LegalCase) => void;
  onNavigateToTab: (tab: any) => void;
  onSelectCaseId: (caseId: string) => void;
  onOpenDocModalForCase?: (caseItem: LegalCase) => void;
  settings?: FirmSettings;
}

// Sample Authorized Office Team Members for Assignment
const TEAM_MEMBERS = [
  { id: 'usr-1', name: 'Dr. Bizerra Neto', oab: 'OAB/SP 412.001', role: 'Sócio Principal', avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNfnNa7wyDGqRRvFDh968mhy6P8v8HOaMqFvz2dtr1YDtQgw_-NJaFJH4NCYmU8sEu62L1r8ee1gOuEXYrjPUgUmrLfj7MDZRwEVE0qQ8oJVyS-EB9PyIufUtutFE2-SXNaszPNFgLylY4H0T1VmEgUgheFGDtYiQKfwsyJBoL0igBtO_kP0LhnCvy0pU8uYCSsejtFR-yi6J-3VzRNL1CH-XBkpLDCtaOGcPViYvJ-qrjobOMX1sc6g' },
  { id: 'usr-2', name: 'Dra. Sofia Lima', oab: 'OAB/PI 18.420', role: 'Advogada Previdenciarista', avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80' },
  { id: 'usr-3', name: 'Dr. Gabriel Fonseca', oab: 'OAB/PI 21.094', role: 'Advogado Associado', avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=150&auto=format&fit=crop&q=80' },
];

const DOCUMENT_CATEGORY_OPTIONS = [
  'documentos pessoais',
  'procuração',
  'contrato',
  'CadÚnico',
  'documentos médicos',
  'documentos rurais',
  'CNIS',
  'CTPS',
  'PPP',
  'LTCAT',
  'documentos de atividade especial',
  'comprovantes de contribuição',
  'comprovantes de renda',
  'processo administrativo',
  'decisão administrativa',
  'carta de concessão',
  'memória de cálculo',
  'laudos',
  'outros',
];

export const RegisterCaseWizard: React.FC<RegisterCaseWizardProps> = ({
  clients,
  onCaseCreated,
  onNavigateToTab,
  onSelectCaseId,
  onOpenDocModalForCase,
  settings,
}) => {
  // Step State (1: Cliente, 2: Processo, 3: Informações, 4: Documentos, 5: Revisar, 6: Sucesso)
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Modal full client detail view state
  const [viewingClientFullDetail, setViewingClientFullDetail] = useState<boolean>(false);

  // --- Step 1: Cliente Selection ---
  const [clientSearch, setClientSearch] = useState<string>('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(clients[0] || null);

  // --- Step 1: Parcerias & Captação ---
  const [hasLawyerPartnership, setHasLawyerPartnership] = useState<boolean>(false);
  const [partnerLawyerName, setPartnerLawyerName] = useState<string>('');
  const [partnerLawyerOab, setPartnerLawyerOab] = useState<string>('');
  const [partnerLawyerShare, setPartnerLawyerShare] = useState<string>('');

  const [hasScoutCommission, setHasScoutCommission] = useState<boolean>(false);
  const [scoutName, setScoutName] = useState<string>('');
  const [scoutFeeOrShare, setScoutFeeOrShare] = useState<string>('');
  const [scoutNotes, setScoutNotes] = useState<string>('');

  // --- Step 2: Process Type Selection ---
  const [processSearch, setProcessSearch] = useState<string>('');
  const [activeCategoryFilter, setActiveCategoryFilter] = useState<string>('todos'); // 'todos', 'favoritos', 'recentes', or category_id
  const [selectedProcessType, setSelectedProcessType] = useState<ProcessType | null>(null);

  // Favorites & Recents in state / localStorage
  const [favorites, setFavorites] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('social_security_favs');
      return saved ? JSON.parse(saved) : ['bpc_pcd', 'auxilio_incapacidade_temporaria', 'aposentadoria_rural', 'salario_maternidade_rural'];
    } catch {
      return ['bpc_pcd', 'auxilio_incapacidade_temporaria', 'aposentadoria_rural', 'salario_maternidade_rural'];
    }
  });

  const [recents, setRecents] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('social_security_recents');
      return saved ? JSON.parse(saved) : ['bpc_pcd', 'aposentadoria_urbana'];
    } catch {
      return ['bpc_pcd', 'aposentadoria_urbana'];
    }
  });

  // Custom Process Modal State ("+ Outro Processo Previdenciário")
  const [customProcessModalOpen, setCustomProcessModalOpen] = useState<boolean>(false);
  const [customProcessName, setCustomProcessName] = useState<string>('');
  const [customProcessDescription, setCustomProcessDescription] = useState<string>('');
  const [customProcessCategory, setCustomProcessCategory] = useState<string>('especificos');
  const [customProcessActingType, setCustomProcessActingType] = useState<string>('A definir');

  // --- Step 3: Informações do Processo ---
  const [actingType, setActingType] = useState<string>('Administrativo');
  const [currentPhase, setCurrentPhase] = useState<string>('Atendimento inicial');
  const [responsibleUser, setResponsibleUser] = useState<typeof TEAM_MEMBERS[0]>(TEAM_MEMBERS[0]);
  const [collaborators, setCollaborators] = useState<string[]>([]);
  const [openingDate, setOpeningDate] = useState<string>(() => getBrasiliaISO().split('T')[0] || new Date().toISOString().split('T')[0]);
  const [priority, setPriority] = useState<string>('Normal');
  const [clientOrigin, setClientOrigin] = useState<string>('Indicação');

  // Collapsible Administrative Data
  const [adminDataOpen, setAdminDataOpen] = useState<boolean>(false);
  const [requirementNumber, setRequirementNumber] = useState<string>('');
  const [benefitNumberNB, setBenefitNumberNB] = useState<string>('');
  const [der, setDer] = useState<string>('');
  const [dib, setDib] = useState<string>('');
  const [dip, setDip] = useState<string>('');
  const [protocol, setProtocol] = useState<string>('');
  const [responsibleAgency, setResponsibleAgency] = useState<string>('INSS');
  const [aps, setAps] = useState<string>('APS Parnaíba / PI');
  const [protocolDate, setProtocolDate] = useState<string>('');
  const [adminStatus, setAdminStatus] = useState<string>('Em Análise');
  const [adminNotes, setAdminNotes] = useState<string>('');

  // Collapsible Judicial Data
  const [judicialDataOpen, setJudicialDataOpen] = useState<boolean>(false);
  const [processNumber, setProcessNumber] = useState<string>('');
  const [court, setCourt] = useState<string>('Justiça Federal - TRF1');
  const [judicialSection, setJudicialSection] = useState<string>('Seção Judiciária do Piauí');
  const [subSection, setSubSection] = useState<string>('Subseção Judiciária de Parnaíba');
  const [county, setCounty] = useState<string>('Parnaíba/PI');
  const [courtUnitJEF, setCourtUnitJEF] = useState<string>('1ª Vara Federal / JEF');
  const [processClass, setProcessClass] = useState<string>('Procedimento do Juizado Especial Cível');
  const [subject, setSubject] = useState<string>('Benefício Assistencial (Art. 203, V, CF/88)');
  const [filingDate, setFilingDate] = useState<string>('');
  const [causeValue, setCauseValue] = useState<string>('');
  const [defendant, setDefendant] = useState<string>('INSS - Instituto Nacional do Seguro Social');
  const [judicialNotes, setJudicialNotes] = useState<string>('');

  // --- Step 4: Documentos ---
  const [attachedDocs, setAttachedDocs] = useState<{ id: string; name: string; size: string; category: string; source: 'upload' | 'client' }[]>([]);
  const [selectedDocCategory, setSelectedDocCategory] = useState<string>('documentos pessoais');

  // --- Step 6: Success state ---
  const [createdCaseResult, setCreatedCaseResult] = useState<LegalCase | null>(null);
  const [workflowToast, setWorkflowToast] = useState<string | null>(null);

  // Toggle Favorite handler
  const handleToggleFavorite = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    let updated: string[];
    if (favorites.includes(id)) {
      updated = favorites.filter((f) => f !== id);
    } else {
      updated = [...favorites, id];
    }
    setFavorites(updated);
    try {
      localStorage.setItem('social_security_favs', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }
  };

  // Add process to recents
  const handleSelectProcess = (proc: ProcessType) => {
    setSelectedProcessType(proc);
    if (proc.default_acting_type) {
      setActingType(proc.default_acting_type);
    }
    if (proc.default_priority) {
      setPriority(proc.default_priority);
    }
    if (proc.id !== 'outro_previdenciario') {
      const updatedRecents = [proc.id, ...recents.filter((r) => r !== proc.id)].slice(0, 8);
      setRecents(updatedRecents);
      try {
        localStorage.setItem('social_security_recents', JSON.stringify(updatedRecents));
      } catch (err) {
        console.error(err);
      }
    } else {
      setCustomProcessModalOpen(true);
    }
  };

  // Filter clients
  const filteredClients = useMemo(() => {
    const query = clientSearch.trim().toLowerCase();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.cpf.includes(query) ||
        (c.phone && c.phone.includes(query)) ||
        (c.email && c.email.toLowerCase().includes(query))
    );
  }, [clients, clientSearch]);

  // Filter processes
  const filteredProcesses = useMemo(() => {
    let list = SOCIAL_SECURITY_PROCESS_TYPES;

    // Search query filter
    const query = processSearch.trim().toLowerCase();
    if (query) {
      list = list.filter(
        (p) =>
          p.name.toLowerCase().includes(query) ||
          p.description.toLowerCase().includes(query) ||
          p.categoryName.toLowerCase().includes(query) ||
          (p.alternativeNames && p.alternativeNames.some((alt) => alt.toLowerCase().includes(query))) ||
          (p.tags && p.tags.some((t) => t.toLowerCase().includes(query)))
      );
    }

    // Category / Filter tab
    if (activeCategoryFilter === 'favoritos') {
      list = list.filter((p) => favorites.includes(p.id));
    } else if (activeCategoryFilter === 'recentes') {
      list = list.filter((p) => recents.includes(p.id));
    } else if (activeCategoryFilter !== 'todos') {
      list = list.filter((p) => p.category === activeCategoryFilter);
    }

    return list;
  }, [processSearch, activeCategoryFilter, favorites, recents]);

  // Calculate age helper
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    const birth = new Date(birthDateStr);
    if (isNaN(birth.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const m = today.getMonth() - birth.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  // File Upload handler (simulated upload attachment)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const fileArray: File[] = Array.from(files);
    const newDocs = fileArray.map((f: File, i: number) => ({
      id: `up-${Date.now()}-${i}`,
      name: f.name,
      size: `${(f.size / (1024 * 1024)).toFixed(1)} MB`,
      category: selectedDocCategory,
      source: 'upload' as const,
    }));
    setAttachedDocs([...attachedDocs, ...newDocs]);
  };

  // Attach document from client checklist
  const handleAttachClientDoc = (docName: string) => {
    const exists = attachedDocs.some((d) => d.name === docName);
    if (exists) return;
    setAttachedDocs([
      ...attachedDocs,
      {
        id: `client-doc-${Date.now()}`,
        name: docName,
        size: '1.2 MB',
        category: 'documentos pessoais',
        source: 'client',
      },
    ]);
  };

  // Submit & Create Process
  const handleFinalSubmit = () => {
    if (!selectedClient || !selectedProcessType) return;

    const newCaseId = `case-${Date.now()}`;
    const formattedCode = `Caso #${Math.floor(1000 + Math.random() * 9000)}`;

    const generatedCase: LegalCase = {
      id: newCaseId,
      caseNumber: formattedCode,
      processNumber: processNumber.trim() || requirementNumber.trim() || `${Math.floor(1000000 + Math.random() * 8999999)}-${Math.floor(10 + Math.random() * 89)}.2026.4.01.8000`,
      court: court || 'Instituto Nacional do Seguro Social',
      agencyOrCourt: aps || 'APS Parnaíba / PI',
      category: 'Direito Previdenciário',
      benefitType: selectedProcessType.name,
      instance: actingType === 'Judicial' ? 'Judicial 1ª Instância' : 'Administrativo INSS',
      title: `${selectedProcessType.name} - ${selectedClient.name}`,

      processTypeId: selectedProcessType.id,
      processTypeName: selectedProcessType.name,
      actingType: actingType,
      priority: priority,
      responsibleUserId: responsibleUser.id,
      responsibleUserName: responsibleUser.name,
      responsibleUserOab: responsibleUser.oab,
      collaborators: collaborators,
      openedAt: openingDate,
      origin: clientOrigin,

      administrativeData: {
        requirementNumber,
        benefitNumberNB,
        der,
        dib,
        dip,
        protocol,
        responsibleAgency,
        aps,
        protocolDate,
        adminStatus,
        notes: adminNotes,
      },

      judicialData: {
        processNumber,
        court,
        judicialSection,
        subSection,
        county,
        courtUnitJEF,
        processClass,
        subject,
        filingDate,
        causeValue,
        defendant,
        notes: judicialNotes,
      },

      statusLabel: currentPhase || 'Atendimento inicial',
      finalResult: 'Em Andamento',
      concededValue: undefined,

      clientId: selectedClient.id,
      clientName: selectedClient.name,
      clientCpf: selectedClient.cpf,

      // Parceria com Advogado & Repasse para Captador
      hasLawyerPartnership,
      partnerLawyerName: hasLawyerPartnership ? partnerLawyerName.trim() : undefined,
      partnerLawyerOab: hasLawyerPartnership ? partnerLawyerOab.trim() : undefined,
      partnerLawyerShare: hasLawyerPartnership ? partnerLawyerShare.trim() : undefined,

      hasScoutCommission,
      scoutName: hasScoutCommission ? scoutName.trim() : undefined,
      scoutFeeOrShare: hasScoutCommission ? scoutFeeOrShare.trim() : undefined,
      scoutNotes: hasScoutCommission ? scoutNotes.trim() : undefined,

      filingDate: filingDate || der || openingDate,
      lastMovementDate: getBrasiliaISO(),

      quickNotes: `Processo cadastrado via módulo Previdenciário. Origem: ${clientOrigin}. Atuação: ${actingType}. Responsável: ${responsibleUser.name}.`,
      notes: [
        `[Abertura de Processo Previdenciário] ${selectedProcessType.name} cadastrado para ${selectedClient.name} em ${getBrasiliaFormatted()}.`,
      ],

      currentStepIndex: 0,
      steps: [
        { label: 'Triagem / Documentos', completed: false, active: true },
        { label: 'Análise Jurídica', completed: false, active: false },
        { label: 'Requerimento', completed: false, active: false },
        { label: 'Perícia / Avaliação', completed: false, active: false },
        { label: 'Decisão / Recurso', completed: false, active: false },
      ],

      documents: attachedDocs.map((d) => ({
        id: d.id,
        title: d.name,
        fileSize: d.size,
        uploadedAt: `Enviado em ${getBrasiliaFormatted()}`,
        type: d.name.endsWith('.pdf') ? 'pdf' : d.name.endsWith('.docx') ? 'docx' : 'image',
        tags: [d.category, 'Inicial'],
      })),

      deadlinesCount: 0,
      costs: [],
    };

    // Instantiate Workflow Instance automatically from matching published WorkflowTemplate
    const availableWorkflows = settings?.workflows && settings.workflows.length > 0 ? settings.workflows : INITIAL_WORKFLOWS;
    const matchingTemplate = availableWorkflows.find(
      (wf) => wf.status === 'published' && wf.processTypeIds && wf.processTypeIds.includes(selectedProcessType.id)
    ) || availableWorkflows[0];

    if (matchingTemplate) {
      const inst = instantiateWorkflow(matchingTemplate, generatedCase, selectedClient);
      generatedCase.workflowInstanceId = inst.id;
      generatedCase.workflowInstance = inst;
    }

    onCaseCreated(generatedCase);
    setCreatedCaseResult(generatedCase);
    setCurrentStep(6); // Success screen
  };

  return (
    <div className="w-full max-w-6xl mx-auto p-4 sm:p-6 md:p-8 space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-[#8c6e14] uppercase tracking-wider mb-1">
            <span className="material-symbols-outlined text-[16px] text-[#C9A227]">gavel</span>
            Módulo Direito Previdenciário
          </div>
          <h1 className="font-title-md text-2xl sm:text-3xl font-black text-[#0D0D0D] tracking-tight">
            Cadastrar Novo Processo Previdenciário
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Estrutura unificada e modular para requerimentos, ações judiciais e revisões do INSS.
          </p>
        </div>

        {currentStep <= 5 && (
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs shrink-0">
            <span className="w-2 h-2 rounded-full bg-[#C9A227] animate-pulse" />
            Etapa <strong className="text-slate-900 font-extrabold">{currentStep}</strong> de 5
          </div>
        )}
      </div>

      {/* Stepper Navigation Bar (Steps 1 to 5) */}
      {currentStep <= 5 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-3 sm:p-4">
          <div className="grid grid-cols-5 gap-2 sm:gap-4 text-center">
            {[
              { num: 1, label: '1. Cliente', icon: 'person_search' },
              { num: 2, label: '2. Processo', icon: 'folder_open' },
              { num: 3, label: '3. Informações', icon: 'edit_note' },
              { num: 4, label: '4. Documentos', icon: 'upload_file' },
              { num: 5, label: '5. Revisar', icon: 'fact_check' },
            ].map((step) => {
              const isDone = currentStep > step.num;
              const isCurrent = currentStep === step.num;
              return (
                <button
                  key={step.num}
                  disabled={step.num > currentStep && !isDone}
                  onClick={() => {
                    if (step.num < currentStep) setCurrentStep(step.num);
                  }}
                  className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-2.5 px-2 rounded-xl text-xs font-bold transition-all ${
                    isCurrent
                      ? 'bg-[#0D0D0D] text-white border border-[#C9A227] shadow-xs'
                      : isDone
                      ? 'bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100/80 cursor-pointer'
                      : 'bg-slate-50 text-slate-400 border border-transparent cursor-not-allowed'
                  }`}
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {isDone ? 'check_circle' : step.icon}
                  </span>
                  <span className="truncate">{step.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 1: SELECIONAR CLIENTE                                          */}
      {/* ==================================================================== */}
      {currentStep === 1 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h2 className="font-title-md text-lg font-bold text-[#0D0D0D] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9A227]">person_search</span>
                1. Selecionar Cliente
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Pesquise por nome, CPF, telefone ou e-mail para vincular o cliente sem duplicar dados.
              </p>
            </div>
            {selectedClient && (
              <span className="px-3 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-full text-xs font-bold flex items-center gap-1 self-start sm:self-auto shrink-0">
                <span className="material-symbols-outlined text-[14px]">check</span> Cliente Selecionado
              </span>
            )}
          </div>

          {/* Search Box */}
          <div className="relative max-w-xl">
            <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400">
              search
            </span>
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => setClientSearch(e.target.value)}
              placeholder="Pesquisar cliente por nome, CPF, telefone ou e-mail..."
              className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
            />
          </div>

          {/* Client Selection Grid / List */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredClients.map((client) => {
              const isSelected = selectedClient?.id === client.id;
              return (
                <div
                  key={client.id}
                  onClick={() => setSelectedClient(client)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-amber-500/5 border-[#C9A227] shadow-2xs ring-1 ring-[#C9A227]'
                      : 'bg-slate-50/70 hover:bg-white border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3 shrink-0">
                    {client.avatarUrl ? (
                      <img
                        src={client.avatarUrl}
                        alt={client.name}
                        className="w-11 h-11 rounded-xl object-cover border border-slate-200"
                      />
                    ) : (
                      <div className="w-11 h-11 rounded-xl bg-[#0D0D0D] border border-[#C9A227]/40 text-[#C9A227] font-extrabold flex items-center justify-center text-sm shrink-0">
                        {client.name.charAt(0)}
                      </div>
                    )}
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{client.name}</h4>
                      <p className="text-xs text-slate-500 font-mono font-medium">CPF: {client.cpf}</p>
                      {client.phone && (
                        <p className="text-[11px] text-slate-500">{client.phone}</p>
                      )}
                    </div>
                  </div>

                  <div className="shrink-0">
                    <span
                      className={`w-6 h-6 rounded-full flex items-center justify-center border text-xs font-bold ${
                        isSelected
                          ? 'bg-[#0D0D0D] text-[#C9A227] border-[#C9A227]'
                          : 'border-slate-300 text-transparent'
                      }`}
                    >
                      ✓
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredClients.length === 0 && (
              <div className="col-span-2 py-8 text-center text-slate-500 text-sm">
                Nenhum cliente encontrado com os dados digitados.
              </div>
            )}
          </div>

          {/* Selected Client Summary Card & Button "Ver Cadastro Completo" */}
          {selectedClient && (
            <div className="bg-slate-50/90 rounded-2xl border border-slate-200 p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200/80 pb-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-[#0D0D0D] border border-[#C9A227] text-white flex items-center justify-center text-lg font-bold shrink-0">
                    {selectedClient.name.charAt(0)}
                  </div>
                  <div>
                    <h3 className="font-bold text-base text-[#0D0D0D]">{selectedClient.name}</h3>
                    <p className="text-xs text-slate-500">
                      ID Interno: <span className="font-mono font-bold text-slate-700">{selectedClient.id}</span> • Código: {selectedClient.code}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setViewingClientFullDetail(true)}
                  className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs self-start sm:self-auto"
                >
                  <span className="material-symbols-outlined text-[16px] text-[#C9A227]">visibility</span>
                  Ver Cadastro Completo
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs">
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">CPF</span>
                  <strong className="text-slate-900 font-mono">{selectedClient.cpf}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Data Nasc. / Idade</span>
                  <strong className="text-slate-900">
                    {selectedClient.birthDate || 'Não inf.'} {calculateAge(selectedClient.birthDate) ? `(${calculateAge(selectedClient.birthDate)} anos)` : ''}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Telefone</span>
                  <strong className="text-slate-900">{selectedClient.phone || 'Não inf.'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">E-mail</span>
                  <strong className="text-slate-900 truncate block">{selectedClient.email || 'Não inf.'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Cidade / UF</span>
                  <strong className="text-slate-900">{selectedClient.addressCityUf || 'Parnaíba/PI'}</strong>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">NIT / PIS</span>
                  <strong className="text-slate-900 font-mono">{selectedClient.nitPisPasep || 'Não inf.'}</strong>
                </div>
              </div>
            </div>
          )}

          {/* Seção: Parcerias com Advogado & Repasse para Captador */}
          <div className="bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl border border-slate-200 p-5 space-y-5">
            <div>
              <h3 className="font-bold text-sm text-[#0D0D0D] flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9A227] text-lg">handshake</span>
                Parcerias & Captação do Processo (Opcional)
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Indique se haverá atuação conjunta com outro advogado parceiro ou repasse de comissão para captador.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Opção 1: Parceria com outro advogado */}
              <div className={`p-4 rounded-xl border transition-all ${
                hasLawyerPartnership
                  ? 'bg-white border-[#C9A227] shadow-xs ring-1 ring-[#C9A227]/30'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                      hasLawyerPartnership ? 'bg-[#0D0D0D] text-[#C9A227]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className="material-symbols-outlined text-base">gavel</span>
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Parceria com Advogado</h4>
                      <p className="text-[11px] text-slate-500">Atuação conjunta com advogado externo</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasLawyerPartnership}
                      onChange={(e) => setHasLawyerPartnership(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D0D0D]"></div>
                  </label>
                </div>

                {hasLawyerPartnership && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2.5 animate-fade-in text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nome do Advogado Parceiro <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={partnerLawyerName}
                        onChange={(e) => setPartnerLawyerName(e.target.value)}
                        placeholder="Ex: Dr. Roberto Guimarães"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">OAB do Parceiro</label>
                        <input
                          type="text"
                          value={partnerLawyerOab}
                          onChange={(e) => setPartnerLawyerOab(e.target.value)}
                          placeholder="Ex: OAB/PI 12.345"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Divisão de Honorários</label>
                        <input
                          type="text"
                          value={partnerLawyerShare}
                          onChange={(e) => setPartnerLawyerShare(e.target.value)}
                          placeholder="Ex: 50% dos honorários de êxito"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Opção 2: Repasse para Captador */}
              <div className={`p-4 rounded-xl border transition-all ${
                hasScoutCommission
                  ? 'bg-white border-[#C9A227] shadow-xs ring-1 ring-[#C9A227]/30'
                  : 'bg-white/80 border-slate-200 hover:border-slate-300'
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-base ${
                      hasScoutCommission ? 'bg-[#0D0D0D] text-[#C9A227]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className="material-symbols-outlined text-base">person_pin</span>
                    </span>
                    <div>
                      <h4 className="font-bold text-xs text-slate-900">Repasse para Captador</h4>
                      <p className="text-[11px] text-slate-500">Comissão ou valor para parceiro que indicou</p>
                    </div>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasScoutCommission}
                      onChange={(e) => setHasScoutCommission(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#0D0D0D]"></div>
                  </label>
                </div>

                {hasScoutCommission && (
                  <div className="mt-3.5 pt-3.5 border-t border-slate-100 space-y-2.5 animate-fade-in text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Nome do Captador <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={scoutName}
                        onChange={(e) => setScoutName(e.target.value)}
                        placeholder="Ex: Carlos Eduardo (Líder Comunitário)"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Valor ou % a Repassar</label>
                        <input
                          type="text"
                          value={scoutFeeOrShare}
                          onChange={(e) => setScoutFeeOrShare(e.target.value)}
                          placeholder="Ex: R$ 500,00 ou 10%"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                        />
                      </div>
                      <div>
                        <label className="block font-medium text-slate-600 mb-1">Condição de Repasse</label>
                        <input
                          type="text"
                          value={scoutNotes}
                          onChange={(e) => setScoutNotes(e.target.value)}
                          placeholder="Ex: No recebimento do 1º RPV"
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Navigation */}
          <div className="flex justify-end pt-2">
            <button
              disabled={!selectedClient}
              onClick={() => setCurrentStep(2)}
              className="px-6 py-3 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs hover:bg-[#1a1a1a] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Avançar para Seleção do Processo</span>
              <span className="material-symbols-outlined text-[16px] text-[#C9A227]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 2: QUAL PROCESSO PREVIDENCIÁRIO DESEJA CADASTRAR?              */}
      {/* ==================================================================== */}
      {currentStep === 2 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-title-md text-xl font-bold text-[#0D0D0D] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C9A227]">folder_open</span>
              Qual processo previdenciário deseja cadastrar?
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Selecione entre as categorias específicas abaixo ou utilize a busca rápida.
            </p>
          </div>

          {/* Search Box & Filters Bar */}
          <div className="space-y-3">
            <div className="relative w-full">
              <span className="material-symbols-outlined absolute left-3.5 top-3 text-slate-400">
                search
              </span>
              <input
                type="text"
                value={processSearch}
                onChange={(e) => setProcessSearch(e.target.value)}
                placeholder="Pesquisar BPC, aposentadoria, salário-maternidade, auxílio-doença..."
                className="w-full bg-slate-50 border border-slate-300 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-slate-900 font-medium placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
              />
            </div>

            {/* Category Filter Pills & Favoritos/Recentes */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setActiveCategoryFilter('todos')}
                className={`px-3.5 py-1.5 rounded-xl font-bold shrink-0 transition-colors ${
                  activeCategoryFilter === 'todos'
                    ? 'bg-[#0D0D0D] text-white border border-[#C9A227]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                Todos
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryFilter('favoritos')}
                className={`px-3.5 py-1.5 rounded-xl font-bold shrink-0 flex items-center gap-1 transition-colors ${
                  activeCategoryFilter === 'favoritos'
                    ? 'bg-[#0D0D0D] text-white border border-[#C9A227]'
                    : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-amber-500">star</span>
                Favoritos ({favorites.length})
              </button>

              <button
                type="button"
                onClick={() => setActiveCategoryFilter('recentes')}
                className={`px-3.5 py-1.5 rounded-xl font-bold shrink-0 flex items-center gap-1 transition-colors ${
                  activeCategoryFilter === 'recentes'
                    ? 'bg-[#0D0D0D] text-white border border-[#C9A227]'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-slate-500">schedule</span>
                Recentes ({recents.length})
              </button>

              <div className="h-4 w-[1px] bg-slate-300 shrink-0 mx-1" />

              {PROCESS_CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setActiveCategoryFilter(cat.id)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium shrink-0 transition-colors ${
                    activeCategoryFilter === cat.id
                      ? 'bg-[#0D0D0D] text-white border border-[#C9A227]'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Process Type Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[520px] overflow-y-auto pr-1">
            {filteredProcesses.map((proc) => {
              const isSelected = selectedProcessType?.id === proc.id;
              const isFav = favorites.includes(proc.id);

              return (
                <div
                  key={proc.id}
                  onClick={() => handleSelectProcess(proc)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative group gold-accent-edge ${
                    isSelected
                      ? 'bg-amber-500/10 border-[#C9A227] shadow-sm ring-2 ring-[#C9A227]'
                      : 'bg-white hover:bg-slate-50/80 border-slate-200/90 hover:border-slate-300'
                  }`}
                >
                  <div>
                    {/* Top Icon + Category + Favorite Toggle */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="w-10 h-10 rounded-xl bg-[#0D0D0D] border border-[#C9A227]/40 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[#C9A227] text-xl">
                          {proc.icon || 'gavel'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold border border-slate-200">
                          {proc.categoryName}
                        </span>

                        <button
                          type="button"
                          onClick={(e) => handleToggleFavorite(proc.id, e)}
                          title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
                          className="p-1 text-slate-400 hover:text-amber-500 transition-colors"
                        >
                          <span
                            className={`material-symbols-outlined text-lg ${
                              isFav ? 'text-amber-500 fill-amber-500' : ''
                            }`}
                          >
                            {isFav ? 'star' : 'star_border'}
                          </span>
                        </button>
                      </div>
                    </div>

                    {/* Title & Alternative Names */}
                    <h3 className="font-bold text-slate-900 text-sm leading-snug">
                      {proc.name}
                    </h3>
                    {proc.alternativeNames && proc.alternativeNames.length > 0 && (
                      <p className="text-[11px] text-[#8c6e14] font-semibold mt-0.5">
                        ({proc.alternativeNames.join(', ')})
                      </p>
                    )}

                    {/* Description */}
                    <p className="text-xs text-slate-500 mt-1.5 leading-relaxed line-clamp-3">
                      {proc.description}
                    </p>
                  </div>

                  {/* Selection Button */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-medium">
                      Atuação: <strong className="text-slate-700">{proc.default_acting_type || 'Administrativo'}</strong>
                    </span>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        isSelected
                          ? 'bg-[#0D0D0D] text-white border border-[#C9A227]'
                          : 'bg-slate-100 text-slate-800 group-hover:bg-slate-200'
                      }`}
                    >
                      {isSelected ? 'Selecionado ✓' : 'Selecionar'}
                    </span>
                  </div>
                </div>
              );
            })}

            {filteredProcesses.length === 0 && (
              <div className="col-span-full py-12 text-center text-slate-500 text-sm">
                Nenhum processo previdenciário encontrado para o filtro selecionado.
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar
            </button>

            <button
              disabled={!selectedProcessType}
              onClick={() => setCurrentStep(3)}
              className="px-6 py-3 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs hover:bg-[#1a1a1a] transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              <span>Avançar para Informações do Processo</span>
              <span className="material-symbols-outlined text-[16px] text-[#C9A227]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 3: INFORMAÇÕES DO PROCESSO                                     */}
      {/* ==================================================================== */}
      {currentStep === 3 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          {/* Top Fixed Header Summary */}
          <div className="bg-[#0D0D0D] text-white rounded-2xl p-4 sm:p-5 border border-[#C9A227]/40 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs w-full">
              <div>
                <span className="text-[#C9A227] text-[10px] font-bold uppercase tracking-widest block">CLIENTE</span>
                <p className="font-extrabold text-white text-sm">{selectedClient?.name}</p>
                <p className="text-[11px] text-slate-400 font-mono">CPF: {selectedClient?.cpf}</p>
              </div>

              <div>
                <span className="text-[#C9A227] text-[10px] font-bold uppercase tracking-widest block">PROCESSO PREVIDENCIÁRIO</span>
                <p className="font-extrabold text-white text-sm">{selectedProcessType?.name}</p>
                <p className="text-[11px] text-slate-400">{selectedProcessType?.categoryName}</p>
              </div>

              <div>
                <span className="text-[#C9A227] text-[10px] font-bold uppercase tracking-widest block">ÁREA JURÍDICA</span>
                <p className="font-extrabold text-white text-sm">Direito Previdenciário</p>
                <p className="text-[11px] text-slate-400">INSS / Justiça Federal</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Tipo de Atuação */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Tipo de Atuação <span className="text-red-500">*</span>
              </label>
              <select
                value={actingType}
                onChange={(e) => setActingType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
              >
                <option value="Administrativo">Administrativo</option>
                <option value="Judicial">Judicial</option>
                <option value="Administrativo + Judicial">Administrativo + Judicial</option>
                <option value="Consultivo">Consultivo</option>
                <option value="Extrajudicial">Extrajudicial</option>
                <option value="A definir">A definir</option>
              </select>
            </div>

            {/* Fase Atual */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Fase Atual do Processo <span className="text-red-500">*</span>
              </label>
              <select
                value={currentPhase}
                onChange={(e) => setCurrentPhase(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
              >
                <option value="Atendimento inicial">Atendimento inicial</option>
                <option value="Triagem">Triagem</option>
                <option value="Coleta de documentos">Coleta de documentos</option>
                <option value="Análise jurídica">Análise jurídica</option>
                <option value="Preparação do requerimento">Preparação do requerimento</option>
                <option value="Requerimento administrativo protocolado">Requerimento administrativo protocolado</option>
                <option value="Cumprimento de exigência">Cumprimento de exigência</option>
                <option value="Avaliação/perícia">Avaliação/perícia</option>
                <option value="Em análise administrativa">Em análise administrativa</option>
                <option value="Recurso administrativo">Recurso administrativo</option>
                <option value="Preparação judicial">Preparação judicial</option>
                <option value="Processo judicial">Processo judicial</option>
                <option value="Recurso judicial">Recurso judicial</option>
                <option value="Execução">Execução</option>
                <option value="Implantação de benefício">Implantação de benefício</option>
                <option value="Concluído">Concluído</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </div>

            {/* Responsável pelo Processo */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1.5">
                Advogado Responsável <span className="text-red-500">*</span>
              </label>
              <select
                value={responsibleUser.id}
                onChange={(e) => {
                  const match = TEAM_MEMBERS.find((m) => m.id === e.target.value);
                  if (match) setResponsibleUser(match);
                }}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
              >
                {TEAM_MEMBERS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.oab}) - {m.role}
                  </option>
                ))}
              </select>
            </div>

            {/* Data de Abertura & Prioridade */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Data de Abertura
                </label>
                <input
                  type="date"
                  value={openingDate}
                  onChange={(e) => setOpeningDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Prioridade
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
                >
                  <option value="Baixa">Baixa</option>
                  <option value="Normal">Normal</option>
                  <option value="Alta">Alta</option>
                  <option value="Urgente">Urgente</option>
                </select>
              </div>
            </div>

            {/* Origem do Cliente */}
            <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Origem do Cliente / Captação
                </label>
                <select
                  value={clientOrigin}
                  onChange={(e) => setClientOrigin(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
                >
                  <option value="Indicação">Indicação de Cliente / Terceiro</option>
                  <option value="Cliente antigo">Cliente antigo do escritório</option>
                  <option value="Instagram">Instagram / Redes Sociais</option>
                  <option value="Google">Google / Pesquisa Web</option>
                  <option value="Site">Site Institucional</option>
                  <option value="WhatsApp">WhatsApp Direto</option>
                  <option value="Parceiro">Parceiro / Outro Escritório</option>
                  <option value="Evento">Evento / Ação Social</option>
                  <option value="Outra">Outra origem</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Colaboradores Adicionais
                </label>
                <div className="flex items-center gap-3 pt-1">
                  {TEAM_MEMBERS.filter((m) => m.id !== responsibleUser.id).map((m) => (
                    <label key={m.id} className="flex items-center gap-1.5 text-xs text-slate-700 font-medium cursor-pointer">
                      <input
                        type="checkbox"
                        checked={collaborators.includes(m.name)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setCollaborators([...collaborators, m.name]);
                          } else {
                            setCollaborators(collaborators.filter((c) => c !== m.name));
                          }
                        }}
                        className="rounded text-[#0D0D0D] focus:ring-[#C9A227]"
                      />
                      {m.name}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Collapsible Section: Dados Administrativos (INSS) */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setAdminDataOpen(!adminDataOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100 p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9A227]">badge</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Dados Administrativos (INSS)</h3>
                  <p className="text-[11px] text-slate-500">Campos opcionais: Número de Requerimento, NB, DER, Agência APS...</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500">
                {adminDataOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {adminDataOpen && (
              <div className="p-5 bg-white space-y-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Nº Requerimento</label>
                    <input
                      type="text"
                      value={requirementNumber}
                      onChange={(e) => setRequirementNumber(e.target.value)}
                      placeholder="Ex: 198.245.120-0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Número do Benefício (NB)</label>
                    <input
                      type="text"
                      value={benefitNumberNB}
                      onChange={(e) => setBenefitNumberNB(e.target.value)}
                      placeholder="Ex: 87/123.456.789-0"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">DER (Data Requerimento)</label>
                    <input
                      type="date"
                      value={der}
                      onChange={(e) => setDer(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">DIB (Data Início Benefício)</label>
                    <input
                      type="date"
                      value={dib}
                      onChange={(e) => setDib(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">DIP (Data Início Pagamento)</label>
                    <input
                      type="date"
                      value={dip}
                      onChange={(e) => setDip(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">APS / Agência Responsável</label>
                    <input
                      type="text"
                      value={aps}
                      onChange={(e) => setAps(e.target.value)}
                      placeholder="Ex: APS Parnaíba / PI"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações Administrativas</label>
                  <textarea
                    rows={2}
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Anotações sobre senha Meu INSS, cumprimento de exigências, etc."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Collapsible Section: Dados Judiciais */}
          <div className="border border-slate-200 rounded-2xl overflow-hidden">
            <button
              type="button"
              onClick={() => setJudicialDataOpen(!judicialDataOpen)}
              className="w-full bg-slate-50 hover:bg-slate-100 p-4 flex items-center justify-between transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[#C9A227]">balance</span>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Dados Judiciais (Se houver ação distribuída)</h3>
                  <p className="text-[11px] text-slate-500">Campos opcionais: Número do Processo CNJ, Tribunal, Vara/JEF, Valor da causa...</p>
                </div>
              </div>
              <span className="material-symbols-outlined text-slate-500">
                {judicialDataOpen ? 'expand_less' : 'expand_more'}
              </span>
            </button>

            {judicialDataOpen && (
              <div className="p-5 bg-white space-y-4 border-t border-slate-200">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Número do Processo (CNJ)</label>
                    <input
                      type="text"
                      value={processNumber}
                      onChange={(e) => setProcessNumber(e.target.value)}
                      placeholder="Ex: 5001234-88.2026.4.01.8000"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Tribunal / Foro</label>
                    <input
                      type="text"
                      value={court}
                      onChange={(e) => setCourt(e.target.value)}
                      placeholder="Ex: Justiça Federal - TRF1"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Vara / JEF</label>
                    <input
                      type="text"
                      value={courtUnitJEF}
                      onChange={(e) => setCourtUnitJEF(e.target.value)}
                      placeholder="Ex: 1ª Vara Federal / JEF Parnaíba"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Valor da Causa (R$)</label>
                    <input
                      type="text"
                      value={causeValue}
                      onChange={(e) => setCauseValue(e.target.value)}
                      placeholder="Ex: R$ 45.000,00"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Data do Ajuizamento</label>
                    <input
                      type="date"
                      value={filingDate}
                      onChange={(e) => setFilingDate(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Parte Ré</label>
                    <input
                      type="text"
                      value={defendant}
                      onChange={(e) => setDefendant(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs text-slate-900 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">Observações Judiciais</label>
                  <textarea
                    rows={2}
                    value={judicialNotes}
                    onChange={(e) => setJudicialNotes(e.target.value)}
                    placeholder="Anotações sobre pedido de justiça gratuita, tutela de urgência, etc."
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar aos Processos
            </button>

            <button
              onClick={() => setCurrentStep(4)}
              className="px-6 py-3 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs hover:bg-[#1a1a1a] transition-all shadow-xs flex items-center gap-2"
            >
              <span>Avançar para Documentos</span>
              <span className="material-symbols-outlined text-[16px] text-[#C9A227]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 4: DOCUMENTOS                                                  */}
      {/* ==================================================================== */}
      {currentStep === 4 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-title-md text-xl font-bold text-[#0D0D0D] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C9A227]">upload_file</span>
              4. Documentos do Processo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Anexe documentos iniciais ou importe arquivos já cadastrados no perfil do cliente ({selectedClient?.name}).
            </p>
          </div>

          {/* File Upload Zone */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-1">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Categoria do Documento
                </label>
                <select
                  value={selectedDocCategory}
                  onChange={(e) => setSelectedDocCategory(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D] text-xs"
                >
                  {DOCUMENT_CATEGORY_OPTIONS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Anexar Novos Arquivos
                </label>
                <div className="border-2 border-dashed border-slate-300 rounded-2xl p-4 text-center hover:bg-slate-50 transition-colors cursor-pointer relative">
                  <input
                    type="file"
                    multiple
                    onChange={handleFileUpload}
                    className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                  />
                  <span className="material-symbols-outlined text-2xl text-[#C9A227] mb-1">cloud_upload</span>
                  <p className="text-xs font-bold text-slate-800">Clique para selecionar ou arraste o arquivo aqui</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Formatos suportados: PDF, DOCX, JPG, PNG até 25MB</p>
                </div>
              </div>
            </div>

            {/* Quick Attach from Client Checklist */}
            <div className="bg-slate-50/80 rounded-2xl border border-slate-200 p-4 space-y-2">
              <h4 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-[#C9A227]">assignment_ind</span>
                Documentos Cadastrados no Perfil do Cliente
              </h4>
              <p className="text-[11px] text-slate-500">Clique para vincular instantaneamente ao processo sem duplicar arquivos:</p>

              <div className="flex flex-wrap gap-2 pt-1">
                {[
                  'RG e CPF do Cliente.pdf',
                  'Comprovante de Residência Atual.pdf',
                  'Extrato CNIS Atualizado.pdf',
                  'Carteira de Trabalho (CTPS).pdf',
                  'Laudo Médico com CID.pdf',
                  'Comprovante de Cadastro Único (CadÚnico).pdf',
                ].map((docName) => (
                  <button
                    key={docName}
                    type="button"
                    onClick={() => handleAttachClientDoc(docName)}
                    className="px-3 py-1.5 bg-white hover:bg-amber-500/10 border border-slate-300 hover:border-[#C9A227] rounded-xl text-xs font-bold text-slate-800 transition-colors flex items-center gap-1 shadow-2xs"
                  >
                    <span className="material-symbols-outlined text-[14px] text-emerald-600">add_circle</span>
                    {docName}
                  </button>
                ))}
              </div>
            </div>

            {/* List of Attached Documents */}
            <div className="space-y-2">
              <h4 className="font-bold text-xs text-slate-900">
                Documentos Vinculados a Este Processo ({attachedDocs.length})
              </h4>

              {attachedDocs.length > 0 ? (
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-2xl overflow-hidden bg-white">
                  {attachedDocs.map((doc) => (
                    <div key={doc.id} className="p-3 flex items-center justify-between text-xs hover:bg-slate-50">
                      <div className="flex items-center gap-2.5">
                        <span className="material-symbols-outlined text-slate-500">description</span>
                        <div>
                          <p className="font-bold text-slate-900">{doc.name}</p>
                          <span className="text-[10px] text-slate-500">
                            Categoria: <strong className="text-slate-700">{doc.category}</strong> • {doc.size}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setAttachedDocs(attachedDocs.filter((d) => d.id !== doc.id))}
                        className="text-slate-400 hover:text-red-600 transition-colors"
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic py-2">
                  Nenhum documento anexado ainda. Você poderá adicionar mais arquivos a qualquer momento.
                </p>
              )}
            </div>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(3)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar para Informações
            </button>

            <button
              onClick={() => setCurrentStep(5)}
              className="px-6 py-3 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs hover:bg-[#1a1a1a] transition-all shadow-xs flex items-center gap-2"
            >
              <span>Avançar para Revisar</span>
              <span className="material-symbols-outlined text-[16px] text-[#C9A227]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 5: REVISAR PROCESSO                                             */}
      {/* ==================================================================== */}
      {currentStep === 5 && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xs p-6 sm:p-8 space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h2 className="font-title-md text-xl font-bold text-[#0D0D0D] flex items-center gap-2">
              <span className="material-symbols-outlined text-[#C9A227]">fact_check</span>
              5. Revisar e Confirmar Criação
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Confira os dados principais antes de confirmar a abertura oficial do processo.
            </p>
          </div>

          {/* Review Summary Card */}
          <div className="bg-slate-50 border border-slate-200 rounded-3xl p-6 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Cliente */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[#8c6e14] tracking-wider block">
                  CLIENTE VINCULADO
                </span>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-base">{selectedClient?.name}</h4>
                  <p className="text-xs text-slate-500 font-mono">CPF: {selectedClient?.cpf}</p>
                  <p className="text-xs text-slate-500 mt-1">Telefone: {selectedClient?.phone || 'Não inf.'}</p>
                  <p className="text-xs text-slate-500">Cidade: {selectedClient?.addressCityUf || 'Parnaíba/PI'}</p>
                </div>
              </div>

              {/* Processo */}
              <div className="space-y-2">
                <span className="text-[10px] font-extrabold uppercase text-[#8c6e14] tracking-wider block">
                  PROCESSO PREVIDENCIÁRIO
                </span>
                <div className="bg-white p-4 rounded-2xl border border-slate-200">
                  <h4 className="font-bold text-slate-900 text-base">{selectedProcessType?.name}</h4>
                  <p className="text-xs text-[#8c6e14] font-bold">{selectedProcessType?.categoryName}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    Atuação: <strong className="text-slate-800">{actingType}</strong>
                  </p>
                  <p className="text-xs text-slate-500">
                    Fase Inicial: <strong className="text-slate-800">{currentPhase}</strong>
                  </p>
                </div>
              </div>
            </div>

            {/* Equipe & Prazos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-white p-4 rounded-2xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">ADVOGADO RESPONSÁVEL</span>
                <strong className="text-slate-900">{responsibleUser.name}</strong>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">PRIORIDADE</span>
                <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-[#8c6e14] border border-[#C9A227] text-[10px] font-bold">
                  {priority}
                </span>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">DATA DE ABERTURA</span>
                <strong className="text-slate-900">{openingDate}</strong>
              </div>

              <div>
                <span className="text-slate-400 font-semibold block text-[10px] uppercase">DOCUMENTOS ANEXADOS</span>
                <strong className="text-slate-900">{attachedDocs.length} arquivo(s)</strong>
              </div>
            </div>

            {/* Parcerias & Captação Resumo (se houver) */}
            {(hasLawyerPartnership || hasScoutCommission) && (
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[10px] font-extrabold uppercase text-[#8c6e14] tracking-wider block flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-sm text-[#C9A227]">handshake</span>
                  PARCERIAS & REPASSE DE CAPTAÇÃO
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  {hasLawyerPartnership && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block text-[11px]">Advogado Parceiro:</span>
                      <strong className="text-slate-900 font-bold block">{partnerLawyerName || 'Não especificado'}</strong>
                      {partnerLawyerOab && <span className="text-slate-600 block text-[11px] font-mono">{partnerLawyerOab}</span>}
                      {partnerLawyerShare && (
                        <span className="text-[#8c6e14] font-semibold block text-[11px] mt-0.5">
                          Honorários: {partnerLawyerShare}
                        </span>
                      )}
                    </div>
                  )}

                  {hasScoutCommission && (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-medium block text-[11px]">Captador / Indicação:</span>
                      <strong className="text-slate-900 font-bold block">{scoutName || 'Não especificado'}</strong>
                      {scoutFeeOrShare && (
                        <span className="text-emerald-700 font-semibold block text-[11px] mt-0.5">
                          Repasse: {scoutFeeOrShare}
                        </span>
                      )}
                      {scoutNotes && <span className="text-slate-500 block text-[10px] italic mt-0.5">{scoutNotes}</span>}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCurrentStep(4)}
              className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Voltar
            </button>

            <button
              onClick={handleFinalSubmit}
              className="px-8 py-3.5 rounded-xl bg-[#0D0D0D] text-white border-2 border-[#C9A227] font-black text-sm hover:bg-[#1a1a1a] transition-all shadow-md flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-lg text-[#C9A227]">check_circle</span>
              <span>Criar Processo Oficialmente</span>
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* STEP 6: PROCESSO CRIADO COM SUCESSO                                  */}
      {/* ==================================================================== */}
      {currentStep === 6 && createdCaseResult && (
        <div className="bg-white rounded-3xl border border-slate-200/90 shadow-lg p-8 text-center max-w-3xl mx-auto space-y-6 animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 border-2 border-emerald-300 flex items-center justify-center mx-auto text-3xl shadow-xs">
            ✓
          </div>

          <div>
            <span className="px-3 py-1 bg-[#0D0D0D] text-[#C9A227] border border-[#C9A227] rounded-full text-xs font-bold uppercase tracking-widest">
              Processo Cadastrado
            </span>
            <h2 className="font-title-md text-2xl font-black text-[#0D0D0D] mt-3">
              Processo Criado com Sucesso!
            </h2>
            <p className="text-sm text-slate-500 mt-1">
              O processo <strong className="text-slate-900">{createdCaseResult.title}</strong> foi registrado para o cliente <strong className="text-slate-900">{createdCaseResult.clientName}</strong>.
            </p>
          </div>

          {/* Details Pill */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 text-left">
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">CÓDIGO INTERNO</span>
              <span className="font-mono font-extrabold text-slate-900">{createdCaseResult.caseNumber}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">ATUAÇÃO</span>
              <span className="font-extrabold text-slate-900">{createdCaseResult.actingType}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">RESPONSÁVEL</span>
              <span className="font-extrabold text-slate-900">{createdCaseResult.responsibleUserName}</span>
            </div>
            <div>
              <span className="text-slate-400 block text-[10px] uppercase font-bold">DOCUMENTOS</span>
              <span className="font-extrabold text-slate-900">{createdCaseResult.documents.length} arquivo(s)</span>
            </div>
          </div>

          {workflowToast && (
            <div className="p-3 bg-amber-50 border border-[#C9A227] rounded-xl text-xs text-[#8c6e14] font-bold">
              {workflowToast}
            </div>
          )}

          {/* Action Buttons Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            <button
              onClick={() => {
                onSelectCaseId(createdCaseResult.id);
                onNavigateToTab('cases');
              }}
              className="p-3.5 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs flex items-center justify-center gap-2 hover:bg-[#1a1a1a] transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-[18px] text-[#C9A227]">folder_open</span>
              Abrir Processo
            </button>

            <button
              onClick={() => {
                setWorkflowToast('Fluxo ainda não configurado para este tipo de processo.');
              }}
              className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">account_tree</span>
              Iniciar Fluxo
            </button>

            <button
              onClick={() => {
                if (onOpenDocModalForCase) {
                  onOpenDocModalForCase(createdCaseResult);
                } else {
                  onNavigateToTab('documents');
                }
              }}
              className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">description</span>
              Gerar Documento
            </button>

            <button
              onClick={() => {
                onSelectCaseId(createdCaseResult.id);
                onNavigateToTab('cases');
              }}
              className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">post_add</span>
              Adicionar Documento
            </button>

            <button
              onClick={() => {
                onNavigateToTab('calendar');
              }}
              className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">event</span>
              Criar Prazo / Tarefa
            </button>

            <button
              onClick={() => {
                onNavigateToTab('cases');
              }}
              className="p-3.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 font-bold text-xs flex items-center justify-center gap-2 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px] text-slate-600">arrow_back</span>
              Voltar aos Processos
            </button>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: VER CADASTRO COMPLETO DO CLIENTE                            */}
      {/* ==================================================================== */}
      {viewingClientFullDetail && selectedClient && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl overflow-hidden my-8 animate-fade-in">
            {/* Header */}
            <div className="bg-[#0D0D0D] text-white p-5 flex items-center justify-between border-b border-[#C9A227]/40">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-white/10 border border-[#C9A227] text-[#C9A227] flex items-center justify-center font-black text-lg">
                  {selectedClient.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-bold text-base text-white">{selectedClient.name}</h3>
                  <p className="text-xs text-slate-400">
                    CPF: {selectedClient.cpf} • Código: {selectedClient.code}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setViewingClientFullDetail(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto text-xs">
              {/* 1. Dados Pessoais */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px] text-[#8c6e14]">
                  Identificação Pessoal & Documentos
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block">Nome Social</span>
                    <strong className="text-slate-900">{selectedClient.socialName || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">RG / Órgão / UF</span>
                    <strong className="text-slate-900">
                      {selectedClient.rgNumber || 'Não inf.'} {selectedClient.rgIssuer || ''} {selectedClient.rgUf || ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Data Nasc. / Idade</span>
                    <strong className="text-slate-900">
                      {selectedClient.birthDate || 'Não inf.'} {calculateAge(selectedClient.birthDate) ? `(${calculateAge(selectedClient.birthDate)} anos)` : ''}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Nome da Mãe</span>
                    <strong className="text-slate-900">{selectedClient.motherName || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Estado Civil</span>
                    <strong className="text-slate-900">{selectedClient.maritalStatus || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Profissão / Ocupação</span>
                    <strong className="text-slate-900">{selectedClient.occupation || 'Não informado'}</strong>
                  </div>
                </div>
              </div>

              {/* 2. Endereço */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px] text-[#8c6e14]">
                  Endereço Residencial
                </h4>
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <p className="text-slate-900 font-medium">
                    {selectedClient.addressStreet || 'Rua'}, {selectedClient.addressNumber || 'S/N'}{' '}
                    {selectedClient.addressComplement ? `(${selectedClient.addressComplement})` : ''} - Bairro:{' '}
                    {selectedClient.addressNeighborhood || 'Centro'}, {selectedClient.addressCityUf || 'Parnaíba/PI'} - CEP:{' '}
                    {selectedClient.addressZip || '64200-000'} ({selectedClient.addressZone || 'Zona Urbana'})
                  </p>
                </div>
              </div>

              {/* 3. Dados Previdenciários & Bancários */}
              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 border-b border-slate-200 pb-1 uppercase tracking-wider text-[10px] text-[#8c6e14]">
                  Dados Previdenciários & Bancários
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80">
                  <div>
                    <span className="text-slate-400 block">NIT / PIS / PASEP</span>
                    <strong className="text-slate-900 font-mono">{selectedClient.nitPisPasep || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Número Benefício (NB)</span>
                    <strong className="text-slate-900 font-mono">{selectedClient.benefitNumber || 'Não informado'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Banco / Agência</span>
                    <strong className="text-slate-900">{selectedClient.bankName || 'Não inf.'} {selectedClient.bankAgency || ''}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block">Chave PIX</span>
                    <strong className="text-slate-900 truncate block">{selectedClient.pixKey || 'Não informada'}</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingClientFullDetail(false)}
                className="px-5 py-2 bg-[#0D0D0D] text-white rounded-xl font-bold text-xs hover:bg-[#1a1a1a] transition-colors"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL: + OUTRO PROCESSO PREVIDENCIÁRIO                               */}
      {/* ==================================================================== */}
      {customProcessModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4 animate-fade-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[#C9A227]">add_circle</span>
                + Outro Processo Previdenciário
              </h3>
              <button
                onClick={() => setCustomProcessModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">Nome do Processo *</label>
                <input
                  type="text"
                  value={customProcessName}
                  onChange={(e) => setCustomProcessName(e.target.value)}
                  placeholder="Ex: Aposentadoria de Anistiado Político"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-[#0D0D0D]"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Descrição do Benefício / Processo</label>
                <textarea
                  rows={2}
                  value={customProcessDescription}
                  onChange={(e) => setCustomProcessDescription(e.target.value)}
                  placeholder="Descreva resumidamente o objetivo deste processo..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Categoria</label>
                  <select
                    value={customProcessCategory}
                    onChange={(e) => setCustomProcessCategory(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    {PROCESS_CATEGORIES.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">Tipo de Atuação</label>
                  <select
                    value={customProcessActingType}
                    onChange={(e) => setCustomProcessActingType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                  >
                    <option value="Administrativo">Administrativo</option>
                    <option value="Judicial">Judicial</option>
                    <option value="Administrativo + Judicial">Administrativo + Judicial</option>
                    <option value="Consultivo">Consultivo</option>
                    <option value="Extrajudicial">Extrajudicial</option>
                    <option value="A definir">A definir</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCustomProcessModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs"
              >
                Cancelar
              </button>

              <button
                type="button"
                disabled={!customProcessName.trim()}
                onClick={() => {
                  const customProcObj: ProcessType = {
                    id: `custom_${Date.now()}`,
                    name: customProcessName,
                    slug: customProcessName.toLowerCase().replace(/\s+/g, '-'),
                    legal_area: 'previdenciario',
                    category: customProcessCategory,
                    categoryName: PROCESS_CATEGORIES.find((c) => c.id === customProcessCategory)?.name || 'Outro',
                    description: customProcessDescription || 'Processo previdenciário personalizado.',
                    icon: 'gavel',
                    active: true,
                    display_order: 100,
                    default_acting_type: customProcessActingType as any,
                  };
                  setSelectedProcessType(customProcObj);
                  setActingType(customProcessActingType);
                  setCustomProcessModalOpen(false);
                }}
                className="px-5 py-2 rounded-xl bg-[#0D0D0D] text-white border border-[#C9A227] font-bold text-xs hover:bg-[#1a1a1a] transition-all disabled:opacity-50"
              >
                Confirmar Processo Customizado
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
