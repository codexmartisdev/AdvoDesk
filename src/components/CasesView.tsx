import React, { useState, useEffect } from 'react';
import { LegalCase, CaseDocument, Client } from '../types';
import { getBrasiliaISO, getBrasiliaFormatted, formatToPtBR } from '../utils/dateUtils';
import { calculateLegalDeadline, DeadlineType } from '../utils/legalDeadlines';
import { WorkflowExecutionPanel } from './WorkflowExecutionPanel';
import { instantiateWorkflow } from '../services/workflowEngine';
import { INITIAL_WORKFLOWS } from '../data/defaultWorkflows';

interface CasesViewProps {
  cases: LegalCase[];
  clients?: Client[];
  selectedCaseId: string;
  onSelectCaseId: (id: string) => void;
  onOpenDocModal: () => void;
  onUpdateCase?: (updatedCase: LegalCase) => void;
  onDeleteCase?: (caseId: string) => void;
  practiceAreas?: string[];
  clientCategories?: string[];
}

export const CasesView: React.FC<CasesViewProps> = ({
  cases,
  clients = [],
  selectedCaseId,
  onSelectCaseId,
  onOpenDocModal,
  onUpdateCase,
  onDeleteCase,
  practiceAreas = ['Contencioso Cível', 'Direito Trabalhista', 'Direito Previdenciário', 'Direito de Família'],
  clientCategories = ['BPC Loas', 'Auxílio Doença', 'Aposentadoria', 'Trabalhista', 'Cível'],
}) => {
  const currentCase = cases.find((c) => c.id === selectedCaseId) || cases[0];

  const [activeTab, setActiveTab] = useState<'workflow' | 'ficha' | 'documentos' | 'prazos' | 'anotacoes' | 'custas'>('workflow');
  const [dragOver, setDragOver] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<CaseDocument[]>(currentCase?.documents || []);
  const [newNoteText, setNewNoteText] = useState('');
  const [notes, setNotes] = useState<string[]>(currentCase?.notes || []);

  // Modal for editing case details
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editBenefitType, setEditBenefitType] = useState('');
  const [editProcessNumber, setEditProcessNumber] = useState('');
  const [editInstance, setEditInstance] = useState('');
  const [editAgencyOrCourt, setEditAgencyOrCourt] = useState('');
  const [editCourt, setEditCourt] = useState('');
  const [editClientId, setEditClientId] = useState('');
  const [editClientName, setEditClientName] = useState('');
  const [editClientCpf, setEditClientCpf] = useState('');

  const [editFilingDate, setEditFilingDate] = useState('');
  const [editLastMovementDate, setEditLastMovementDate] = useState('');
  const [editNextDeadlineDate, setEditNextDeadlineDate] = useState('');
  const [editNextDeadlineType, setEditNextDeadlineType] = useState('');

  const [editStatusLabel, setEditStatusLabel] = useState('');
  const [editFinalResult, setEditFinalResult] = useState('');
  const [editConcededValue, setEditConcededValue] = useState('');

  const [editAgreedFees, setEditAgreedFees] = useState('');
  const [editPaymentStatus, setEditPaymentStatus] = useState('');

  // Parcerias & Captação
  const [editHasLawyerPartnership, setEditHasLawyerPartnership] = useState(false);
  const [editPartnerLawyerName, setEditPartnerLawyerName] = useState('');
  const [editPartnerLawyerOab, setEditPartnerLawyerOab] = useState('');
  const [editPartnerLawyerShare, setEditPartnerLawyerShare] = useState('');

  const [editHasScoutCommission, setEditHasScoutCommission] = useState(false);
  const [editScoutName, setEditScoutName] = useState('');
  const [editScoutFeeOrShare, setEditScoutFeeOrShare] = useState('');
  const [editScoutNotes, setEditScoutNotes] = useState('');

  const [editQuickNotes, setEditQuickNotes] = useState('');

  // Interactive Legal Deadline Calculator State
  const [calcStartDate, setCalcStartDate] = useState(getBrasiliaISO());
  const [calcDays, setCalcDays] = useState(15);
  const [calcType, setCalcType] = useState<DeadlineType>('judicial_cpc');
  const [calcResult, setCalcResult] = useState(() => calculateLegalDeadline(getBrasiliaISO(), 15, 'judicial_cpc'));

  const handleRecalculate = (start: string, days: number, type: DeadlineType) => {
    setCalcStartDate(start);
    setCalcDays(days);
    setCalcType(type);
    setCalcResult(calculateLegalDeadline(start, days, type));
  };

  // Sync when currentCase changes
  useEffect(() => {
    if (currentCase) {
      setUploadedFiles(currentCase.documents || []);
      setNotes(currentCase.notes || []);
      populateEditForm(currentCase);
    }
  }, [currentCase]);

  const populateEditForm = (c: LegalCase) => {
    setEditTitle(c.title || '');
    setEditCategory(c.category || practiceAreas[0] || 'Direito Previdenciário');
    setEditBenefitType(c.benefitType || c.category || 'BPC Loas');
    setEditProcessNumber(c.processNumber || '');
    setEditInstance(c.instance || 'Administrativo INSS');
    setEditAgencyOrCourt(c.agencyOrCourt || c.court || '');
    setEditCourt(c.court || '');
    setEditClientId(c.clientId || '');
    setEditClientName(c.clientName || '');
    setEditClientCpf(c.clientCpf || '');

    setEditFilingDate(c.filingDate || '');
    setEditLastMovementDate(c.lastMovementDate || '');
    setEditNextDeadlineDate(c.nextDeadlineDate || '');
    setEditNextDeadlineType(c.nextDeadlineType || 'Perícia Médica');

    setEditStatusLabel(c.statusLabel || 'Em Andamento');
    setEditFinalResult(c.finalResult || 'Em Andamento');
    setEditConcededValue(c.concededValue || '');

    setEditAgreedFees(c.agreedFees || '');
    setEditPaymentStatus(c.paymentStatus || 'Pendente');

    // Parcerias & Captação
    setEditHasLawyerPartnership(!!c.hasLawyerPartnership);
    setEditPartnerLawyerName(c.partnerLawyerName || '');
    setEditPartnerLawyerOab(c.partnerLawyerOab || '');
    setEditPartnerLawyerShare(c.partnerLawyerShare || '');

    setEditHasScoutCommission(!!c.hasScoutCommission);
    setEditScoutName(c.scoutName || '');
    setEditScoutFeeOrShare(c.scoutFeeOrShare || '');
    setEditScoutNotes(c.scoutNotes || '');

    setEditQuickNotes(c.quickNotes || '');
  };

  const handleOpenEditModal = () => {
    if (currentCase) {
      populateEditForm(currentCase);
      setIsEditModalOpen(true);
    }
  };

  const handleSaveCaseEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCase || !onUpdateCase) return;

    // Resolve client name & cpf if changed
    const matchedClient = clients.find((cl) => cl.id === editClientId);
    const finalName = matchedClient ? matchedClient.name : editClientName || currentCase.clientName;
    const finalCpf = matchedClient ? matchedClient.cpf : editClientCpf || currentCase.clientCpf;

    const updatedCase: LegalCase = {
      ...currentCase,
      title: editTitle.trim(),
      category: editCategory,
      benefitType: editBenefitType.trim(),
      processNumber: editProcessNumber.trim(),
      instance: editInstance,
      agencyOrCourt: editAgencyOrCourt.trim(),
      court: editCourt.trim(),
      clientId: editClientId,
      clientName: finalName,
      clientCpf: finalCpf,
      filingDate: editFilingDate || undefined,
      lastMovementDate: getBrasiliaISO(),
      nextDeadlineDate: editNextDeadlineDate || undefined,
      nextDeadlineType: editNextDeadlineType || undefined,
      statusLabel: editStatusLabel,
      finalResult: editFinalResult,
      concededValue: editConcededValue.trim() || undefined,
      agreedFees: editAgreedFees.trim() || undefined,
      paymentStatus: editPaymentStatus,

      // Parceria & Captação
      hasLawyerPartnership: editHasLawyerPartnership,
      partnerLawyerName: editHasLawyerPartnership ? editPartnerLawyerName.trim() : undefined,
      partnerLawyerOab: editHasLawyerPartnership ? editPartnerLawyerOab.trim() : undefined,
      partnerLawyerShare: editHasLawyerPartnership ? editPartnerLawyerShare.trim() : undefined,

      hasScoutCommission: editHasScoutCommission,
      scoutName: editHasScoutCommission ? editScoutName.trim() : undefined,
      scoutFeeOrShare: editHasScoutCommission ? editScoutFeeOrShare.trim() : undefined,
      scoutNotes: editHasScoutCommission ? editScoutNotes.trim() : undefined,

      quickNotes: editQuickNotes.trim() || undefined,
      notes: editQuickNotes.trim() && editQuickNotes.trim() !== currentCase.quickNotes
        ? [`[Editado] ${editQuickNotes.trim()}`, ...notes]
        : notes,
    };

    onUpdateCase(updatedCase);
    setIsEditModalOpen(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      const newDoc: CaseDocument = {
        id: `doc-${Date.now()}`,
        title: file.name,
        fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
        uploadedAt: `Enviado em ${getBrasiliaFormatted()}`,
        type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'image',
        tags: ['Novo'],
      };
      const newDocsList = [newDoc, ...uploadedFiles];
      setUploadedFiles(newDocsList);
      if (onUpdateCase && currentCase) {
        onUpdateCase({
          ...currentCase,
          documents: newDocsList,
          lastMovementDate: getBrasiliaISO(),
        });
      }
    }
  };

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    const newNoteFormatted = `${newNoteText.trim()} (${getBrasiliaFormatted()})`;
    const updatedNotes = [newNoteFormatted, ...notes];
    setNotes(updatedNotes);
    setNewNoteText('');
    if (onUpdateCase && currentCase) {
      onUpdateCase({
        ...currentCase,
        notes: updatedNotes,
        lastMovementDate: getBrasiliaISO(),
      });
    }
  };

  // Quick handlers for simplified modification of status, step, and result
  const handleQuickUpdateStatus = (newStatus: string) => {
    if (!currentCase || !onUpdateCase) return;
    const today = getBrasiliaFormatted();
    const updated: LegalCase = {
      ...currentCase,
      statusLabel: newStatus,
      lastMovementDate: getBrasiliaISO(),
      notes: [`[Status Atualizado] Situação alterada para "${newStatus}" em ${today}`, ...notes],
    };
    onUpdateCase(updated);
  };

  const handleQuickUpdateResult = (newResult: string) => {
    if (!currentCase || !onUpdateCase) return;
    const today = getBrasiliaFormatted();
    let autoStatus = currentCase.statusLabel;
    if (newResult.includes('Concedido') || newResult.includes('Deferido')) {
      autoStatus = 'Concedido';
    } else if (newResult.includes('Indeferido')) {
      autoStatus = 'Indeferido';
    }
    const updated: LegalCase = {
      ...currentCase,
      finalResult: newResult,
      statusLabel: autoStatus,
      lastMovementDate: getBrasiliaISO(),
      notes: [`[Resultado Atualizado] Resultado final definido como "${newResult}" em ${today}`, ...notes],
    };
    onUpdateCase(updated);
  };

  const handleSelectStepIndex = (targetIdx: number) => {
    if (!currentCase || !onUpdateCase || !currentCase.steps) return;
    const today = getBrasiliaFormatted();
    const updatedSteps = currentCase.steps.map((s, idx) => ({
      ...s,
      completed: idx < targetIdx,
      active: idx === targetIdx,
    }));

    const targetStepLabel = updatedSteps[targetIdx]?.label || `Fase ${targetIdx + 1}`;

    const updated: LegalCase = {
      ...currentCase,
      currentStepIndex: targetIdx,
      steps: updatedSteps,
      lastMovementDate: getBrasiliaISO(),
      notes: [`[Fase Atualizada] Processo alterado para a fase "${targetStepLabel}" em ${today}`, ...notes],
    };
    onUpdateCase(updated);
  };

  const handleAdvanceStep = () => {
    if (!currentCase || !currentCase.steps) return;
    const nextIdx = Math.min(currentCase.steps.length - 1, (currentCase.currentStepIndex ?? 0) + 1);
    handleSelectStepIndex(nextIdx);
  };

  const handleRegressStep = () => {
    if (!currentCase || !currentCase.steps) return;
    const prevIdx = Math.max(0, (currentCase.currentStepIndex ?? 0) - 1);
    handleSelectStepIndex(prevIdx);
  };

  if (!currentCase) {
    return <div className="p-8 text-slate-600">Nenhum processo cadastrado.</div>;
  }

  return (
    <main className="md:ml-64 pt-16 md:pt-8 pb-12 px-4 sm:px-6 md:px-8 min-h-screen relative z-10 max-w-7xl mx-auto space-y-6">
      {/* Case selector dropdown header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-2 border-b border-slate-200/60 gap-3">
        {/* Breadcrumbs */}
        <div className="flex items-center gap-2 text-slate-500 text-xs md:text-sm font-medium">
          <span className="hover:text-blue-900 transition-colors flex items-center cursor-pointer">
            <span className="material-symbols-outlined text-[16px] mr-1">arrow_back</span>
            Acompanhar Processos
          </span>
          <span>/</span>
          <span>{currentCase.category}</span>
          <span>/</span>
          <span className="text-slate-900 font-bold">{currentCase.caseNumber}</span>
        </div>

        {/* Case switcher & Action buttons */}
        <div className="flex items-center space-x-2 shrink-0">
          <span className="text-xs text-slate-500 font-medium hidden sm:inline">Selecionar Processo:</span>
          <select
            value={currentCase.id}
            onChange={(e) => onSelectCaseId(e.target.value)}
            className="bg-white text-slate-900 text-xs rounded-xl px-3 py-1.5 border border-slate-300 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900 shadow-xs"
          >
            {cases.map((c) => (
              <option key={c.id} value={c.id}>
                {c.caseNumber} - {c.title}
              </option>
            ))}
          </select>

          <button
            type="button"
            onClick={handleOpenEditModal}
            className="px-3 py-1.5 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-1 shadow-xs transition-colors"
            title="Editar Ficha do Processo"
          >
            <span className="material-symbols-outlined text-sm">edit</span>
            <span className="hidden sm:inline">Editar Processo</span>
          </button>

          {onDeleteCase && (
            <button
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-2.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl flex items-center gap-1 transition-colors border border-red-200"
              title="Excluir Processo"
            >
              <span className="material-symbols-outlined text-sm">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Header Card: Case Details */}
      <section className="glass-panel rounded-2xl p-6 md:p-8 bg-white border border-slate-200/90 shadow-sm relative overflow-hidden space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span className="px-3 py-1 rounded-full bg-blue-900 text-white font-extrabold text-xs shadow-xs">
                {currentCase.statusLabel}
              </span>
              {currentCase.benefitType && (
                <span className="px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200">
                  {currentCase.benefitType}
                </span>
              )}
              {currentCase.instance && (
                <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold text-xs border border-amber-200">
                  {currentCase.instance}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                {currentCase.agencyOrCourt || currentCase.court}
              </span>
            </div>

            <h2 className="font-display-lg text-2xl md:text-3xl font-extrabold text-slate-900">
              {currentCase.title}
            </h2>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 font-medium pt-1">
              <p>
                Cliente: <strong className="text-slate-900 font-bold">{currentCase.clientName}</strong>
              </p>
              <p className="text-slate-400">CPF: {currentCase.clientCpf}</p>
              {currentCase.processNumber && (
                <p className="text-slate-500 font-mono font-semibold">
                  Proc/Protocolo: <span className="text-slate-900">{currentCase.processNumber}</span>
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2 shrink-0">
            <button 
              onClick={handleOpenEditModal}
              className="px-3.5 py-2.5 rounded-xl bg-blue-50 text-blue-900 font-bold text-xs hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-base">edit</span>
              <span>Editar Ficha</span>
            </button>
            <button 
              onClick={onOpenDocModal}
              className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 font-semibold text-xs hover:bg-slate-50 shadow-xs transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[16px]">edit_note</span>
              <span>Gerar Minuta</span>
            </button>
            <button 
              onClick={() => {
                navigator.clipboard?.writeText(window.location.href);
                alert('Link do processo copiado para a área de transferência!');
              }}
              className="px-3.5 py-2.5 rounded-xl glass-btn-primary text-white font-semibold text-xs shadow-sm transition-colors flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-[18px]">share</span>
              <span className="hidden sm:inline">Compartilhar</span>
            </button>
          </div>
        </div>

        <div className="w-full h-[1px] bg-slate-100"></div>

        {/* Andamento Processual & Modificação Simplificada */}
        <div className="bg-slate-50/90 rounded-2xl p-5 md:p-6 border border-slate-200/90 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-200">
            <div>
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-900 text-xl font-bold">timeline</span>
                <h3 className="text-xs md:text-sm font-extrabold text-slate-900 uppercase tracking-wider">
                  Andamento Processual e Fases do Caso
                </h3>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Clique em qualquer fase para alterar o progresso ou altere a Situação e Resultado abaixo de forma simplificada.
              </p>
            </div>

            {/* Quick Step Navigation */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleRegressStep}
                disabled={(currentCase.currentStepIndex ?? 0) <= 0}
                className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-2xs transition-colors"
                title="Voltar para a fase anterior"
              >
                <span className="material-symbols-outlined text-sm">chevron_left</span>
                <span>Fase Anterior</span>
              </button>

              <span className="text-xs font-extrabold text-blue-900 bg-blue-100/70 px-2.5 py-1 rounded-lg">
                Fase {(currentCase.currentStepIndex ?? 0) + 1} de {currentCase.steps.length}
              </span>

              <button
                type="button"
                onClick={handleAdvanceStep}
                disabled={(currentCase.currentStepIndex ?? 0) >= currentCase.steps.length - 1}
                className="px-3 py-1.5 rounded-xl bg-blue-900 text-white font-bold text-xs hover:bg-blue-950 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 shadow-xs transition-colors"
                title="Avançar para a próxima fase"
              >
                <span>Próxima Fase</span>
                <span className="material-symbols-outlined text-sm">chevron_right</span>
              </button>
            </div>
          </div>

          {/* Quick Modifiers Controls (Simplified Inline Edits) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-2xs">
            {/* 1. Quick Status Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-blue-900 text-xs">published_with_changes</span>
                <span>Situação Atual (Status):</span>
              </label>
              <select
                value={currentCase.statusLabel}
                onChange={(e) => handleQuickUpdateStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 text-slate-900 font-extrabold text-xs rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer"
              >
                <option value="Documentação Pendente">Documentação Pendente</option>
                <option value="Protocolado">Protocolado</option>
                <option value="Em Análise">Em Análise</option>
                <option value="Exigência">Exigência</option>
                <option value="Em Recurso">Em Recurso</option>
                <option value="Indeferido">Indeferido</option>
                <option value="Concedido">Concedido</option>
                <option value="Em Andamento">Em Andamento</option>
              </select>
            </div>

            {/* 2. Quick Final Result Selector */}
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                <span className="material-symbols-outlined text-emerald-700 text-xs">task_alt</span>
                <span>Resultado Final:</span>
              </label>
              <select
                value={currentCase.finalResult || 'Em Andamento'}
                onChange={(e) => handleQuickUpdateResult(e.target.value)}
                className={`w-full bg-slate-50 border text-xs font-extrabold rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-900 cursor-pointer ${
                  currentCase.finalResult?.includes('Concedido') || currentCase.finalResult?.includes('Deferido')
                    ? 'border-emerald-300 text-emerald-900 bg-emerald-50/50'
                    : currentCase.finalResult?.includes('Indeferido')
                    ? 'border-red-300 text-red-900 bg-red-50/50'
                    : 'border-slate-300 text-slate-900'
                }`}
              >
                <option value="Em Andamento">Em Andamento (Não Encerrado)</option>
                <option value="Deferido / Concedido">Deferido / Concedido</option>
                <option value="Indeferido / Improcedente">Indeferido / Improcedente</option>
                <option value="Acordo Extrajudicial">Acordo Extrajudicial / Judicial</option>
                <option value="Arquivado">Arquivado</option>
              </select>
            </div>

            {/* 3. Quick Movement / Action Badge */}
            <div className="sm:col-span-2 lg:col-span-1 flex items-end">
              <div className="w-full flex items-center justify-between p-2 rounded-xl bg-blue-50/70 border border-blue-200/80 text-xs text-blue-950 font-bold">
                <div className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-blue-900 text-base">info</span>
                  <span>Última movimentação:</span>
                </div>
                <span className="font-mono text-blue-900 bg-white px-2 py-0.5 rounded-md border border-blue-200">
                  {currentCase.lastMovementDate
                    ? formatToPtBR(currentCase.lastMovementDate)
                    : getBrasiliaFormatted()}
                </span>
              </div>
            </div>
          </div>

          {/* Stepper Timeline Graphics */}
          <div className="relative overflow-x-auto pt-3 pb-2">
            <div className="relative flex justify-between items-center px-6 min-w-[550px] my-2">
              {/* Line background */}
              <div className="absolute left-10 right-10 top-5 h-1 bg-slate-200 z-0 rounded-full"></div>

              {/* Progress colored line */}
              <div
                className="absolute left-10 top-5 h-1 bg-gradient-to-r from-blue-900 to-blue-600 z-0 rounded-full transition-all duration-300"
                style={{
                  width: `${
                    currentCase.steps.length > 1
                      ? ((currentCase.currentStepIndex ?? 0) / (currentCase.steps.length - 1)) * 88
                      : 0
                  }%`,
                }}
              ></div>

              {currentCase.steps.map((step, idx) => {
                const isCurrent = idx === (currentCase.currentStepIndex ?? 0);
                const isDone = idx < (currentCase.currentStepIndex ?? 0) || step.completed;

                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectStepIndex(idx)}
                    className="relative z-10 flex flex-col items-center gap-2 group cursor-pointer focus:outline-none"
                    title={`Clique para definir a fase "${step.label}" como ativa`}
                  >
                    {isDone ? (
                      <div className="w-10 h-10 rounded-full bg-emerald-500 border-2 border-emerald-600 text-white flex items-center justify-center shadow-md group-hover:scale-110 transition-transform">
                        <span className="material-symbols-outlined text-lg font-extrabold">check</span>
                      </div>
                    ) : isCurrent ? (
                      <div className="w-12 h-12 rounded-full bg-blue-900 border-4 border-blue-200 text-white flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform animate-pulse">
                        <span className="text-xs font-black">{idx + 1}</span>
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-white border-2 border-slate-300 text-slate-400 font-bold text-xs flex items-center justify-center group-hover:border-blue-900 group-hover:text-blue-900 group-hover:scale-105 transition-all shadow-2xs">
                        {idx + 1}
                      </div>
                    )}

                    <div className="text-center">
                      <p
                        className={`text-xs ${
                          isCurrent
                            ? 'text-blue-900 font-black scale-105'
                            : isDone
                            ? 'text-emerald-800 font-bold'
                            : 'text-slate-500 font-medium group-hover:text-slate-900'
                        } transition-colors whitespace-nowrap`}
                      >
                        {step.label}
                      </p>
                      {isCurrent && (
                        <span className="inline-block px-2 py-0.2 mt-0.5 rounded-full bg-blue-900 text-[10px] text-white font-extrabold">
                          Fase Atual
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Tabbed Content Area */}
      <section className="space-y-4">
        {/* Tabs */}
        <div className="flex gap-2 border-b border-slate-200 pb-[1px] overflow-x-auto">
          <button
            onClick={() => setActiveTab('workflow')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'workflow'
                ? 'border-[#C9A227] text-slate-950 bg-white font-black shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base text-[#C9A227]">schema</span>
            <span>Workflow Executável</span>
          </button>
          <button
            onClick={() => setActiveTab('ficha')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all flex items-center gap-1.5 ${
              activeTab === 'ficha'
                ? 'border-blue-900 text-blue-900 bg-white shadow-xs'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <span className="material-symbols-outlined text-base">folder_open</span>
            <span>Ficha Completa</span>
          </button>
          <button
            onClick={() => setActiveTab('documentos')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all ${
              activeTab === 'documentos'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Documentos ({uploadedFiles.length})
          </button>
          <button
            onClick={() => setActiveTab('prazos')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all ${
              activeTab === 'prazos'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Prazos ({currentCase.deadlinesCount})
          </button>
          <button
            onClick={() => setActiveTab('anotacoes')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all ${
              activeTab === 'anotacoes'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Anotações ({notes.length})
          </button>
          <button
            onClick={() => setActiveTab('custas')}
            className={`px-5 py-2.5 border-b-2 text-xs md:text-sm font-bold rounded-t-xl transition-all ${
              activeTab === 'custas'
                ? 'border-blue-900 text-blue-900 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            Custas ({currentCase.costs?.length || 0})
          </button>
        </div>

        {/* Tab 0: Workflow Engine Executável */}
        {activeTab === 'workflow' && (
          <div>
            {(() => {
              const clientObj = clients.find((c) => c.id === currentCase.clientId);
              let activeInstance = currentCase.workflowInstance;

              if (!activeInstance) {
                const defaultTpl = INITIAL_WORKFLOWS[0];
                activeInstance = instantiateWorkflow(defaultTpl, currentCase, clientObj);
              }

              return (
                <WorkflowExecutionPanel
                  instance={activeInstance}
                  legalCase={currentCase}
                  client={clientObj}
                  workflowTemplate={INITIAL_WORKFLOWS.find((w) => w.id === activeInstance?.templateId) || INITIAL_WORKFLOWS[0]}
                  onUpdateInstance={(updatedInst) => {
                    if (onUpdateCase) {
                      onUpdateCase({
                        ...currentCase,
                        workflowInstance: updatedInst,
                        workflowInstanceId: updatedInst.id,
                      });
                    }
                  }}
                />
              );
            })()}
          </div>
        )}

        {/* Tab 0: Ficha Completa do Processo (5 Sections View) */}
        {activeTab === 'ficha' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-xs">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-900 text-xl">assignment</span>
                <h3 className="font-extrabold text-sm text-slate-900">Campos do Processo Cadastrado</h3>
              </div>
              <button
                type="button"
                onClick={handleOpenEditModal}
                className="px-4 py-2 bg-blue-900 hover:bg-blue-950 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-base">edit</span>
                <span>Editar Dados do Processo</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* 1. Identificação do processo */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base">folder_open</span>
                  <span>1. Identificação do Processo</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Cliente Vinculado:</span>
                    <span className="font-bold text-slate-900">{currentCase.clientName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">CPF do Cliente:</span>
                    <span className="font-mono font-bold text-slate-800">{currentCase.clientCpf}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Tipo de Benefício / Ação:</span>
                    <span className="font-bold text-blue-900 bg-blue-50 px-2 py-0.5 rounded-md">
                      {currentCase.benefitType || currentCase.category || 'Não informado'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Número do Processo / Protocolo:</span>
                    <span className="font-mono font-bold text-slate-900">{currentCase.processNumber || 'Pendente'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Instância:</span>
                    <span className="font-bold text-slate-800">{currentCase.instance || 'Administrativo INSS'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Vara / Agência Responsável:</span>
                    <span className="font-semibold text-slate-800">{currentCase.agencyOrCourt || currentCase.court || 'Não informada'}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Órgão / Tribunal:</span>
                    <span className="font-semibold text-slate-800">{currentCase.court}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Ramo / Categoria:</span>
                    <span className="font-bold text-slate-700">{currentCase.category}</span>
                  </div>
                </div>
              </div>

              {/* 2. Datas-chave */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base">calendar_month</span>
                  <span>2. Datas-Chave</span>
                </h4>

                <div className="space-y-3 text-xs">
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-slate-500 font-medium text-[11px]">Data de Entrada (DER) / Distribuição:</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {currentCase.filingDate ? formatToPtBR(currentCase.filingDate) : 'Não registrada'}
                    </p>
                  </div>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80">
                    <p className="text-slate-500 font-medium text-[11px]">Data da Última Movimentação:</p>
                    <p className="font-bold text-slate-900 text-sm mt-0.5">
                      {currentCase.lastMovementDate ? formatToPtBR(currentCase.lastMovementDate) : 'Não registrada'}
                    </p>
                  </div>

                  <div className="p-3 bg-blue-50/70 rounded-xl border border-blue-200">
                    <p className="text-blue-900 font-bold text-[11px] flex items-center gap-1">
                      <span className="material-symbols-outlined text-sm">alarm</span>
                      <span>Próximo Prazo / Compromisso:</span>
                    </p>
                    <p className="font-extrabold text-slate-900 text-sm mt-0.5">
                      {currentCase.nextDeadlineDate ? formatToPtBR(currentCase.nextDeadlineDate) : 'Nenhum prazo cadastrado'}
                    </p>
                    {currentCase.nextDeadlineType && (
                      <p className="text-xs text-blue-900 font-semibold mt-1">
                        Tipo: {currentCase.nextDeadlineType}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Status e Resultado */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base">published_with_changes</span>
                  <span>3. Status e Resultado</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Situação Atual:</span>
                    <span className="font-extrabold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
                      {currentCase.statusLabel}
                    </span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Resultado Final:</span>
                    <span className={`font-bold px-2 py-0.5 rounded-md ${
                      currentCase.finalResult?.includes('Concedido') || currentCase.finalResult?.includes('Deferido')
                        ? 'bg-emerald-50 text-emerald-800'
                        : currentCase.finalResult?.includes('Indeferido')
                        ? 'bg-red-50 text-red-800'
                        : 'bg-slate-100 text-slate-800'
                    }`}>
                      {currentCase.finalResult || 'Em Andamento'}
                    </span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Valor Concedido / Renda:</span>
                    <span className="font-extrabold text-emerald-700 font-mono">
                      {currentCase.concededValue || 'Pendente de apuração'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Controle financeiro do caso */}
              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base">payments</span>
                  <span>4. Controle Financeiro do Caso</span>
                </h4>

                <div className="space-y-2.5 text-xs">
                  <div className="flex justify-between py-1 border-b border-slate-50">
                    <span className="text-slate-500 font-medium">Honorários Combinados:</span>
                    <span className="font-bold text-slate-900">{currentCase.agreedFees || 'Não especificado'}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-500 font-medium">Status de Pagamento:</span>
                    <span className={`font-extrabold px-2.5 py-0.5 rounded-full text-xs ${
                      currentCase.paymentStatus === 'Pago'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : currentCase.paymentStatus === 'Parcelado' || currentCase.paymentStatus === 'Em Andamento'
                        ? 'bg-amber-50 text-amber-800 border border-amber-200'
                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                    }`}>
                      {currentCase.paymentStatus || 'Pendente'}
                    </span>
                  </div>
                </div>
              </div>

              {/* 5. Anotações rápidas */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-extrabold text-xs text-blue-900 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base">notes</span>
                  <span>5. Anotações e Observações Rápidas</span>
                </h4>

                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 font-medium leading-relaxed">
                  {currentCase.quickNotes ? (
                    <p className="whitespace-pre-wrap">{currentCase.quickNotes}</p>
                  ) : (
                    <p className="text-slate-400 italic">Nenhuma observação rápida registrada para este caso. Clique em "Editar Processo" para adicionar nota rápida.</p>
                  )}
                </div>
              </div>

              {/* 6. Parcerias & Captação */}
              <div className="md:col-span-2 bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h4 className="font-extrabold text-xs text-[#8c6e14] uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                  <span className="material-symbols-outlined text-base text-[#C9A227]">handshake</span>
                  <span>6. Parcerias com Advogados & Repasse para Captadores</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  {/* Advogado Parceiro */}
                  <div className={`p-4 rounded-xl border ${
                    currentCase.hasLawyerPartnership
                      ? 'bg-amber-50/40 border-[#C9A227]/40'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-base text-[#C9A227]">gavel</span>
                      <strong className="font-bold text-slate-900">Parceria com Advogado:</strong>
                    </div>
                    {currentCase.hasLawyerPartnership ? (
                      <div className="space-y-1 pl-6">
                        <p className="text-slate-900 font-bold text-sm">{currentCase.partnerLawyerName || 'Nome não especificado'}</p>
                        {currentCase.partnerLawyerOab && (
                          <p className="text-slate-600 font-mono text-xs">{currentCase.partnerLawyerOab}</p>
                        )}
                        {currentCase.partnerLawyerShare && (
                          <p className="text-[#8c6e14] font-semibold text-xs mt-1">
                            Divisão de Honorários: {currentCase.partnerLawyerShare}
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic pl-6">Nenhuma parceria com advogado externo cadastrada.</p>
                    )}
                  </div>

                  {/* Repasse para Captador */}
                  <div className={`p-4 rounded-xl border ${
                    currentCase.hasScoutCommission
                      ? 'bg-emerald-50/40 border-emerald-300'
                      : 'bg-slate-50 border-slate-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="material-symbols-outlined text-base text-emerald-600">person_pin</span>
                      <strong className="font-bold text-slate-900">Repasse para Captador / Indicação:</strong>
                    </div>
                    {currentCase.hasScoutCommission ? (
                      <div className="space-y-1 pl-6">
                        <p className="text-slate-900 font-bold text-sm">{currentCase.scoutName || 'Nome não especificado'}</p>
                        {currentCase.scoutFeeOrShare && (
                          <p className="text-emerald-700 font-semibold text-xs mt-1">
                            Valor / Comissão: {currentCase.scoutFeeOrShare}
                          </p>
                        )}
                        {currentCase.scoutNotes && (
                          <p className="text-slate-500 text-xs italic">{currentCase.scoutNotes}</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-slate-400 italic pl-6">Nenhum repasse de comissão/captação cadastrado.</p>
                    )}
                  </div>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* Tab 1: Documentos */}
        {activeTab === 'documentos' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main Drag & Drop Upload Area */}
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                  const file = e.dataTransfer.files[0];
                  const newDoc: CaseDocument = {
                    id: `doc-${Date.now()}`,
                    title: file.name,
                    fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
                    uploadedAt: `Enviado em ${new Date().toLocaleDateString('pt-BR')}`,
                    type: file.name.endsWith('.pdf') ? 'pdf' : file.name.endsWith('.docx') ? 'docx' : 'image',
                    tags: ['Novo'],
                  };
                  const updatedDocsList = [newDoc, ...uploadedFiles];
                  setUploadedFiles(updatedDocsList);
                  if (onUpdateCase && currentCase) {
                    onUpdateCase({
                      ...currentCase,
                      documents: updatedDocsList,
                      lastMovementDate: new Date().toISOString().split('T')[0],
                    });
                  }
                }
              }}
              className={`col-span-1 md:col-span-2 bg-white rounded-2xl p-8 flex flex-col items-center justify-center border-dashed border-2 transition-all cursor-pointer group ${
                dragOver ? 'border-blue-900 bg-blue-50/50' : 'border-slate-300 hover:border-blue-900'
              }`}
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 border border-blue-100 mb-4 flex items-center justify-center group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-[32px] text-blue-900">
                  cloud_upload
                </span>
              </div>
              <h4 className="font-title-md text-base font-bold text-slate-900 mb-1">
                Arraste arquivos e anexos aqui
              </h4>
              <p className="text-xs text-slate-500 text-center max-w-sm mb-6">
                Suporta PDF, DOCX, JPG até 50MB. Os documentos serão indexados automaticamente ao processo.
              </p>

              <label className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 transition-colors cursor-pointer shadow-xs">
                <span>Procurar Arquivos no Computador</span>
                <input
                  type="file"
                  onChange={handleFileUpload}
                  className="hidden"
                  accept=".pdf,.docx,.doc,.jpg,.png"
                />
              </label>
            </div>

            {/* Uploaded Documents */}
            {uploadedFiles.map((doc) => (
              <div
                key={doc.id}
                className="col-span-1 bg-white rounded-2xl p-6 relative border border-slate-200 shadow-xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="p-3 rounded-xl bg-blue-50 border border-blue-100 text-blue-900">
                      <span className="material-symbols-outlined text-2xl">
                        {doc.type === 'pdf' ? 'picture_as_pdf' : doc.type === 'docx' ? 'description' : 'image'}
                      </span>
                    </div>
                    <button 
                      onClick={() => {
                        alert(`Baixando ${doc.title}...`);
                      }}
                      className="text-slate-400 hover:text-slate-800 p-1 rounded-lg hover:bg-slate-100"
                    >
                      <span className="material-symbols-outlined text-xl">download</span>
                    </button>
                  </div>
                  <h5 className="font-title-md text-sm text-slate-900 mb-1 truncate font-bold" title={doc.title}>
                    {doc.title}
                  </h5>
                  <p className="text-xs text-slate-500 mb-4 font-medium">
                    {doc.uploadedAt} • {doc.fileSize}
                  </p>
                </div>

                <div className="flex gap-2">
                  {doc.tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-700 font-bold text-[11px] border border-slate-200"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Prazos */}
        {activeTab === 'prazos' && (
          <div className="space-y-6">
            {/* Calculadora Jurídica de Prazos (CPC Art. 219 vs INSS) */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-blue-900 text-base">calculate</span>
                    <span>Calculadora Oficial de Prazos Processuais & Administrativos</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Contagem automática com exclusão do dia de início, cômputo de feriados nacionais e recesso forense (Art. 220 CPC).
                  </p>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-900 text-[11px] font-bold border border-blue-200">
                  Horário de Brasília (Oficial)
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Data da Intimação / Início</label>
                  <input
                    type="date"
                    value={calcStartDate}
                    onChange={(e) => handleRecalculate(e.target.value, calcDays, calcType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Quantidade de Dias</label>
                  <input
                    type="number"
                    min={1}
                    max={365}
                    value={calcDays}
                    onChange={(e) => handleRecalculate(calcStartDate, parseInt(e.target.value) || 1, calcType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipo de Regra Aplicável</label>
                  <select
                    value={calcType}
                    onChange={(e) => handleRecalculate(calcStartDate, calcDays, e.target.value as DeadlineType)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-blue-900"
                  >
                    <option value="judicial_cpc">Judicial CPC (Dias Úteis - Art. 219)</option>
                    <option value="administrative_inss">Administrativo INSS (Dias Corridos c/ Prorrogação)</option>
                    <option value="corridos">Contagem Simples (Dias Corridos)</option>
                  </select>
                </div>
              </div>

              {/* Resultado do Cálculo */}
              <div className="p-4 rounded-xl bg-gradient-to-r from-blue-950 to-slate-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
                <div>
                  <p className="text-[11px] text-blue-200 uppercase font-bold tracking-wider">
                    Data Fatal do Vencimento:
                  </p>
                  <p className="text-xl font-black text-white mt-0.5">
                    {calcResult.finalDateFormatted}
                  </p>
                  <p className="text-xs text-blue-200/80 mt-0.5">
                    {calcType === 'judicial_cpc'
                      ? `Contados ${calcResult.businessDaysCounted} dias úteis (exclui finais de semana, feriados e recesso)`
                      : `Contados ${calcResult.businessDaysCounted} dias ${calcResult.isProrogated ? '(prorrogado para o 1º dia útil seguinte)' : ''}`}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    if (currentCase && onUpdateCase) {
                      const updated: LegalCase = {
                        ...currentCase,
                        nextDeadlineDate: calcResult.finalDateIso,
                        nextDeadlineType: calcType === 'judicial_cpc' ? 'Prazo Judicial (CPC)' : 'Prazo Administrativo INSS',
                        lastMovementDate: getBrasiliaISO(),
                      };
                      onUpdateCase(updated);
                      alert(`Prazo fatal ${calcResult.finalDateFormatted} vinculado com sucesso à ficha do processo!`);
                    }
                  }}
                  className="px-4 py-2 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1 shrink-0"
                >
                  <span className="material-symbols-outlined text-sm">event_available</span>
                  <span>Vincular Prazo a Este Caso</span>
                </button>
              </div>
            </div>

            {/* Prazos e Audiências Vinculadas */}
            <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
              <h3 className="text-base font-bold text-slate-900 mb-2">Prazos e Audiências Vinculadas</h3>
              
              {currentCase.nextDeadlineDate && (
                <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200 flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{currentCase.nextDeadlineType || 'Compromisso Agendado'}</p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      Data Fatal: {formatToPtBR(currentCase.nextDeadlineDate)} • {currentCase.agencyOrCourt || currentCase.court || 'Justiça Federal / INSS'}
                    </p>
                  </div>
                  <span className="px-3 py-1 rounded-full bg-blue-900 text-white text-xs font-bold shadow-xs">
                    Agendado
                  </span>
                </div>
              )}

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Réplica / Cumprimento de Exigência</p>
                  <p className="text-xs text-slate-500 mt-0.5">Vencimento em 15 dias úteis (CPC Art. 219)</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-red-50 text-red-700 text-xs font-bold border border-red-200">
                  Pendente
                </span>
              </div>
              
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900 text-sm">Apresentação de Procuração e Quesitos</p>
                  <p className="text-xs text-slate-500 mt-0.5">Concluído e protocolo confirmado</p>
                </div>
                <span className="px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-200">
                  Cumprido
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Anotações */}
        {activeTab === 'anotacoes' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="text-base font-bold text-slate-900 mb-2">Anotações Internas do Processo</h3>
            <form onSubmit={handleAddNote} className="flex gap-3 mb-4">
              <input
                type="text"
                value={newNoteText}
                onChange={(e) => setNewNoteText(e.target.value)}
                placeholder="Adicionar nota jurídica interna ao caso..."
                className="flex-1 bg-slate-50 border border-slate-300 rounded-xl px-4 py-2 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-900"
              />
              <button
                type="submit"
                className="glass-btn-primary px-4 py-2 rounded-xl text-white text-xs font-semibold"
              >
                Adicionar
              </button>
            </form>

            <div className="space-y-3">
              {notes.map((note, idx) => (
                <div key={idx} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-800 font-medium">
                  {note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Tab 4: Custas */}
        {activeTab === 'custas' && (
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
            <h3 className="text-base font-bold text-slate-900 mb-4">Tabela de Custas e Despesas Processuais</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-500">
                    <th className="pb-3 font-bold">Descrição</th>
                    <th className="pb-3 font-bold">Data</th>
                    <th className="pb-3 font-bold">Valor</th>
                    <th className="pb-3 font-bold">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {currentCase.costs?.map((cost, idx) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-3 text-slate-900 font-bold">{cost.description}</td>
                      <td className="py-3 text-slate-500 font-medium">{cost.date}</td>
                      <td className="py-3 text-blue-900 font-bold">{cost.value}</td>
                      <td className="py-3">
                        {cost.paid ? (
                          <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                            Pago
                          </span>
                        ) : (
                          <span className="px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 font-bold border border-amber-200">
                            Aguardando
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {(!currentCase.costs || currentCase.costs.length === 0) && (
                    <tr>
                      <td colSpan={4} className="py-4 text-center text-slate-400">
                        Nenhuma custa registrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>

      {/* EDIT PROCESS MODAL (5 SECTIONS INDIVIDUAL EDIT) */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 md:p-8 max-w-3xl w-full border border-slate-200 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto relative animate-in fade-in zoom-in-95">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-700 p-2 rounded-full hover:bg-slate-100"
            >
              <span className="material-symbols-outlined">close</span>
            </button>

            <div className="border-b border-slate-200 pb-3">
              <h3 className="font-extrabold text-base md:text-lg text-slate-900 flex items-center gap-2">
                <span className="material-symbols-outlined text-blue-900">edit_square</span>
                <span>Editar Ficha do Processo ({currentCase.caseNumber})</span>
              </h3>
              <p className="text-xs text-slate-500">Atualização individual dos campos cadastrais do processo</p>
            </div>

            <form onSubmit={handleSaveCaseEdit} className="space-y-4 text-xs max-h-[70vh] overflow-y-auto pr-1">
              {/* 1. Identificação do processo */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-blue-900 text-base">folder_open</span>
                  <span>1. Identificação do Processo</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Cliente Vinculado</label>
                    {clients.length > 0 ? (
                      <select
                        value={editClientId}
                        onChange={(e) => {
                          setEditClientId(e.target.value);
                          const found = clients.find((c) => c.id === e.target.value);
                          if (found) {
                            setEditClientName(found.name);
                            setEditClientCpf(found.cpf);
                          }
                        }}
                        className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.cpf})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={editClientName}
                          onChange={(e) => setEditClientName(e.target.value)}
                          placeholder="Nome do Cliente"
                          className="bg-white border border-slate-300 rounded-xl px-3 py-2"
                        />
                        <input
                          type="text"
                          value={editClientCpf}
                          onChange={(e) => setEditClientCpf(e.target.value)}
                          placeholder="CPF"
                          className="bg-white border border-slate-300 rounded-xl px-3 py-2"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Benefício / Ação</label>
                    <select
                      value={editBenefitType}
                      onChange={(e) => setEditBenefitType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    >
                      <option value="BPC Loas">BPC Loas (Deficiente / Idoso)</option>
                      <option value="Auxílio Doença">Auxílio Doença / Incapacidade Temporária</option>
                      <option value="Aposentadoria por Invalidez">Aposentadoria por Invalidez / Permanente</option>
                      <option value="Aposentadoria Rural">Aposentadoria Rural / Segurado Especial</option>
                      <option value="Aposentadoria por Idade">Aposentadoria por Idade Urbana</option>
                      <option value="Aposentadoria por Tempo">Aposentadoria por Tempo de Contribuição</option>
                      <option value="Pensão por Morte">Pensão por Morte</option>
                      <option value="Auxílio Acidente">Auxílio Acidente</option>
                      <option value="Ação Trabalhista">Ação Trabalhista</option>
                      <option value="Ação Cível / Indenizatória">Ação Cível / Indenizatória</option>
                      <option value="Outros">Outros Benefícios / Ações</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Número do Processo / Protocolo</label>
                    <input
                      type="text"
                      value={editProcessNumber}
                      onChange={(e) => setEditProcessNumber(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Instância</label>
                    <select
                      value={editInstance}
                      onChange={(e) => setEditInstance(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    >
                      <option value="Administrativo INSS">Administrativo INSS</option>
                      <option value="Judicial 1ª Instância">Judicial 1ª Instância (Vara Federal/Juizado)</option>
                      <option value="Recurso / 2ª Instância">Recurso / 2ª Instância (CRPS / TRF / TJ)</option>
                      <option value="Superior (STJ / STF)">Superior (STJ / STF / TNU)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Vara / Agência Responsável</label>
                    <input
                      type="text"
                      value={editAgencyOrCourt}
                      onChange={(e) => setEditAgencyOrCourt(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Órgão / Tribunal</label>
                    <input
                      type="text"
                      value={editCourt}
                      onChange={(e) => setEditCourt(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Ramo / Categoria</label>
                    <select
                      value={editCategory}
                      onChange={(e) => setEditCategory(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    >
                      {practiceAreas.map((area) => (
                        <option key={area} value={area}>
                          {area}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Título da Ação / Objeto</label>
                    <input
                      type="text"
                      required
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Datas-chave */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-blue-900 text-base">calendar_month</span>
                  <span>2. Datas-Chave</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data de Entrada (DER) / Distribuição</label>
                    <input
                      type="date"
                      value={editFilingDate}
                      onChange={(e) => setEditFilingDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Data da Última Movimentação</label>
                    <input
                      type="date"
                      value={editLastMovementDate}
                      onChange={(e) => setEditLastMovementDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Próximo Prazo / Compromisso (Data)</label>
                    <input
                      type="date"
                      value={editNextDeadlineDate}
                      onChange={(e) => setEditNextDeadlineDate(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold text-blue-900"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Tipo de Compromisso / Prazo</label>
                    <select
                      value={editNextDeadlineType}
                      onChange={(e) => setEditNextDeadlineType(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    >
                      <option value="Perícia Médica">Perícia Médica Judicial / INSS</option>
                      <option value="Recurso">Recurso / Apelação</option>
                      <option value="Retorno de Exigência">Retorno de Exigência Cadastral</option>
                      <option value="Audiência">Audiência de Conciliação / Instrução</option>
                      <option value="Réplica / Contestação">Réplica à Contestação</option>
                      <option value="Impugnação de Laudo">Impugnação de Laudo Pericial</option>
                      <option value="Outro">Outro Compromisso</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 3. Status */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-blue-900 text-base">published_with_changes</span>
                  <span>3. Status e Resultado</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Situação Atual</label>
                    <select
                      value={editStatusLabel}
                      onChange={(e) => setEditStatusLabel(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    >
                      <option value="Documentação Pendente">Documentação Pendente</option>
                      <option value="Protocolado">Protocolado</option>
                      <option value="Em Análise">Em Análise</option>
                      <option value="Exigência">Exigência</option>
                      <option value="Em Recurso">Em Recurso</option>
                      <option value="Indeferido">Indeferido</option>
                      <option value="Concedido">Concedido</option>
                      <option value="Em Andamento">Em Andamento</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Resultado Final</label>
                    <select
                      value={editFinalResult}
                      onChange={(e) => setEditFinalResult(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    >
                      <option value="Em Andamento">Em Andamento (Não Encerrado)</option>
                      <option value="Deferido / Concedido">Deferido / Concedido</option>
                      <option value="Indeferido / Improcedente">Indeferido / Improcedente</option>
                      <option value="Acordo Extrajudicial">Acordo Extrajudicial / Judicial</option>
                      <option value="Arquivado">Arquivado</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Valor Concedido / Renda</label>
                    <input
                      type="text"
                      value={editConcededValue}
                      onChange={(e) => setEditConcededValue(e.target.value)}
                      placeholder="Ex: R$ 1.412,00/mês"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-semibold"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Controle financeiro do caso */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-blue-900 text-base">payments</span>
                  <span>4. Controle Financeiro do Caso</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Honorários Combinados</label>
                    <input
                      type="text"
                      value={editAgreedFees}
                      onChange={(e) => setEditAgreedFees(e.target.value)}
                      placeholder="Ex: 30% do retroativo"
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Status de Pagamento</label>
                    <select
                      value={editPaymentStatus}
                      onChange={(e) => setEditPaymentStatus(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                    >
                      <option value="Pendente">Pendente</option>
                      <option value="Pago">Pago</option>
                      <option value="Parcelado">Parcelado</option>
                      <option value="Em Andamento">Em Andamento</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* 5. Anotações */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-blue-900 text-base">notes</span>
                  <span>5. Anotações e Observações Rápidas</span>
                </h4>

                <div>
                  <textarea
                    rows={3}
                    value={editQuickNotes}
                    onChange={(e) => setEditQuickNotes(e.target.value)}
                    placeholder="Observações rápidas sobre o caso..."
                    className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-900 resize-none"
                  />
                </div>
              </div>

              {/* 6. Parcerias & Captação */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-extrabold text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-200 pb-2">
                  <span className="material-symbols-outlined text-[#C9A227] text-base">handshake</span>
                  <span>6. Parcerias & Repasse de Captação</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Parceria com Advogado */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        checked={editHasLawyerPartnership}
                        onChange={(e) => setEditHasLawyerPartnership(e.target.checked)}
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                      />
                      <span>Parceria com outro advogado</span>
                    </label>

                    {editHasLawyerPartnership && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nome do Advogado Parceiro *</label>
                          <input
                            type="text"
                            value={editPartnerLawyerName}
                            onChange={(e) => setEditPartnerLawyerName(e.target.value)}
                            placeholder="Ex: Dr. Roberto Guimarães"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">OAB</label>
                            <input
                              type="text"
                              value={editPartnerLawyerOab}
                              onChange={(e) => setEditPartnerLawyerOab(e.target.value)}
                              placeholder="OAB/PI 12.345"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Honorários</label>
                            <input
                              type="text"
                              value={editPartnerLawyerShare}
                              onChange={(e) => setEditPartnerLawyerShare(e.target.value)}
                              placeholder="50% do êxito"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Repasse para Captador */}
                  <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-slate-800 text-xs">
                      <input
                        type="checkbox"
                        checked={editHasScoutCommission}
                        onChange={(e) => setEditHasScoutCommission(e.target.checked)}
                        className="rounded border-slate-300 text-blue-900 focus:ring-blue-900"
                      />
                      <span>Repasse para captador / indicação</span>
                    </label>

                    {editHasScoutCommission && (
                      <div className="space-y-2 pt-2 border-t border-slate-100">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-0.5">Nome do Captador *</label>
                          <input
                            type="text"
                            value={editScoutName}
                            onChange={(e) => setEditScoutName(e.target.value)}
                            placeholder="Ex: Carlos Eduardo"
                            className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 font-semibold"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Valor / %</label>
                            <input
                              type="text"
                              value={editScoutFeeOrShare}
                              onChange={(e) => setEditScoutFeeOrShare(e.target.value)}
                              placeholder="R$ 500,00 ou 10%"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">Condição</label>
                            <input
                              type="text"
                              value={editScoutNotes}
                              onChange={(e) => setEditScoutNotes(e.target.value)}
                              placeholder="No 1º RPV"
                              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-xs text-slate-900"
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl glass-btn-primary text-white font-bold text-xs flex items-center gap-1.5 shadow-md transition-all"
                >
                  <span className="material-symbols-outlined text-base">save</span>
                  <span>Salvar Alterações</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete confirmation modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full border border-slate-200 shadow-2xl space-y-4">
            <div className="flex items-center space-x-3 text-red-600">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-xl">warning</span>
              </div>
              <div>
                <h3 className="font-extrabold text-base text-slate-900">Excluir Processo</h3>
                <p className="text-xs text-slate-500">Ação irreversível</p>
              </div>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Tem certeza de que deseja excluir o processo <strong className="text-slate-900">{currentCase.title}</strong> ({currentCase.caseNumber}) do cliente <strong className="text-slate-900">{currentCase.clientName}</strong>?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  if (onDeleteCase && currentCase) {
                    onDeleteCase(currentCase.id);
                  }
                  setIsDeleteModalOpen(false);
                }}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-colors"
              >
                <span className="material-symbols-outlined text-sm">delete</span>
                <span>Confirmar Exclusão</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};
