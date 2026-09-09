import {
  WorkflowTemplate,
  WorkflowInstance,
  WorkflowStepInstance,
  RuleConditionGroup,
  SingleCondition,
  Client,
  LegalCase,
  WorkflowAuditLog,
  WorkflowField,
} from '../types';

/**
 * Safely evaluates a arithmetic or string formula for calculated fields.
 * Example formula: "renda_familiar / membros_familia"
 */
export function evaluateCalculatedFormula(
  formula: string,
  variables: Record<string, any>
): any {
  if (!formula || !formula.trim()) return '';

  try {
    let expr = formula;

    // Replace [VARIABLE] or VARIABLE tokens with actual numeric/string values
    Object.keys(variables).forEach((key) => {
      const val = variables[key];
      if (val !== undefined && val !== null) {
        const numVal = typeof val === 'number' ? val : parseFloat(String(val).replace(',', '.'));
        const safeNum = !isNaN(numVal) ? numVal : 0;

        // Replace both [KEY] and KEY
        const cleanKey = key.replace(/^\[|\]$/g, '');
        const regexWithBracket = new RegExp(`\\[${cleanKey}\\]`, 'gi');
        const regexWord = new RegExp(`\\b${cleanKey}\\b`, 'gi');

        expr = expr.replace(regexWithBracket, String(safeNum));
        expr = expr.replace(regexWord, String(safeNum));
      }
    });

    // Clean expression to only allow safe mathematical characters
    const sanitizedExpr = expr.replace(/[^0-9\.\+\-\*\/\(\)\s]/g, '');
    if (!sanitizedExpr.trim()) return '';

    // Evaluate basic math safely
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${sanitizedExpr});`)();
    if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
      return Number(result.toFixed(2));
    }
    return result;
  } catch (e) {
    return '';
  }
}

/**
 * Evaluates a single condition against a set of variables.
 */
export function evaluateSingleCondition(
  condition: SingleCondition,
  variables: Record<string, any>
): boolean {
  if (!condition.fieldKey) return true;

  const rawVal =
    variables[condition.fieldKey] ??
    variables[condition.fieldKey.toLowerCase()] ??
    variables[condition.fieldKey.toUpperCase()] ??
    variables[`[${condition.fieldKey.toUpperCase()}]`];

  switch (condition.operator) {
    case 'equals':
      return String(rawVal ?? '').trim().toLowerCase() === String(condition.value ?? '').trim().toLowerCase();
    case 'not_equals':
      return String(rawVal ?? '').trim().toLowerCase() !== String(condition.value ?? '').trim().toLowerCase();
    case 'greater_than':
      return Number(rawVal || 0) > Number(condition.value || 0);
    case 'less_than':
      return Number(rawVal || 0) < Number(condition.value || 0);
    case 'greater_or_equal':
      return Number(rawVal || 0) >= Number(condition.value || 0);
    case 'less_or_equal':
      return Number(rawVal || 0) <= Number(condition.value || 0);
    case 'contains':
      return String(rawVal ?? '').toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'not_contains':
      return !String(rawVal ?? '').toLowerCase().includes(String(condition.value ?? '').toLowerCase());
    case 'is_empty':
      return rawVal === undefined || rawVal === null || String(rawVal).trim() === '';
    case 'is_not_empty':
      return rawVal !== undefined && rawVal !== null && String(rawVal).trim() !== '';
    case 'is_true':
      return rawVal === true || String(rawVal).toLowerCase() === 'true' || String(rawVal) === '1' || String(rawVal).toLowerCase() === 'sim';
    case 'is_false':
      return rawVal === false || String(rawVal).toLowerCase() === 'false' || String(rawVal) === '0' || String(rawVal).toLowerCase() === 'nao' || String(rawVal).toLowerCase() === 'não';
    default:
      return true;
  }
}

/**
 * Evaluates a RuleConditionGroup (AND/OR).
 */
export function evaluateRuleConditionGroup(
  group?: RuleConditionGroup,
  variables: Record<string, any> = {}
): boolean {
  if (!group || !group.conditions || group.conditions.length === 0) {
    return true; // No conditions means always true
  }

  if (group.logicalOperator === 'OR') {
    return group.conditions.some((cond) => evaluateSingleCondition(cond, variables));
  } else {
    // AND operator
    return group.conditions.every((cond) => evaluateSingleCondition(cond, variables));
  }
}

/**
 * Formats repeatable group data into bulleted lists / tables for document interpolation
 */
export function formatRepeatableGroupToText(groupData: any[]): string {
  if (!Array.isArray(groupData) || groupData.length === 0) return 'Nenhum item informado.';

  return groupData
    .map((item, idx) => {
      if (typeof item !== 'object' || !item) return `${idx + 1}. ${String(item)}`;
      const entries = Object.entries(item)
        .filter(([k]) => !k.startsWith('_'))
        .map(([k, v]) => `${k.replace(/_/g, ' ').toUpperCase()}: ${v}`)
        .join(' | ');
      return `${idx + 1}. ${entries}`;
    })
    .join('\n');
}

/**
 * Builds standard variable map combining client data, legal case data, and workflow fields.
 * Supports namespaces like [CLIENTE.NOME], [PROCESSO.NUMERO], [WORKFLOW.KEY]
 */
export function getWorkflowVariablesMap(
  fieldsData: Record<string, any> = {},
  client?: Client | null,
  legalCase?: LegalCase | null
): Record<string, any> {
  const map: Record<string, any> = { ...fieldsData };

  // Populate field variables with all namespace variations
  Object.keys(fieldsData).forEach((key) => {
    const val = fieldsData[key];

    // Handle repeatable groups
    if (Array.isArray(val)) {
      const formattedText = formatRepeatableGroupToText(val);
      map[key] = formattedText;
      map[`[${key.toUpperCase()}]`] = formattedText;
      map[`[WORKFLOW.${key.toUpperCase()}]`] = formattedText;
      map[`${key}_raw`] = val;
    } else {
      map[key] = val;
      map[`[${key.toUpperCase()}]`] = val;
      map[`[WORKFLOW.${key.toUpperCase()}]`] = val;
    }
  });

  // Client Namespace Variables
  if (client) {
    const clientVars = {
      CLIENTE_NOME: client.name || '',
      CLIENTE_CPF: client.cpf || '',
      CLIENTE_RG: (client as any).rg || '',
      CLIENTE_EMAIL: client.email || '',
      CLIENTE_TELEFONE: client.phone || '',
      CLIENTE_ESTADO_CIVIL: client.maritalStatus || '',
      CLIENTE_PROFISSAO: client.occupation || '',
      CLIENTE_DATA_NASCIMENTO: client.birthDate || '',
      CLIENTE_NOME_MAE: client.motherName || '',
      CLIENTE_ENDERECO: client.addressStreet
        ? `${client.addressStreet}, ${client.addressNumber || 'S/N'} - ${client.addressNeighborhood || ''}, ${client.addressCityUf || ''}`
        : '',
    };

    Object.entries(clientVars).forEach(([k, v]) => {
      map[k] = v;
      map[`[${k}]`] = v;
      map[`[${k.replace('CLIENTE_', 'CLIENTE.')}]`] = v;
    });
  }

  // Case Namespace Variables
  if (legalCase) {
    const caseVars = {
      PROCESSO_NUMERO: legalCase.processNumber || legalCase.caseNumber || '',
      PROCESSO_BENEFICIO: legalCase.benefitType || legalCase.processTypeName || '',
      PROCESSO_DER: legalCase.administrativeData?.der || '',
      PROCESSO_NB: (legalCase.administrativeData as any)?.nb || legalCase.administrativeData?.benefitNumberNB || '',
      PROCESSO_VARA: legalCase.judicialData?.court || '',
      PROCESSO_ADVOGADO: legalCase.responsibleUserName || 'Advogado Responsável',
    };

    Object.entries(caseVars).forEach(([k, v]) => {
      map[k] = v;
      map[`[${k}]`] = v;
      map[`[${k.replace('PROCESSO_', 'PROCESSO.')}]`] = v;
    });
  }

  return map;
}

/**
 * Instantiates a WorkflowTemplate for a specific LegalCase.
 * Freezes a full templateSnapshot inside the instance so future template edits NEVER alter active cases.
 */
export function instantiateWorkflow(
  template: WorkflowTemplate,
  caseItem: LegalCase,
  client?: Client | null,
  userActor?: { id: string; name: string; role?: string }
): WorkflowInstance {
  const initialVariables = getWorkflowVariablesMap({}, client, caseItem);

  const effectiveUserId = userActor?.id || caseItem.responsibleUserId || 'usr-resp';
  const effectiveUserName = userActor?.name || caseItem.responsibleUserName || 'Advogado Responsável';
  const effectiveRole = userActor?.role || 'Advogado';

  const stepInstances: WorkflowStepInstance[] = template.steps.map((step, idx) => {
    const checklistData = (step.checklist || []).map((chk) => ({
      checklistItemId: chk.id,
      text: chk.text,
      completed: false,
    }));

    return {
      id: `inst-step-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
      stepTemplateId: step.id,
      name: step.name,
      description: step.description,
      order: step.order || idx + 1,
      status: idx === 0 ? 'in_progress' : 'not_started',
      assignedRole: step.responsibleRole || effectiveRole,
      assignedUserId: step.responsibleUserId || effectiveUserId,
      assignedUserName: effectiveUserName,
      slaDays: step.slaDays || 5,
      processDeadlineDays: step.processDeadlineDays,
      requiresLawyerReview: Boolean(step.requiresLawyerReview),
      fieldsData: {},
      checklistData,
      attachedDocuments: [],
      startedAt: idx === 0 ? new Date().toISOString() : undefined,
    };
  });

  const auditLog: WorkflowAuditLog = {
    id: `log-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: effectiveUserId,
    userName: effectiveUserName,
    action: 'workflow_instantiated',
    details: `Workflow "${template.title}" (v${template.version}) instanciado por ${effectiveUserName} para o processo ${caseItem.caseNumber}. Snapshot do modelo congelado com sucesso.`,
  };

  return {
    id: `wf-inst-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    caseId: caseItem.id,
    clientId: caseItem.clientId,
    templateId: template.id,
    templateCode: template.code,
    templateTitle: template.title,
    version: template.version || 1,
    processTypeId: caseItem.processTypeId || (template.processTypeIds && template.processTypeIds[0]) || 'generico',
    status: 'active',
    currentStepId: stepInstances[0]?.id || '',
    startedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    templateSnapshot: JSON.parse(JSON.stringify(template)), // Frozen snapshot
    steps: stepInstances,
    auditLogs: [auditLog],
    variables: initialVariables,
  };
}

