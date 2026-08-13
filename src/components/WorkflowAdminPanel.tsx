import React, { useState, useRef } from 'react';
import {
  WorkflowTemplate,
  WorkflowStepTemplate,
  WorkflowField,
  ClassifiedDocument,
  GeneratedDocumentTemplateLink,
  ChecklistItemWithRules,
  ConditionalBranch,
  WorkflowAutomationRule,
  LegalCase,
  Client,
  WorkflowInstance,
} from '../types';
import { INITIAL_WORKFLOWS } from '../data/defaultWorkflows';
import { SOCIAL_SECURITY_PROCESS_TYPES } from '../data/socialSecurityProcessTypes';
import {
  validateWorkflowTemplate,
  exportWorkflowTemplateToJSON,
  importWorkflowTemplateFromJSON,
  instantiateWorkflow,
} from '../services/workflowEngine';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';

interface WorkflowAdminPanelProps {
  workflows: WorkflowTemplate[];
  onSaveWorkflows: (updatedWorkflows: WorkflowTemplate[]) => void;
  practiceAreas: string[];
}

export const WorkflowAdminPanel: React.FC<WorkflowAdminPanelProps> = ({
  workflows,
  onSaveWorkflows,
  practiceAreas,
}) => {
  const currentWorkflows = workflows && workflows.length > 0 ? workflows : INITIAL_WORKFLOWS;

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos');
  const [expandedWorkflowId, setExpandedWorkflowId] = useState<string | null>(
    currentWorkflows[0]?.id || null
  );

  // Modal State for New / Edit Workflow Template
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<WorkflowTemplate | null>(null);

  // Modal State for Advanced Step Editor
  const [isStepModalOpen, setIsStepModalOpen] = useState(false);
  const [editingStepWorkflowId, setEditingStepWorkflowId] = useState<string | null>(null);
  const [editingStep, setEditingStep] = useState<WorkflowStepTemplate | null>(null);
  const [stepActiveTab, setStepActiveTab] = useState<'basic' | 'fields' | 'checklist' | 'documents' | 'branching' | 'automations' | 'criteria'>('basic');

  // Form State for Workflow Creation/Edit
  const [wfTitle, setWfTitle] = useState('');
  const [wfCode, setWfCode] = useState('');
  const [wfCategory, setWfCategory] = useState('Direito Previdenciário');
  const [wfTypePill, setWfTypePill] = useState('');
  const [wfDescription, setWfDescription] = useState('');
  const [wfProcessTypeIds, setWfProcessTypeIds] = useState<string[]>([]);
  const [wfVersion, setWfVersion] = useState<number>(1);
  const [wfStatus, setWfStatus] = useState<'draft' | 'published' | 'archived'>('draft');

  // Form State for Step Editing
  const [stepName, setStepName] = useState('');
  const [stepCode, setStepCode] = useState('');
  const [stepDescription, setStepDescription] = useState('');
  const [stepType, setStepType] = useState<'mandatory' | 'optional' | 'conditional'>('mandatory');
  const [stepSlaDays, setStepSlaDays] = useState<number>(5);
  const [stepProcessDeadlineDays, setStepProcessDeadlineDays] = useState<number | undefined>(undefined);
  const [stepRole, setStepRole] = useState<string>('Advogado Associado');
  const [stepRequiresReview, setStepRequiresReview] = useState<boolean>(false);

  // Step Collections
  const [stepFields, setStepFields] = useState<WorkflowField[]>([]);
  const [stepChecklist, setStepChecklist] = useState<ChecklistItemWithRules[]>([]);
  const [stepRequiredDocs, setStepRequiredDocs] = useState<ClassifiedDocument[]>([]);
  const [stepGenDocs, setStepGenDocs] = useState<GeneratedDocumentTemplateLink[]>([]);
  const [stepBranches, setStepBranches] = useState<ConditionalBranch[]>([]);

  // Temp State for New Field in Step Editor
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [newFieldType, setNewFieldType] = useState<WorkflowField['type']>('short_text');
  const [newFieldRequired, setNewFieldRequired] = useState(true);

  // Temp State for New Checklist Item
  const [newChecklistText, setNewChecklistText] = useState('');

  // Temp State for New Document Requirement
  const [newDocTitle, setNewDocTitle] = useState('');
  const [newDocClassification, setNewDocClassification] = useState<'mandatory' | 'recommended' | 'optional'>('mandatory');

  // Temp State for New Generated Document Link
  const [newGenDocTitle, setNewGenDocTitle] = useState('');

  // Temp State for New Branch
  const [newBranchLabel, setNewBranchLabel] = useState('');
  const [newBranchTargetStepId, setNewBranchTargetStepId] = useState('');
  const [newBranchFieldKey, setNewBranchFieldKey] = useState('');
  const [newBranchValue, setNewBranchValue] = useState('');

  // Validation Modal State
  const [validationResultModalOpen, setValidationResultModalOpen] = useState(false);
  const [validationOutput, setValidationOutput] = useState<{ isValid: boolean; issues: any[] } | null>(null);

  // Simulation Runner Modal State ("Testar Workflow")
  const [simulationModalOpen, setSimulationModalOpen] = useState(false);
  const [simulatedInstance, setSimulatedInstance] = useState<WorkflowInstance | null>(null);
  const [simulatedCase, setSimulatedCase] = useState<LegalCase | null>(null);
  const [simulatedClient, setSimulatedClient] = useState<Client | null>(null);

  // Import JSON Modal State
  const [importJsonModalOpen, setImportJsonModalOpen] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Filter workflows
  const filteredWorkflows = currentWorkflows.filter((wf) => {
    const matchesCategory =
      selectedCategory === 'Todos' ||
      (selectedCategory === 'Publicados' && wf.status === 'published') ||
      (selectedCategory === 'Rascunhos' && wf.status === 'draft') ||
      wf.category.toLowerCase().includes(selectedCategory.toLowerCase());

    const matchesSearch =
      wf.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      wf.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (wf.typePill && wf.typePill.toLowerCase().includes(searchTerm.toLowerCase()));

    return matchesCategory && matchesSearch;
  });

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingWorkflow(null);
    setWfTitle('');
    setWfCode(`WF-PREV-${Date.now().toString().slice(-4)}`);
    setWfCategory(practiceAreas[0] || 'Direito Previdenciário');
    setWfTypePill('Previdenciário');
    setWfDescription('');
    setWfProcessTypeIds(['bpc_pcd']);
    setWfVersion(1);
    setWfStatus('draft');
    setIsModalOpen(true);
  };

  // Open Edit Modal for workflow info
  const handleOpenEditModal = (wf: WorkflowTemplate) => {
    setEditingWorkflow(wf);
    setWfTitle(wf.title);
    setWfCode(wf.code);
    setWfCategory(wf.category);
    setWfTypePill(wf.typePill || wf.category);
    setWfDescription(wf.description);
    setWfProcessTypeIds(wf.processTypeIds || []);
    setWfVersion(wf.version || 1);
    setWfStatus(wf.status || 'published');
    setIsModalOpen(true);
  };

  // Save Workflow Template Details
  const handleSaveWorkflowModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!wfTitle.trim()) return;

    if (editingWorkflow) {
      const updatedList = currentWorkflows.map((wf) =>
        wf.id === editingWorkflow.id
          ? {
              ...wf,
              title: wfTitle.trim(),
              code: wfCode.trim() || wf.code,
              category: wfCategory,
              typePill: wfTypePill.trim() || wfCategory,
              description: wfDescription.trim(),
              processTypeIds: wfProcessTypeIds,
              version: wfVersion,
              status: wfStatus,
              updatedAt: new Date().toISOString().split('T')[0],
            }
          : wf
      );
      onSaveWorkflows(updatedList);
      showToast('Template de Workflow atualizado com sucesso!');
    } else {
      const newWf: WorkflowTemplate = {
        id: `wf-custom-${Date.now()}`,
        code: wfCode.trim() || `WF-PREV-${Date.now().toString().slice(-4)}`,
        title: wfTitle.trim(),
        category: wfCategory,
        typePill: wfTypePill.trim() || 'Customizado',
        description: wfDescription.trim() || 'Novo workflow customizado do escritório.',
        processTypeIds: wfProcessTypeIds,
        version: 1,
        status: 'draft',
        author: 'Dr. Bizerra Neto',
        estimatedTotalDays: 60,
        active: true,
        createdAt: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString().split('T')[0],
        steps: [
          {
            id: `step-${Date.now()}-1`,
            order: 1,
            name: '1. Atendimento & Triagem Inicial',
            description: 'Coleta preliminar de dados do cliente e procuração.',
            stepType: 'mandatory',
            slaDays: 5,
            responsibleRole: 'Secretaria',
            requiresLawyerReview: false,
            completionCriteria: ['manual'],
            fields: [],
            checklist: [],
            requiredDocuments: [],
            generatedDocuments: [],
            automations: [],
          },
        ],
      };

      onSaveWorkflows([newWf, ...currentWorkflows]);
      setExpandedWorkflowId(newWf.id);
      showToast('Novo Template de Workflow criado!');
    }

    setIsModalOpen(false);
  };

  // Duplicate Workflow Template
  const handleDuplicateWorkflow = (wf: WorkflowTemplate) => {
    const duplicated: WorkflowTemplate = {
      ...wf,
      id: `wf-dup-${Date.now()}`,
      title: `${wf.title} (Cópia Rascunho)`,
      code: `${wf.code}-COPY`,
      version: 1,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      steps: wf.steps.map((st, idx) => ({
        ...st,
        id: `step-dup-${Date.now()}-${idx + 1}`,
      })),
    };

    onSaveWorkflows([duplicated, ...currentWorkflows]);
    setExpandedWorkflowId(duplicated.id);
    showToast('Workflow duplicado com sucesso em versão Rascunho v1.');
  };

  // Publish New Version
  const handlePublishNewVersion = (wf: WorkflowTemplate) => {
    const validation = validateWorkflowTemplate(wf);
    if (!validation.isValid) {
      setValidationOutput(validation);
      setValidationResultModalOpen(true);
      showToast('Não é possível publicar um workflow com inconsistências estruturais.');
      return;
    }

    const updatedList = currentWorkflows.map((w) => {
      if (w.id === wf.id) {
        return {
          ...w,
          status: 'published' as const,
          publishedAt: new Date().toISOString().split('T')[0],
          updatedAt: new Date().toISOString().split('T')[0],
        };
      }
      // Archive older published versions of the same code
      if (w.code === wf.code && w.status === 'published' && w.id !== wf.id) {
        return {
          ...w,
          status: 'archived' as const,
        };
      }
      return w;
    });

    onSaveWorkflows(updatedList);
    showToast(`Workflow "${wf.title}" (v${wf.version}) publicado com sucesso!`);
  };

  // Create New Draft Version from Published Template
  const handleCreateNewDraftVersion = (wf: WorkflowTemplate) => {
    const newDraft: WorkflowTemplate = {
      ...wf,
      id: `wf-${Date.now()}`,
      parentTemplateId: wf.id,
      version: (wf.version || 1) + 1,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      title: wf.title,
      changelog: `Rascunho criado a partir da versão v${wf.version}`,
      steps: wf.steps.map((s, idx) => ({
        ...s,
        id: `step-${Date.now()}-${idx + 1}`,
      })),
    };

    onSaveWorkflows([newDraft, ...currentWorkflows]);
    setExpandedWorkflowId(newDraft.id);
    showToast(`Nova versão v${newDraft.version} (Rascunho) criada para edição sem afetar casos ativos!`);
  };

  // Run Workflow Validation
  const handleRunValidation = (wf: WorkflowTemplate) => {
    const res = validateWorkflowTemplate(wf);
    setValidationOutput(res);
    setValidationResultModalOpen(true);
  };

  // Open Step Modal
  const handleOpenStepModal = (wfId: string, step?: WorkflowStepTemplate) => {
    setEditingStepWorkflowId(wfId);
    setEditingStep(step || null);
    setStepActiveTab('basic');

    if (step) {
      setStepName(step.name);
      setStepCode(step.code || '');
      setStepDescription(step.description);
      setStepType(step.stepType || 'mandatory');
      setStepSlaDays(step.slaDays || 5);
      setStepProcessDeadlineDays(step.processDeadlineDays);
      setStepRole(step.responsibleRole);
      setStepRequiresReview(Boolean(step.requiresLawyerReview));
      setStepFields(step.fields || []);
      setStepChecklist(step.checklist || []);
      setStepRequiredDocs(step.requiredDocuments || []);
      setStepGenDocs(step.generatedDocuments || []);
      setStepBranches(step.conditionalNextSteps || []);
    } else {
      const parentWf = currentWorkflows.find((w) => w.id === wfId);
      const nextOrder = (parentWf?.steps.length || 0) + 1;
      setStepName(`${nextOrder}. Nova Etapa`);
      setStepCode(`step_${nextOrder}`);
      setStepDescription('');
      setStepType('mandatory');
      setStepSlaDays(5);
      setStepProcessDeadlineDays(undefined);
      setStepRole('Advogado Associado');
      setStepRequiresReview(false);
      setStepFields([]);
      setStepChecklist([]);
      setStepRequiredDocs([]);
      setStepGenDocs([]);
      setStepBranches([]);
    }

    setIsStepModalOpen(true);
  };

  // Save Step Details
  const handleSaveStepModal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!stepName.trim() || !editingStepWorkflowId) return;

    const parentWf = currentWorkflows.find((w) => w.id === editingStepWorkflowId);
    if (!parentWf) return;

    let updatedSteps: WorkflowStepTemplate[];

    if (editingStep) {
      updatedSteps = parentWf.steps.map((st) =>
        st.id === editingStep.id
          ? {
              ...st,
              name: stepName.trim(),
              code: stepCode.trim(),
              description: stepDescription.trim(),
              stepType,
              slaDays: stepSlaDays,
              processDeadlineDays: stepProcessDeadlineDays,
              responsibleRole: stepRole,
              requiresLawyerReview: stepRequiresReview,
              fields: stepFields,
              checklist: stepChecklist,
              requiredDocuments: stepRequiredDocs,
              generatedDocuments: stepGenDocs,
              conditionalNextSteps: stepBranches,
            }
          : st
      );
    } else {
      const newStep: WorkflowStepTemplate = {
        id: `step-${Date.now()}`,
        order: parentWf.steps.length + 1,
        name: stepName.trim(),
        code: stepCode.trim(),
        description: stepDescription.trim(),
        stepType,
        slaDays: stepSlaDays,
        processDeadlineDays: stepProcessDeadlineDays,
        responsibleRole: stepRole,
        requiresLawyerReview: stepRequiresReview,
        completionCriteria: ['manual'],
        fields: stepFields,
        checklist: stepChecklist,
        requiredDocuments: stepRequiredDocs,
        generatedDocuments: stepGenDocs,
        conditionalNextSteps: stepBranches,
        automations: [],
      };
      updatedSteps = [...parentWf.steps, newStep];
    }

    const updatedWorkflows = currentWorkflows.map((w) =>
      w.id === editingStepWorkflowId
        ? {
            ...w,
            steps: updatedSteps,
            estimatedTotalDays: updatedSteps.reduce((acc, curr) => acc + (curr.slaDays || 0), 0),
            updatedAt: new Date().toISOString().split('T')[0],
          }
        : w
    );

    onSaveWorkflows(updatedWorkflows);
    setIsStepModalOpen(false);
    showToast('Etapa e configurações salvas com sucesso!');
  };

  // Helper to add custom field to step
  const handleAddCustomField = () => {
    if (!newFieldLabel.trim()) return;
    const key = newFieldKey.trim() || newFieldLabel.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');

    const field: WorkflowField = {
      id: `fld-${Date.now()}`,
      key,
      label: newFieldLabel.trim(),
      type: newFieldType,
      required: newFieldRequired,
      variableName: `[${key.toUpperCase()}]`,
    };

    setStepFields([...stepFields, field]);
    setNewFieldLabel('');
    setNewFieldKey('');
  };

  // Helper to add checklist item
  const handleAddChecklist = () => {
    if (!newChecklistText.trim()) return;
    const chk: ChecklistItemWithRules = {
      id: `chk-${Date.now()}`,
      text: newChecklistText.trim(),
      mandatory: true,
      responsibleRole: stepRole,
    };
    setStepChecklist([...stepChecklist, chk]);
    setNewChecklistText('');
  };

  // Helper to add required document requirement
  const handleAddReqDoc = () => {
    if (!newDocTitle.trim()) return;
    const doc: ClassifiedDocument = {
      id: `doc-${Date.now()}`,
      title: newDocTitle.trim(),
      classification: newDocClassification,
    };
    setStepRequiredDocs([...stepRequiredDocs, doc]);
    setNewDocTitle('');
  };

  // Helper to add generated document link
  const handleAddGenDoc = () => {
    if (!newGenDocTitle.trim()) return;
    const gdoc: GeneratedDocumentTemplateLink = {
      id: `gdoc-${Date.now()}`,
      title: newGenDocTitle.trim(),
      autoGenerateTiming: 'on_step_enter',
    };
    setStepGenDocs([...stepGenDocs, gdoc]);
    setNewGenDocTitle('');
  };

  // Helper to add conditional branch
  const handleAddBranch = () => {
    if (!newBranchLabel.trim() || !newBranchTargetStepId) return;

    const branch: ConditionalBranch = {
      id: `br-${Date.now()}`,
      label: newBranchLabel.trim(),
      targetStepId: newBranchTargetStepId,
      conditionRule: {
        logicalOperator: 'AND',
        conditions: newBranchFieldKey
          ? [{ fieldKey: newBranchFieldKey, operator: 'equals', value: newBranchValue }]
          : [],
      },
    };

    setStepBranches([...stepBranches, branch]);
    setNewBranchLabel('');
    setNewBranchFieldKey('');
    setNewBranchValue('');
  };

  // Run Simulation Mode ("Testar Workflow")
  const handleRunSimulation = (wf: WorkflowTemplate) => {
    const mockClient: Client = {
      id: 'cli-sim-1',
      code: 'CLI-001',
      name: 'Maria Francisca da Silva (Simulação)',
      cpf: '123.456.789-00',
      phone: '(86) 99988-1122',
      email: 'maria.simulacao@email.com',
      birthDate: '1965-04-12',
      status: 'Ativo',
      typePill: 'Pessoa Física',
      updatedAt: '2026-08-11',
      casesCount: 1,
    };

    const mockCase: LegalCase = {
      id: 'case-sim-1',
      caseNumber: 'SIM-2026/001',
      processNumber: '1982736412-SIM',
      court: 'INSS - Agência Teresina',
      category: 'Previdenciário',
      title: `Simulação de ${wf.title}`,
      clientId: mockClient.id,
      clientName: mockClient.name,
      clientCpf: mockClient.cpf,
      processTypeId: wf.processTypeIds[0] || 'bpc_pcd',
      responsibleUserId: 'usr-1',
      responsibleUserName: 'Dr. Bizerra Neto',
      statusLabel: 'Em Andamento',
      notes: ['Simulação iniciada no Painel Administrativo'],
      currentStepIndex: 0,
      steps: [],
      documents: [],
      deadlinesCount: 0,
      costs: [],
    };

    const mockInstance = instantiateWorkflow(wf, mockCase, mockClient);

    setSimulatedClient(mockClient);
    setSimulatedCase(mockCase);
    setSimulatedInstance(mockInstance);
    setSimulationModalOpen(true);
  };

  // Export JSON
  const handleExportJSON = (wf: WorkflowTemplate) => {
    const jsonStr = exportWorkflowTemplateToJSON(wf);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workflow-${wf.code.toLowerCase()}-v${wf.version}.json`;
    a.click();
    showToast(`JSON do workflow "${wf.title}" exportado!`);
  };

  // Import JSON Submit
  const handleImportJsonSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importJsonText.trim()) return;

    const res = importWorkflowTemplateFromJSON(importJsonText);
    if (res.success && res.template) {
      onSaveWorkflows([res.template, ...currentWorkflows]);
      setExpandedWorkflowId(res.template.id);
      setImportJsonModalOpen(false);
      setImportJsonText('');
      showToast(`Workflow "${res.template.title}" importado com sucesso como Rascunho!`);
    } else {
      alert(`Erro na importação: ${res.error}`);
    }
  };

  // Restore Defaults
  const handleRestoreDefaults = () => {
    if (window.confirm('Deseja restaurar os modelos nativos padrão (BPC/LOAS, Aposentadoria, Incapacidade, Salário-Maternidade)? Suas personalizações existentes serão preservadas.')) {
      onSaveWorkflows(INITIAL_WORKFLOWS);
      showToast('Modelos de workflow nativos restaurados!');
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-[#0D0D0D] text-white px-4 py-3 rounded-2xl shadow-2xl border border-[#C9A227]/50 flex items-center space-x-2 animate-in fade-in slide-in-from-top-2 text-xs font-bold">
          <span className="material-symbols-outlined text-[#C9A227] text-sm">check_circle</span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-[#0D0D0D] text-white border border-[#C9A227]/40 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C9A227] text-slate-950">
              Motor de Workflows Jurídicos
            </span>
            <span className="text-xs text-slate-400 font-medium">Arquitetura Desconectada Template/Instance</span>
          </div>
          <h2 className="text-xl font-black text-white">Gerenciador de Templates de Processos</h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl font-medium leading-relaxed">
            Crie, controle versões e parametrize fluxos de trabalho previdenciários com regras condicionais, custom fields, checklists e automações.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setImportJsonModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">file_upload</span>
            <span>Importar JSON</span>
          </button>

          <button
            onClick={handleRestoreDefaults}
            className="px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-sm">restart_alt</span>
            <span>Restaurar Nativos</span>
          </button>

          <button
            onClick={handleOpenCreateModal}
            className="px-4 py-2 rounded-xl bg-[#C9A227] hover:bg-[#b08d20] text-slate-950 font-black text-xs shadow-md flex items-center gap-1.5 transition-all"
          >
            <span className="material-symbols-outlined text-sm font-black">add</span>
            <span>Novo Template</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
        <div className="relative w-full sm:w-80">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">search</span>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por nome, código ou palavra-chave..."
            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-slate-900 focus:ring-2 focus:ring-[#C9A227]"
          />
        </div>

        <div className="flex items-center space-x-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto overflow-x-auto text-xs font-bold">
          {['Todos', 'Publicados', 'Rascunhos'].map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                selectedCategory === cat
                  ? 'bg-white text-slate-900 shadow-xs font-extrabold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Templates List */}
      <div className="space-y-4">
        {filteredWorkflows.length === 0 ? (
          <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-2">
            <span className="material-symbols-outlined text-3xl text-slate-300">route</span>
            <p className="text-xs font-bold text-slate-500">Nenhum template de workflow encontrado para os filtros.</p>
          </div>
        ) : (
          filteredWorkflows.map((wf) => {
            const isExpanded = expandedWorkflowId === wf.id;

            return (
              <div
                key={wf.id}
                className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden transition-all"
              >
                {/* Template Header Card */}
                <div className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50 hover:bg-slate-50 transition-all border-b border-slate-100">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-slate-900 text-white font-mono">
                        {wf.code}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-amber-100 text-amber-900 border border-amber-200">
                        v{wf.version || 1} • {wf.status === 'published' ? 'Publicado' : 'Rascunho'}
                      </span>
                      <span className="text-xs text-slate-400 font-medium">({wf.steps.length} Etapas)</span>
                    </div>

                    <h3 className="text-base font-black text-slate-900">{wf.title}</h3>
                    <p className="text-xs text-slate-500 font-medium line-clamp-2">{wf.description}</p>
                  </div>

                  {/* Actions for Template */}
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleRunSimulation(wf)}
                      className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-900 border border-purple-200 font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">science</span>
                      <span>Simular</span>
                    </button>

                    <button
                      onClick={() => handleRunValidation(wf)}
                      className="px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">fact_check</span>
                      <span>Validar</span>
                    </button>

                    <button
                      onClick={() => handleDuplicateWorkflow(wf)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">content_copy</span>
                      <span>Duplicar</span>
                    </button>

                    <button
                      onClick={() => handleExportJSON(wf)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-sm">download</span>
                      <span>JSON</span>
                    </button>

                    {wf.status === 'draft' ? (
                      <button
                        onClick={() => handlePublishNewVersion(wf)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs transition-all flex items-center gap-1 shadow-xs"
                      >
                        <span className="material-symbols-outlined text-sm">publish</span>
                        <span>Publicar Versão v{wf.version}</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleCreateNewDraftVersion(wf)}
                        className="px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex items-center gap-1 shadow-xs"
                        title="Cria uma nova versão Rascunho sem alterar os processos ativos"
                      >
                        <span className="material-symbols-outlined text-sm">add_circle</span>
                        <span>Nova Versão v{(wf.version || 1) + 1}</span>
                      </button>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(wf)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                      title="Editar Propriedades do Workflow"
                    >
                      <span className="material-symbols-outlined text-base">edit</span>
                    </button>

                    <button
                      onClick={() => setExpandedWorkflowId(isExpanded ? null : wf.id)}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-extrabold text-xs transition-all flex items-center gap-1"
                    >
                      <span>{isExpanded ? 'Ocultar Etapas' : 'Ver Etapas'}</span>
                      <span className="material-symbols-outlined text-sm">
                        {isExpanded ? 'expand_less' : 'expand_more'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Expanded Steps View */}
                {isExpanded && (
                  <div className="p-6 bg-slate-50/70 space-y-4 animate-in fade-in">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                      <span className="text-xs font-black text-slate-700 uppercase tracking-wider">
                        Estrutura de Etapas do Workflow ({wf.steps.length})
                      </span>

                      <button
                        onClick={() => handleOpenStepModal(wf.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-black text-xs transition-all flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-sm">add</span>
                        <span>Adicionar Etapa</span>
                      </button>
                    </div>

                    <div className="space-y-3">
                      {wf.steps.map((st) => (
                        <div
                          key={st.id}
                          className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4"
                        >
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-black text-[10px]">
                                #{st.order}
                              </span>
                              <span className="text-xs font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                                SLA: {st.slaDays} dias
                              </span>
                              <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
                                {st.responsibleRole}
                              </span>
                              {st.requiresLawyerReview && (
                                <span className="text-[10px] font-black text-purple-800 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                                  Requer Revisão
                                </span>
                              )}
                            </div>

                            <h4 className="text-sm font-black text-slate-900">{st.name}</h4>
                            <p className="text-xs text-slate-500 font-medium">{st.description}</p>

                            {/* Tags for counts */}
                            <div className="flex flex-wrap gap-2 pt-1 text-[10px] font-bold text-slate-500">
                              <span>📝 {st.fields?.length || 0} Campos</span>
                              <span>☑️ {st.checklist?.length || 0} Checklist</span>
                              <span>📄 {st.requiredDocuments?.length || 0} Docs Exigidos</span>
                              <span>🔀 {st.conditionalNextSteps?.length || 0} Ramificações</span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              onClick={() => handleOpenStepModal(wf.id, st)}
                              className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs transition-all flex items-center gap-1"
                            >
                              <span className="material-symbols-outlined text-sm">tune</span>
                              <span>Configurar Etapa</span>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* MODAL 1: Create / Edit Workflow Template */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-base">
                {editingWorkflow ? 'Editar Propriedades do Workflow' : 'Novo Template de Workflow'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveWorkflowModal} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Título do Workflow *</label>
                  <input
                    type="text"
                    required
                    value={wfTitle}
                    onChange={(e) => setWfTitle(e.target.value)}
                    placeholder="Ex: BPC/LOAS - Pessoa com Deficiência"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Código Identificador *</label>
                  <input
                    type="text"
                    required
                    value={wfCode}
                    onChange={(e) => setWfCode(e.target.value)}
                    placeholder="Ex: WF-PREV-BPC-PCD"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Descrição</label>
                <textarea
                  rows={2}
                  value={wfDescription}
                  onChange={(e) => setWfDescription(e.target.value)}
                  placeholder="Explique o propósito e alcance deste fluxo..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tipos de Processo Vinculados</label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  {SOCIAL_SECURITY_PROCESS_TYPES.map((pt) => {
                    const isChecked = wfProcessTypeIds.includes(pt.id);
                    return (
                      <label key={pt.id} className="flex items-center space-x-2 text-[11px] font-bold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) setWfProcessTypeIds([...wfProcessTypeIds, pt.id]);
                            else setWfProcessTypeIds(wfProcessTypeIds.filter((id) => id !== pt.id));
                          }}
                          className="rounded text-[#C9A227] focus:ring-[#C9A227]"
                        />
                        <span>{pt.name}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-black shadow-sm"
                >
                  Salvar Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Step Configuration Editor */}
      {isStepModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  {editingStep ? `Configurar Etapa: ${editingStep.name}` : 'Nova Etapa do Workflow'}
                </h3>
                <p className="text-xs text-slate-500 font-medium">Configure campos, checklists, documentos e ramificações condicionais.</p>
              </div>
              <button onClick={() => setIsStepModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Editor Sub-Tabs */}
            <div className="flex items-center space-x-1 border-b border-slate-200 pb-2 text-xs font-bold overflow-x-auto">
              {[
                { id: 'basic', label: 'Básico & SLAs', icon: 'info' },
                { id: 'fields', label: `Campos (${stepFields.length})`, icon: 'edit_note' },
                { id: 'checklist', label: `Checklist (${stepChecklist.length})`, icon: 'check_box' },
                { id: 'documents', label: `Documentos (${stepRequiredDocs.length + stepGenDocs.length})`, icon: 'folder' },
                { id: 'branching', label: `Ramificações (${stepBranches.length})`, icon: 'call_split' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStepActiveTab(tab.id as any)}
                  className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 shrink-0 ${
                    stepActiveTab === tab.id
                      ? 'bg-slate-900 text-white font-black'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <span className="material-symbols-outlined text-sm">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              ))}
            </div>

            {/* Tab Body */}
            <form onSubmit={handleSaveStepModal} className="space-y-4 text-xs overflow-y-auto pr-1 flex-1">
              {/* SUB-TAB 1: Basic */}
              {stepActiveTab === 'basic' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Nome da Etapa *</label>
                      <input
                        type="text"
                        required
                        value={stepName}
                        onChange={(e) => setStepName(e.target.value)}
                        placeholder="Ex: Triagem Socioeconômica & CadÚnico"
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-slate-700 mb-1">SLA Interno (Dias) *</label>
                      <input
                        type="number"
                        required
                        value={stepSlaDays}
                        onChange={(e) => setStepSlaDays(Number(e.target.value))}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Descrição e Instruções para a Equipe</label>
                    <textarea
                      rows={3}
                      value={stepDescription}
                      onChange={(e) => setStepDescription(e.target.value)}
                      placeholder="Orientações detalhadas do que o operador deve fazer nesta fase..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">Papel Responsável Padrão</label>
                      <select
                        value={stepRole}
                        onChange={(e) => setStepRole(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                      >
                        <option value="Advogado Titular">Advogado Titular</option>
                        <option value="Advogado Associado">Advogado Associado</option>
                        <option value="Paralegal">Paralegal</option>
                        <option value="Estagiário">Estagiário</option>
                        <option value="Secretaria">Secretaria</option>
                      </select>
                    </div>

                    <div className="flex items-center pt-6">
                      <label className="flex items-center space-x-2 font-bold text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={stepRequiresReview}
                          onChange={(e) => setStepRequiresReview(e.target.checked)}
                          className="rounded text-[#C9A227] focus:ring-[#C9A227] w-4 h-4"
                        />
                        <span>Exige Revisão/Aprovação do Advogado</span>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 2: Custom Fields */}
              {stepActiveTab === 'fields' && (
                <div className="space-y-4">
                  <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                    <span className="font-black text-slate-800 text-xs">Adicionar Novo Campo</span>
                    <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
                      <input
                        type="text"
                        value={newFieldLabel}
                        onChange={(e) => setNewFieldLabel(e.target.value)}
                        placeholder="Renda Familiar, DER, CID..."
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-medium"
                      />

                      <select
                        value={newFieldType}
                        onChange={(e) => setNewFieldType(e.target.value as any)}
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-bold"
                      >
                        <option value="short_text">Texto Curto</option>
                        <option value="long_text">Texto Longo</option>
                        <option value="currency">Moeda (R$)</option>
                        <option value="number">Número</option>
                        <option value="date">Data</option>
                        <option value="boolean">Sim / Não</option>
                        <option value="single_select">Seleção Única</option>
                      </select>

                      <input
                        type="text"
                        value={newFieldKey}
                        onChange={(e) => setNewFieldKey(e.target.value)}
                        placeholder="slug (ex: renda_familiar)"
                        className="bg-white border border-slate-300 rounded-xl px-3 py-1.5 font-mono text-[11px]"
                      />

                      <button
                        type="button"
                        onClick={handleAddCustomField}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold"
                      >
                        + Adicionar
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {stepFields.map((fld) => (
                      <div key={fld.id} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs">
                        <div>
                          <span className="font-bold text-slate-900">{fld.label}</span>
                          <span className="ml-2 font-mono text-[10px] text-blue-800 bg-blue-50 px-1.5 py-0.5 rounded">
                            {fld.variableName}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setStepFields(stepFields.filter((f) => f.id !== fld.id))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 3: Checklist */}
              {stepActiveTab === 'checklist' && (
                <div className="space-y-4">
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={newChecklistText}
                      onChange={(e) => setNewChecklistText(e.target.value)}
                      placeholder="Ex: Solicitar Resumo V7/V9 do CadÚnico..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                    />
                    <button
                      type="button"
                      onClick={handleAddChecklist}
                      className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shrink-0"
                    >
                      + Adicionar
                    </button>
                  </div>

                  <div className="space-y-2">
                    {stepChecklist.map((chk) => (
                      <div key={chk.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <span className="font-bold text-slate-800">{chk.text}</span>
                        <button
                          type="button"
                          onClick={() => setStepChecklist(stepChecklist.filter((c) => c.id !== chk.id))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB 4: Documents */}
              {stepActiveTab === 'documents' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <span className="font-black text-slate-800">1. Documentos Exigidos do Cliente</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newDocTitle}
                        onChange={(e) => setNewDocTitle(e.target.value)}
                        placeholder="Ex: Laudo Médico Atualizado com CID..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddReqDoc}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      {stepRequiredDocs.map((doc) => (
                        <div key={doc.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                          <span className="font-bold text-slate-800">{doc.title}</span>
                          <button
                            type="button"
                            onClick={() => setStepRequiredDocs(stepRequiredDocs.filter((d) => d.id !== doc.id))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t border-slate-200 pt-3">
                    <span className="font-black text-slate-800">2. Documentos Gerados pelo Sistema</span>
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={newGenDocTitle}
                        onChange={(e) => setNewGenDocTitle(e.target.value)}
                        placeholder="Ex: Procuração, Contrato de Honorários..."
                        className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-medium"
                      />
                      <button
                        type="button"
                        onClick={handleAddGenDoc}
                        className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl shrink-0"
                      >
                        + Adicionar
                      </button>
                    </div>

                    <div className="space-y-1 pt-1">
                      {stepGenDocs.map((gdoc) => (
                        <div key={gdoc.id} className="p-2.5 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-between">
                          <span className="font-bold text-purple-950">{gdoc.title}</span>
                          <button
                            type="button"
                            onClick={() => setStepGenDocs(stepGenDocs.filter((g) => g.id !== gdoc.id))}
                            className="text-rose-500 hover:text-rose-700"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB 5: Branching */}
              {stepActiveTab === 'branching' && (
                <div className="space-y-4">
                  <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 space-y-2">
                    <span className="font-black text-amber-900 text-xs">Adicionar Ramificação Condicional (SE... ENTÃO)</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <input
                        type="text"
                        value={newBranchLabel}
                        onChange={(e) => setNewBranchLabel(e.target.value)}
                        placeholder="Rótulo: Se CONCEDIDO"
                        className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-medium"
                      />

                      <input
                        type="text"
                        value={newBranchFieldKey}
                        onChange={(e) => setNewBranchFieldKey(e.target.value)}
                        placeholder="Campo: decisao_inss"
                        className="bg-white border border-amber-300 rounded-xl px-3 py-1.5 font-mono text-[11px]"
                      />

                      <button
                        type="button"
                        onClick={handleAddBranch}
                        className="px-3 py-1.5 rounded-xl bg-amber-600 text-white font-black"
                      >
                        + Adicionar Regra
                      </button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    {stepBranches.map((br) => (
                      <div key={br.id} className="p-3 rounded-xl bg-white border border-amber-200 flex items-center justify-between">
                        <span className="font-black text-slate-900">{br.label}</span>
                        <button
                          type="button"
                          onClick={() => setStepBranches(stepBranches.filter((b) => b.id !== br.id))}
                          className="text-rose-500 hover:text-rose-700"
                        >
                          <span className="material-symbols-outlined text-sm">delete</span>
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end space-x-2 pt-4 border-t border-slate-100 mt-auto">
                <button
                  type="button"
                  onClick={() => setIsStepModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-black shadow-sm"
                >
                  Salvar Configuração da Etapa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Validation Output */}
      {validationResultModalOpen && validationOutput && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className={`material-symbols-outlined text-xl ${validationOutput.isValid ? 'text-emerald-600' : 'text-amber-600'}`}>
                {validationOutput.isValid ? 'check_circle' : 'warning'}
              </span>
              <h3 className="font-black text-slate-900 text-sm">Relatório de Validação de Workflow</h3>
            </div>

            {validationOutput.isValid ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs font-bold space-y-1">
                <p>🟢 Workflow totalmente válido e seguro!</p>
                <p className="font-normal text-emerald-800">Todas as etapas, campos e conexões estão estruturados corretamente.</p>
              </div>
            ) : (
              <div className="space-y-2 text-xs">
                <span className="font-black text-amber-900">Foram encontrados os seguintes alertas/erros:</span>
                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {validationOutput.issues.map((iss, i) => (
                    <div key={i} className={`p-2.5 rounded-xl border text-xs ${iss.type === 'error' ? 'bg-rose-50 border-rose-200 text-rose-900' : 'bg-amber-50 border-amber-200 text-amber-900'}`}>
                      <span className="font-bold">{iss.type === 'error' ? '❌ Erro: ' : '⚠️ Alerta: '}</span>
                      <span>{iss.message}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setValidationResultModalOpen(false)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: Simulation Runner ("Testar Workflow") */}
      {simulationModalOpen && simulatedInstance && simulatedCase && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-100 rounded-3xl max-w-5xl w-full p-6 shadow-2xl border border-slate-300 space-y-4 max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div className="flex items-center space-x-2">
                <span className="px-3 py-1 rounded-full bg-purple-900 text-white font-black text-xs uppercase tracking-wider">
                  MODO DE TESTE E SIMULAÇÃO
                </span>
                <span className="text-xs text-slate-500 font-bold">Nenhum dado real será gravado.</span>
              </div>
              <button onClick={() => setSimulationModalOpen(false)} className="text-slate-500 hover:text-slate-800">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <WorkflowExecutionPanel
              instance={simulatedInstance}
              legalCase={simulatedCase}
              client={simulatedClient}
              onUpdateInstance={(updated) => setSimulatedInstance(updated)}
            />
          </div>
        </div>
      )}

      {/* MODAL 5: Import JSON */}
      {importJsonModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-black text-slate-900 text-sm">Importar Template de Workflow (JSON)</h3>
              <button onClick={() => setImportJsonModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <form onSubmit={handleImportJsonSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Cole o código JSON do Workflow:</label>
                <textarea
                  rows={8}
                  required
                  value={importJsonText}
                  onChange={(e) => setImportJsonText(e.target.value)}
                  placeholder='{"title": "Workflow BPC...", "steps": [...]}'
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 font-mono text-[11px]"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setImportJsonModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-slate-900 text-white font-black hover:bg-black"
                >
                  Importar & Validar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
