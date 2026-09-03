import React, { useState, useEffect } from 'react';
import {
  WorkflowInstance,
  WorkflowStepInstance,
  Client,
  LegalCase,
  WorkflowTemplate,
  WorkflowField,
  WorkflowAuditLog,
} from '../types';
import {
  getWorkflowVariablesMap,
  determineNextStep,
  evaluateCalculatedFormula,
  evaluateRuleConditionGroup,
} from '../services/workflowEngine';
import { subscribeToWorkflowAuditLogs } from '../services/firestoreService';

interface WorkflowExecutionPanelProps {
  instance: WorkflowInstance;
  legalCase: LegalCase;
  client?: Client | null;
  workflowTemplate?: WorkflowTemplate | null;
  onUpdateInstance: (updatedInstance: WorkflowInstance) => void;
  currentUser?: { id: string; name: string; role: string };
}

export const WorkflowExecutionPanel: React.FC<WorkflowExecutionPanelProps> = ({
  instance,
  legalCase,
  client,
  workflowTemplate,
  onUpdateInstance,
  currentUser = { id: legalCase?.responsibleUserId || 'usr-resp', name: legalCase?.responsibleUserName || 'Advogado Responsável', role: 'Advogado Titular' },
}) => {
  const [selectedStepId, setSelectedStepId] = useState<string>(
    instance.currentStepId || instance.steps[0]?.id || ''
  );
  const [activeTab, setActiveTab] = useState<'execution' | 'variables' | 'history'>('execution');

  // Real-time Paginated Audit Logs Subcollection
  const [logsLimit, setLogsLimit] = useState<number>(30);
  const [remoteAuditLogs, setRemoteAuditLogs] = useState<WorkflowAuditLog[]>(instance.auditLogs || []);

  useEffect(() => {
    if (instance.id) {
      const unsub = subscribeToWorkflowAuditLogs(instance.id, logsLimit, (fetchedLogs) => {
        if (fetchedLogs && fetchedLogs.length > 0) {
          setRemoteAuditLogs(fetchedLogs);
        }
      });
      return () => unsub();
    }
  }, [instance.id, logsLimit]);

  const displayLogs = remoteAuditLogs.length > 0 ? remoteAuditLogs : (instance.auditLogs || []);

  // Modal State for "Prosseguir mesmo assim" (Force proceed with justification)
  const [forceProceedModalOpen, setForceProceedModalOpen] = useState(false);
  const [justificationReason, setJustificationReason] = useState('');

  // Active step instance and effective template source (prefers frozen templateSnapshot!)
  const effectiveTemplate = instance.templateSnapshot || workflowTemplate;
  const activeStep = instance.steps.find((s) => s.id === selectedStepId) || instance.steps[0];
  const stepTemplate = effectiveTemplate?.steps.find((st) => st.id === activeStep?.stepTemplateId) ||
    effectiveTemplate?.steps.find((st, idx) => idx === activeStep?.order - 1);

  // Consolidated variables
  const currentVariables = getWorkflowVariablesMap(
    { ...instance.variables, ...(activeStep?.fieldsData || {}) },
    client,
    legalCase
  );

  // Update Field Value
  const handleFieldChange = (fieldKey: string, value: any) => {
    if (!activeStep) return;

    const oldVal = activeStep.fieldsData[fieldKey];
    const updatedFieldsData = { ...activeStep.fieldsData, [fieldKey]: value };

    const updatedSteps = instance.steps.map((s) =>
      s.id === activeStep.id ? { ...s, fieldsData: updatedFieldsData } : s
    );

    const updatedVariables = getWorkflowVariablesMap(
      { ...instance.variables, ...updatedFieldsData },
      client,
      legalCase
    );

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: new Date().toISOString(),
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'field_updated',
      stepId: activeStep.id,
      stepName: activeStep.name,
      fieldKey,
      oldValue: oldVal,
      newValue: value,
      details: `${currentUser.name} alterou o campo "${fieldKey}" na etapa "${activeStep.name}".`,
    };

    onUpdateInstance({
      ...instance,
      steps: updatedSteps,
      variables: updatedVariables,
      updatedAt: new Date().toISOString(),
      auditLogs: [auditEntry, ...(instance.auditLogs || [])],
    });
  };

  // Add Item to Repeatable Group Field
  const handleAddRepeatableItem = (field: WorkflowField) => {
    if (!activeStep) return;
    const currentList = Array.isArray(activeStep.fieldsData[field.key])
      ? activeStep.fieldsData[field.key]
      : [];
    const newItem: Record<string, any> = { _id: `item-${Date.now()}` };
    (field.subFields || []).forEach((sf) => {
      newItem[sf.key] = sf.defaultValue ?? '';
    });
    handleFieldChange(field.key, [...currentList, newItem]);
  };

  // Remove Item from Repeatable Group Field
  const handleRemoveRepeatableItem = (fieldKey: string, itemIdx: number) => {
    if (!activeStep) return;
    const currentList = Array.isArray(activeStep.fieldsData[fieldKey])
      ? [...activeStep.fieldsData[fieldKey]]
      : [];
    currentList.splice(itemIdx, 1);
    handleFieldChange(fieldKey, currentList);
  };

  // Update Field inside Repeatable Group Item
  const handleUpdateRepeatableItemField = (
    fieldKey: string,
    itemIdx: number,
    subKey: string,
    val: any
  ) => {
    if (!activeStep) return;
    const currentList = Array.isArray(activeStep.fieldsData[fieldKey])
      ? [...activeStep.fieldsData[fieldKey]]
      : [];
    if (!currentList[itemIdx]) return;
    currentList[itemIdx] = { ...currentList[itemIdx], [subKey]: val };
    handleFieldChange(fieldKey, currentList);
  };

  // Toggle Checklist Item
  const handleToggleChecklist = (checklistItemId: string) => {
    if (!activeStep) return;

    const updatedChecklist = activeStep.checklistData.map((chk) =>
      chk.checklistItemId === checklistItemId
        ? {
            ...chk,
            completed: !chk.completed,
            completedAt: !chk.completed ? new Date().toISOString() : undefined,
            completedBy: !chk.completed ? currentUser.name : undefined,
          }
        : chk
    );

    const updatedSteps = instance.steps.map((s) =>
      s.id === activeStep.id ? { ...s, checklistData: updatedChecklist } : s
    );

    onUpdateInstance({
      ...instance,
      steps: updatedSteps,
      updatedAt: new Date().toISOString(),
    });
  };

  // Complete Active Step normally
  const handleCompleteStep = (targetNextStepId?: string) => {
    if (!activeStep) return;

    const now = new Date().toISOString();

    // Check if lawyer review is required
    let nextStatus: WorkflowStepInstance['status'] = 'completed';
    if (activeStep.requiresLawyerReview && !activeStep.isReviewedByLawyer) {
      nextStatus = 'awaiting_review';
    }

    // Determine next step ID
    let nextStepIdToActivate = targetNextStepId;
    if (!nextStepIdToActivate && effectiveTemplate) {
      const foundTarget = determineNextStep(
        effectiveTemplate,
        activeStep.stepTemplateId,
        currentVariables
      );
      if (foundTarget) {
        const matchingStepInst = instance.steps.find((s) => s.stepTemplateId === foundTarget);
        if (matchingStepInst) nextStepIdToActivate = matchingStepInst.id;
      }
    }

    // If no target next step ID found, find next in sequence
    if (!nextStepIdToActivate) {
      const idx = instance.steps.findIndex((s) => s.id === activeStep.id);
      if (idx >= 0 && idx < instance.steps.length - 1) {
        nextStepIdToActivate = instance.steps[idx + 1].id;
      }
    }

    // Skip steps whose conditionRule evaluates to false
    let targetStepInst = instance.steps.find((s) => s.id === nextStepIdToActivate);
    while (targetStepInst) {
      const targetTpl = effectiveTemplate?.steps.find((st) => st.id === targetStepInst?.stepTemplateId);
      if (
        targetTpl?.conditionRule &&
        !evaluateRuleConditionGroup(targetTpl.conditionRule, currentVariables)
      ) {
        const currentIdx = instance.steps.findIndex((s) => s.id === targetStepInst?.id);
        if (currentIdx >= 0 && currentIdx < instance.steps.length - 1) {
          targetStepInst = instance.steps[currentIdx + 1];
          nextStepIdToActivate = targetStepInst.id;
        } else {
          targetStepInst = undefined;
        }
      } else {
        break;
      }
    }

    const updatedSteps = instance.steps.map((s) => {
      if (s.id === activeStep.id) {
        return {
          ...s,
          status: nextStatus,
          completedAt: nextStatus === 'completed' ? now : undefined,
          completedByUserId: currentUser.id,
          completedByUserName: currentUser.name,
        };
      }
      if (s.id === nextStepIdToActivate && nextStatus === 'completed') {
        return {
          ...s,
          status: 'in_progress' as const,
          startedAt: now,
        };
      }
      return s;
    });

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      action: nextStatus === 'awaiting_review' ? 'step_awaiting_review' : 'step_completed',
      stepId: activeStep.id,
      stepName: activeStep.name,
      details:
        nextStatus === 'awaiting_review'
          ? `${currentUser.name} concluiu os preenchimentos da etapa "${activeStep.name}". Aguardando revisão do advogado.`
          : `${currentUser.name} concluiu a etapa "${activeStep.name}".`,
    };

    const newCurrentStepId = nextStepIdToActivate || instance.currentStepId;

    onUpdateInstance({
      ...instance,
      currentStepId: newCurrentStepId,
      steps: updatedSteps,
      updatedAt: now,
      auditLogs: [auditEntry, ...(instance.auditLogs || [])],
    });

    if (nextStepIdToActivate) {
      setSelectedStepId(nextStepIdToActivate);
    }
  };

  // Lawyer Approve Review
  const handleApproveReview = () => {
    if (!activeStep) return;

    const now = new Date().toISOString();
    const updatedSteps = instance.steps.map((s) =>
      s.id === activeStep.id
        ? {
            ...s,
            status: 'completed' as const,
            isReviewedByLawyer: true,
            reviewedByUserId: currentUser.id,
            reviewedByUserName: currentUser.name,
            reviewedAt: now,
            completedAt: now,
          }
        : s
    );

    // Find next step in sequence
    const idx = instance.steps.findIndex((s) => s.id === activeStep.id);
    const nextStepInst = instance.steps[idx + 1];

    if (nextStepInst) {
      updatedSteps[idx + 1] = { ...nextStepInst, status: 'in_progress', startedAt: now };
    }

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'lawyer_review_approved',
      stepId: activeStep.id,
      stepName: activeStep.name,
      details: `Advogado ${currentUser.name} aprovou a revisão jurídica da etapa "${activeStep.name}".`,
    };

    onUpdateInstance({
      ...instance,
      steps: updatedSteps,
      currentStepId: nextStepInst?.id || instance.currentStepId,
      updatedAt: now,
      auditLogs: [auditEntry, ...(instance.auditLogs || [])],
    });

    if (nextStepInst) setSelectedStepId(nextStepInst.id);
  };

  // Force Proceed with Justification ("Prosseguir mesmo assim")
  const handleConfirmForceProceed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationReason.trim() || !activeStep) return;

    const now = new Date().toISOString();
    const uncompletedChecklist = activeStep.checklistData.filter((c) => !c.completed).map((c) => c.text);

    const justificationObj = {
      userId: currentUser.id,
      userName: currentUser.name,
      timestamp: now,
      reason: justificationReason.trim(),
      ignoredPendencies: uncompletedChecklist,
    };

    const updatedSteps = instance.steps.map((s) =>
      s.id === activeStep.id
        ? {
            ...s,
            status: 'completed' as const,
            completedAt: now,
            completedByUserId: currentUser.id,
            completedByUserName: currentUser.name,
            forceProceedJustification: justificationObj,
          }
        : s
    );

    const idx = instance.steps.findIndex((s) => s.id === activeStep.id);
    const nextStepInst = instance.steps[idx + 1];

    if (nextStepInst) {
      updatedSteps[idx + 1] = { ...nextStepInst, status: 'in_progress', startedAt: now };
    }

    const auditEntry = {
      id: `log-${Date.now()}`,
      timestamp: now,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'force_proceed_justified',
      stepId: activeStep.id,
      stepName: activeStep.name,
      details: `${currentUser.name} forçou a conclusão da etapa "${activeStep.name}". Motivo: "${justificationReason.trim()}". Pendências ignoradas: ${uncompletedChecklist.length}`,
    };

    onUpdateInstance({
      ...instance,
      steps: updatedSteps,
      currentStepId: nextStepInst?.id || instance.currentStepId,
      updatedAt: now,
      auditLogs: [auditEntry, ...(instance.auditLogs || [])],
    });

    setForceProceedModalOpen(false);
    setJustificationReason('');
    if (nextStepInst) setSelectedStepId(nextStepInst.id);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner for Workflow Instance */}
      <div className="p-5 rounded-2xl bg-[#0D0D0D] border border-[#C9A227]/50 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-[#C9A227] text-slate-950">
              Workflow Ativo • v{instance.version}
            </span>
            <span className="text-xs text-slate-400 font-mono font-bold">{instance.templateCode}</span>
          </div>
          <h2 className="text-lg font-black text-white">{instance.templateTitle}</h2>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            Cliente: <span className="font-bold text-white">{client?.name || legalCase.clientName}</span> • Processo: <span className="font-bold text-white">{legalCase.caseNumber}</span>
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-2 bg-slate-900 p-1.5 rounded-xl border border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('execution')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'execution'
                ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">play_circle</span>
            <span>Execução das Etapas</span>
          </button>

          <button
            onClick={() => setActiveTab('variables')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'variables'
                ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">data_object</span>
            <span>Variáveis ({Object.keys(currentVariables).length})</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'history'
                ? 'bg-[#C9A227] text-slate-950 shadow-xs'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span className="material-symbols-outlined text-sm">history</span>
            <span>Auditoria ({instance.auditLogs?.length || 0})</span>
          </button>
        </div>
      </div>

      {/* TAB 1: Execution Mode */}
      {activeTab === 'execution' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Horizontal / Vertical Pipeline Steps List (col-span-4) */}
          <div className="lg:col-span-4 space-y-2">
            <span className="text-xs font-black text-slate-700 uppercase tracking-wider block px-1">
              Etapas do Workflow ({instance.steps.length})
            </span>

            {instance.steps.map((st, idx) => {
              const isSelected = st.id === selectedStepId;
              const isCurrent = st.id === instance.currentStepId;

              const stTpl = effectiveTemplate?.steps.find((s) => s.id === st.stepTemplateId || s.order === st.order);
              const isConditionMet = !stTpl?.conditionRule || evaluateRuleConditionGroup(stTpl.conditionRule, currentVariables);

              let statusColor = 'bg-slate-100 text-slate-600 border-slate-200';
              let statusLabel = 'Não Iniciada';

              if (!isConditionMet) {
                statusColor = 'bg-slate-100 text-slate-400 border-slate-200 border-dashed';
                statusLabel = 'Ocultada (Condição Falsa)';
              } else if (st.status === 'completed') {
                statusColor = 'bg-emerald-50 text-emerald-800 border-emerald-300';
                statusLabel = 'Concluída';
              } else if (st.status === 'in_progress') {
                statusColor = 'bg-amber-50 text-amber-900 border-amber-300 font-black';
                statusLabel = 'Em Andamento';
              } else if (st.status === 'awaiting_review') {
                statusColor = 'bg-purple-50 text-purple-900 border-purple-300 font-black';
                statusLabel = 'Aguardando Revisão';
              } else if (st.status === 'skipped') {
                statusColor = 'bg-slate-200 text-slate-500 border-slate-300';
                statusLabel = 'Ignorada';
              }

              return (
                <div
                  key={st.id}
                  onClick={() => setSelectedStepId(st.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-1.5 relative ${
                    isSelected
                      ? 'bg-slate-900 text-white border-[#C9A227] shadow-sm'
                      : 'bg-white text-slate-900 border-slate-200 hover:border-slate-300 shadow-xs'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                        isSelected ? 'bg-slate-800 text-slate-200 border-slate-700' : statusColor
                      }`}
                    >
                      {statusLabel}
                    </span>

                    {isCurrent && (
                      <span className="px-2 py-0.5 rounded-full bg-[#C9A227] text-slate-950 font-black text-[9px] uppercase tracking-wider">
                        ★ Etapa Atual
                      </span>
                    )}
                  </div>

                  <h4 className={`text-xs font-black ${isSelected ? 'text-white' : 'text-slate-900'}`}>
                    {st.order}. {st.name}
                  </h4>

                  <p className={`text-[11px] font-medium line-clamp-1 ${isSelected ? 'text-slate-300' : 'text-slate-500'}`}>
                    {st.description}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Right Column: Step Execution Details (col-span-8) */}
          <div className="lg:col-span-8 space-y-5">
            {activeStep ? (
              <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-6">
                {/* Step Header */}
                <div className="border-b border-slate-100 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-1.5 mb-1">
                      <span className="px-2.5 py-0.5 rounded-full bg-slate-900 text-white font-black text-[10px]">
                        Fase #{activeStep.order}
                      </span>
                      <span className="text-[11px] font-bold text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200 flex items-center gap-1">
                        <span className="material-symbols-outlined text-xs">schedule</span>
                        <span>SLA Escritório: {activeStep.slaDays}d</span>
                      </span>
                      {activeStep.processDeadlineDays && (
                        <span className="text-[11px] font-bold text-rose-800 bg-rose-50 px-2.5 py-0.5 rounded-lg border border-rose-200 flex items-center gap-1">
                          <span className="material-symbols-outlined text-xs">gavel</span>
                          <span>Prazo Processual: {activeStep.processDeadlineDays}d</span>
                        </span>
                      )}
                      <span className="text-[11px] font-bold text-blue-900 bg-blue-50 px-2.5 py-0.5 rounded-lg border border-blue-200">
                        {activeStep.assignedRole}
                      </span>
                    </div>

                    <h3 className="text-lg font-black text-slate-900">{activeStep.name}</h3>
                    <p className="text-xs text-slate-500 font-medium mt-0.5">{activeStep.description}</p>
                  </div>

                  {activeStep.status === 'awaiting_review' && (
                    <div className="flex items-center space-x-2 shrink-0">
                      <button
                        onClick={handleApproveReview}
                        className="px-3.5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-black text-xs shadow-xs flex items-center gap-1 transition-all"
                      >
                        <span className="material-symbols-outlined text-sm">verified</span>
                        <span>Aprovar</span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Section 1: Custom Fields Form */}
                {stepTemplate?.fields && stepTemplate.fields.length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-slate-50 border border-slate-200/80">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-blue-900">edit_note</span>
                      <span>Campos Personalizados da Etapa</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1 text-xs">
                      {stepTemplate.fields.map((field: WorkflowField) => {
                        const isRepeatable = field.type === 'repeatable_group';
                        const isCalculated = field.type === 'calculated';
                        const val = isCalculated
                          ? evaluateCalculatedFormula(field.formula || '', currentVariables)
                          : activeStep.fieldsData[field.key] ?? field.defaultValue ?? '';

                        return (
                          <div
                            key={field.id}
                            className={field.type === 'long_text' || isRepeatable ? 'md:col-span-2' : ''}
                          >
                            <label className="block font-bold text-slate-700 mb-1">
                              {field.label} {field.required && <span className="text-rose-500">*</span>}
                              {field.variableName && (
                                <span className="ml-1.5 text-[10px] font-mono text-blue-700 font-semibold bg-blue-50 px-1.5 py-0.5 rounded">
                                  {field.variableName}
                                </span>
                              )}
                            </label>

                            {isCalculated ? (
                              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-slate-900 font-black flex items-center justify-between">
                                <span>{String(val || '0.00')}</span>
                                <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider flex items-center gap-1 bg-amber-100 px-2 py-0.5 rounded-md">
                                  <span className="material-symbols-outlined text-xs">calculate</span>
                                  Calculado Automático
                                </span>
                              </div>
                            ) : isRepeatable ? (
                              <div className="space-y-3 p-3 rounded-xl bg-white border border-slate-200">
                                {Array.isArray(val) && val.length > 0 ? (
                                  <div className="space-y-2">
                                    {val.map((item: any, itemIdx: number) => (
                                      <div
                                        key={item._id || itemIdx}
                                        className="p-3 rounded-lg bg-slate-50 border border-slate-200 relative grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2"
                                      >
                                        {(field.subFields || [
                                          { id: '1', key: 'nome', label: 'Nome', type: 'short_text', required: true },
                                          { id: '2', key: 'cpf', label: 'CPF', type: 'cpf', required: false },
                                        ]).map((sf) => (
                                          <div key={sf.id}>
                                            <label className="block text-[10px] font-bold text-slate-600 mb-0.5">
                                              {sf.label}
                                            </label>
                                            <input
                                              type="text"
                                              value={item[sf.key] || ''}
                                              onChange={(e) =>
                                                handleUpdateRepeatableItemField(
                                                  field.key,
                                                  itemIdx,
                                                  sf.key,
                                                  e.target.value
                                                )
                                              }
                                              className="w-full bg-white border border-slate-300 rounded-lg px-2 py-1 text-slate-900 text-xs font-medium"
                                            />
                                          </div>
                                        ))}

                                        <button
                                          type="button"
                                          onClick={() => handleRemoveRepeatableItem(field.key, itemIdx)}
                                          className="text-rose-600 hover:text-rose-800 font-bold text-[10px] sm:col-span-2 md:col-span-3 text-right pt-1 flex items-center justify-end gap-1"
                                        >
                                          <span className="material-symbols-outlined text-xs">delete</span>
                                          Remover Registro
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <p className="text-slate-400 italic text-[11px]">Nenhum registro adicionado ainda.</p>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleAddRepeatableItem(field)}
                                  className="px-3 py-1.5 rounded-lg bg-blue-50 text-blue-900 hover:bg-blue-100 font-bold text-xs flex items-center gap-1 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">add_circle</span>
                                  <span>Adicionar Registro ({field.label})</span>
                                </button>
                              </div>
                            ) : field.type === 'long_text' ? (
                              <textarea
                                rows={3}
                                value={val}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder || ''}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-900"
                              />
                            ) : field.type === 'boolean' ? (
                              <select
                                value={String(val)}
                                onChange={(e) => handleFieldChange(field.key, e.target.value === 'true')}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                              >
                                <option value="true">Sim</option>
                                <option value="false">Não</option>
                              </select>
                            ) : field.type === 'single_select' ? (
                              <select
                                value={val}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-bold"
                              >
                                <option value="">Selecione...</option>
                                {(field.options || []).map((opt) => (
                                  <option key={opt} value={opt}>
                                    {opt}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={
                                  field.type === 'number' || field.type === 'currency'
                                    ? 'number'
                                    : field.type === 'date'
                                    ? 'date'
                                    : 'text'
                                }
                                value={val}
                                onChange={(e) => handleFieldChange(field.key, e.target.value)}
                                placeholder={field.placeholder || ''}
                                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-900"
                              />
                            )}

                            {field.helpText && (
                              <p className="text-[10px] text-slate-400 mt-0.5 font-medium">{field.helpText}</p>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Section 2: Checklist Items */}
                {activeStep.checklistData && activeStep.checklistData.length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-emerald-600">check_box</span>
                      <span>Checklist de Tarefas Necessárias</span>
                    </span>

                    <div className="space-y-2 pt-1 text-xs">
                      {activeStep.checklistData.map((chk) => (
                        <label
                          key={chk.checklistItemId}
                          className={`flex items-start space-x-2.5 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            chk.completed
                              ? 'bg-emerald-50/70 border-emerald-200 text-slate-700 line-through'
                              : 'bg-slate-50 border-slate-200 hover:border-slate-300 text-slate-900'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={chk.completed}
                            onChange={() => handleToggleChecklist(chk.checklistItemId)}
                            className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                          />
                          <span className="font-bold">{chk.text}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2.1: Required Documents for Step */}
                {stepTemplate?.requiredDocuments && stepTemplate.requiredDocuments.length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-white border border-slate-200">
                    <span className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-800">folder_open</span>
                      <span>Documentos Exigidos Nesta Etapa ({stepTemplate.requiredDocuments.length})</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {stepTemplate.requiredDocuments.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 block">{doc.title}</span>
                            <span className={`text-[10px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${
                              doc.classification === 'mandatory'
                                ? 'bg-rose-100 text-rose-900 border border-rose-200'
                                : 'bg-slate-200 text-slate-700'
                            }`}>
                              {doc.classification === 'mandatory' ? 'Obrigatório' : 'Recomendado'}
                            </span>
                          </div>
                          <span className="material-symbols-outlined text-emerald-600 text-base">check_circle</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 2.2: Generated Documents / Minutas */}
                {stepTemplate?.generatedDocuments && stepTemplate.generatedDocuments.length > 0 && (
                  <div className="space-y-3 p-4 rounded-2xl bg-purple-50/60 border border-purple-200">
                    <span className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-purple-800">description</span>
                      <span>Minutas e Documentos Gerados Automaticamente ({stepTemplate.generatedDocuments.length})</span>
                    </span>

                    <div className="space-y-2 text-xs pt-1">
                      {stepTemplate.generatedDocuments.map((gdoc) => (
                        <div
                          key={gdoc.id}
                          className="p-3 rounded-xl bg-white border border-purple-200 flex items-center justify-between shadow-xs"
                        >
                          <div>
                            <span className="font-extrabold text-slate-900 block">{gdoc.title}</span>
                            <span className="text-[10px] text-purple-800 font-semibold">
                              Interpolação direta de variáveis do cliente e workflow
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => alert(`Gerando minuta "${gdoc.title}" com variáveis mescladas do cliente!`)}
                            className="px-3 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white font-bold text-xs flex items-center gap-1 shadow-xs transition-all"
                          >
                            <span className="material-symbols-outlined text-xs">print</span>
                            <span>Gerar Minuta</span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Section 3: Conditional Branching Selector (if branch available) */}
                {stepTemplate?.conditionalNextSteps && stepTemplate.conditionalNextSteps.length > 0 && (
                  <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 space-y-3">
                    <span className="text-xs font-black text-amber-900 uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm text-amber-700">call_split</span>
                      <span>Ramificações Condicionais Disponíveis</span>
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                      {stepTemplate.conditionalNextSteps.map((branch) => {
                        const targetStepObj = instance.steps.find((s) => s.stepTemplateId === branch.targetStepId);

                        return (
                          <button
                            key={branch.id}
                            onClick={() => handleCompleteStep(targetStepObj?.id)}
                            className="p-3 rounded-xl bg-white border border-amber-300 hover:border-amber-500 hover:bg-amber-100/50 text-slate-900 font-extrabold text-left transition-all flex items-center justify-between"
                          >
                            <span>{branch.label}</span>
                            <span className="material-symbols-outlined text-sm text-amber-700">arrow_forward</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Step Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setForceProceedModalOpen(true)}
                    className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>Prosseguir mesmo assim (Com Justificativa)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompleteStep()}
                    className="px-6 py-2.5 rounded-xl bg-[#0D0D0D] hover:bg-slate-900 text-white font-black text-xs border border-[#C9A227]/50 shadow-sm flex items-center gap-2 transition-all ml-auto"
                  >
                    <span className="material-symbols-outlined text-sm text-[#C9A227]">check_circle</span>
                    <span>Concluir Etapa e Avançar</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-12 rounded-2xl bg-white border border-slate-200 text-center text-xs font-bold text-slate-500">
                Selecione uma etapa ao lado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Variables View */}
      {activeTab === 'variables' && (
        <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="font-black text-slate-900 text-sm">Mapa de Variáveis do Workflow & Cliente</h3>
            <p className="text-xs text-slate-500">
              Estas variáveis são geradas automaticamente e podem ser utilizadas em minutas e modelos de documentos.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            {Object.keys(currentVariables).map((key) => (
              <div key={key} className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-1">
                <span className="text-[10px] font-mono font-bold text-blue-900 block">{key}</span>
                <span className="font-extrabold text-slate-800 break-all block">
                  {String(currentVariables[key] ?? '(não preenchido)')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: Audit Trail / History View (Append-Only Subcollection) */}
      {activeTab === 'history' && (
        <div className="glass-panel p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-sm">Histórico de Alterações & Auditoria</h3>
              <p className="text-xs text-slate-500">
                Trilha de auditoria append-only em subcollection do Firestore ({`workflowInstances/${instance.id}/auditLogs`}).
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
              {displayLogs.length} eventos
            </span>
          </div>

          <div className="space-y-3 text-xs">
            {(!displayLogs || displayLogs.length === 0) ? (
              <p className="text-slate-400 italic">Nenhum evento registrado ainda.</p>
            ) : (
              displayLogs.map((log) => (
                <div key={log.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-black text-slate-900">{log.userName}</span>
                    <span className="text-slate-400 font-semibold">{new Date(log.timestamp).toLocaleString('pt-BR')}</span>
                  </div>
                  <p className="text-slate-700 font-medium">{log.details}</p>
                </div>
              ))
            )}
          </div>

          {/* Pagination control */}
          <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-400">Exibindo até {logsLimit} últimos registros</span>
            <button
              type="button"
              onClick={() => setLogsLimit((prev) => prev + 30)}
              className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold transition-all flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-sm">history</span>
              <span>Carregar Histórico Anterior (+30)</span>
            </button>
          </div>
        </div>
      )}

      {/* MODAL: Force Proceed Justification */}
      {forceProceedModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
              <span className="material-symbols-outlined text-amber-600">warning</span>
              <h3 className="font-black text-slate-900 text-sm">Prosseguir Mesmo Com Pendências</h3>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed font-medium">
              Por norma jurídica, o advogado pode avançar para a próxima etapa mesmo que existam itens pendentes. Por favor, forneça uma justificativa formal para auditoria:
            </p>

            <form onSubmit={handleConfirmForceProceed} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Motivo / Justificativa <span className="text-rose-500">*</span></label>
                <textarea
                  rows={3}
                  required
                  value={justificationReason}
                  onChange={(e) => setJustificationReason(e.target.value)}
                  placeholder="Ex: Documento pendente anexado pelo cliente via WhatsApp; protocolado em caráter de urgência."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-slate-900 font-medium focus:ring-2 focus:ring-blue-900"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setForceProceedModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 font-bold"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white font-black hover:bg-amber-700 shadow-sm"
                >
                  Confirmar & Avançar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