/**
 * Determines the next step to navigate to based on linear nextStepId or conditionalNextSteps.
 */
export function determineNextStep(
  template: WorkflowTemplate,
  currentStepTemplateId: string,
  variables: Record<string, any>
): string | null {
  const currentStep = template.steps.find((s) => s.id === currentStepTemplateId);
  if (!currentStep) return null;

  // Check conditional branches first
  if (currentStep.conditionalNextSteps && currentStep.conditionalNextSteps.length > 0) {
    for (const branch of currentStep.conditionalNextSteps) {
      if (evaluateRuleConditionGroup(branch.conditionRule, variables)) {
        return branch.targetStepId;
      }
    }
  }

  // Fallback to explicit nextStepId
  if (currentStep.nextStepId) {
    return currentStep.nextStepId;
  }

  // Fallback to next linear order
  const currentIndex = template.steps.findIndex((s) => s.id === currentStepTemplateId);
  if (currentIndex >= 0 && currentIndex < template.steps.length - 1) {
    return template.steps[currentIndex + 1].id;
  }

  return null; // Reached end of workflow
}

/**
 * Validates a WorkflowTemplate for potential structural issues before publishing.
 */
export function validateWorkflowTemplate(template: WorkflowTemplate): {
  isValid: boolean;
  issues: { type: 'error' | 'warning'; message: string; stepId?: string }[];
} {
  const issues: { type: 'error' | 'warning'; message: string; stepId?: string }[] = [];

  if (!template.title || !template.title.trim()) {
    issues.push({ type: 'error', message: 'O Workflow não possui título ou nome definido.' });
  }

  if (!template.code || !template.code.trim()) {
    issues.push({ type: 'warning', message: 'O Workflow não possui código identificador (ex: WF-PREV-BPC).' });
  }

  if (!template.steps || template.steps.length === 0) {
    issues.push({ type: 'error', message: 'O Workflow precisa de pelo menos uma etapa para ser publicado.' });
    return { isValid: false, issues };
  }

  const stepIds = new Set(template.steps.map((s) => s.id));
  const fieldKeys = new Set<string>();

  // Standard system variables allowed in conditions
  const systemVariables = new Set([
    'cliente_nome',
    'cliente_cpf',
    'cliente_email',
    'cliente_telefone',
    'processo_numero',
    'der',
    'renda_familiar',
    'membros_familia',
    'renda_per_capita',
  ]);

  template.steps.forEach((step, idx) => {
    if (!step.name || !step.name.trim()) {
      issues.push({ type: 'error', message: `Etapa #${idx + 1} está sem nome.`, stepId: step.id });
    }

    // Check fields and collect keys
    (step.fields || []).forEach((field) => {
      if (!field.key || !field.key.trim()) {
        issues.push({ type: 'error', message: `Campo "${field.label}" na etapa "${step.name}" está sem identificador (key).`, stepId: step.id });
      } else {
        const lowerKey = field.key.trim().toLowerCase();
        if (fieldKeys.has(lowerKey)) {
          issues.push({ type: 'warning', message: `Identificador de campo duplicado "${field.key}" encontrado na etapa "${step.name}".`, stepId: step.id });
        } else {
          fieldKeys.add(lowerKey);
        }
      }
    });
  });

  // Check conditions reference valid fields
  template.steps.forEach((step) => {
    const checkRuleConditions = (ruleGroup?: RuleConditionGroup, sourceName = 'regra') => {
      if (!ruleGroup || !ruleGroup.conditions) return;
      ruleGroup.conditions.forEach((cond) => {
        if (cond.fieldKey) {
          const lowerKey = cond.fieldKey.trim().toLowerCase();
          if (!fieldKeys.has(lowerKey) && !systemVariables.has(lowerKey)) {
            issues.push({
              type: 'warning',
              message: `A ${sourceName} na etapa "${step.name}" utiliza o campo "${cond.fieldKey}", que não está definido nos campos do template.`,
              stepId: step.id,
            });
          }
        }
      });
    };

    (step.conditionalNextSteps || []).forEach((branch) => {
      checkRuleConditions(branch.conditionRule, `ramificação "${branch.label}"`);
      if (!branch.targetStepId || !stepIds.has(branch.targetStepId)) {
        issues.push({
          type: 'error',
          message: `Ramificação "${branch.label}" na etapa "${step.name}" aponta para uma etapa destino inexistente.`,
          stepId: step.id,
        });
      }
    });

    if (step.nextStepId && !stepIds.has(step.nextStepId)) {
      issues.push({
        type: 'error',
        message: `Etapa "${step.name}" aponta para uma próxima etapa inexistente (ID: ${step.nextStepId}).`,
        stepId: step.id,
      });
    }

    checkRuleConditions(step.conditionRule, 'condição de exibição da etapa');
  });

  // Circular loop check (simple DFS cycle detection)
  const visited = new Set<string>();
  const recStack = new Set<string>();

  function hasCycle(stepId: string): boolean {
    if (recStack.has(stepId)) return true;
    if (visited.has(stepId)) return false;

    visited.add(stepId);
    recStack.add(stepId);

    const step = template.steps.find((s) => s.id === stepId);
    if (step) {
      const neighbours: string[] = [];
      if (step.nextStepId) neighbours.push(step.nextStepId);
      (step.conditionalNextSteps || []).forEach((b) => {
        if (b.targetStepId) neighbours.push(b.targetStepId);
      });

      for (const neighbour of neighbours) {
        if (hasCycle(neighbour)) return true;
      }
    }

    recStack.delete(stepId);
    return false;
  }

  if (template.steps[0] && hasCycle(template.steps[0].id)) {
    issues.push({
      type: 'warning',
      message: 'Atenção: Detectado potencial loop circular de navegação entre etapas neste workflow.',
    });
  }

  const hasErrors = issues.some((i) => i.type === 'error');
  return {
    isValid: !hasErrors,
    issues,
  };
}

/**
 * Export workflow template to JSON string.
 */
export function exportWorkflowTemplateToJSON(template: WorkflowTemplate): string {
  return JSON.stringify(template, null, 2);
}

/**
 * Import workflow template from JSON string.
 */
export function importWorkflowTemplateFromJSON(jsonString: string): {
  success: boolean;
  template?: WorkflowTemplate;
  error?: string;
} {
  try {
    const parsed = JSON.parse(jsonString);
    if (!parsed || typeof parsed !== 'object') {
      return { success: false, error: 'O conteúdo fornecido não é um objeto JSON válido.' };
    }

    if (!parsed.title || !Array.isArray(parsed.steps)) {
      return { success: false, error: 'Estrutura de Workflow inválida (faltam campos essenciais como "title" ou "steps").' };
    }

    const now = Date.now();
    const importedTemplate: WorkflowTemplate = {
      ...parsed,
      id: `wf-imported-${now}`,
      version: parsed.version || 1,
      status: 'draft',
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
      steps: (parsed.steps || []).map((s: any, idx: number) => ({
        ...s,
        id: `step-${now}-${idx + 1}`,
      })),
    };

    return { success: true, template: importedTemplate };
  } catch (err: any) {
    return { success: false, error: `Erro ao processar arquivo JSON: ${err.message || 'Formato inválido'}` };
  }
}
