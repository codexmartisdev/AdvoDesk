import { LegalCase } from '../types';

export interface CaseDocumentVariableDefinition {
  key: string;
  label: string;
  category: 'Caso Geral';
  example: string;
  getValue: (legalCase: LegalCase | null) => string | null;
}

const formatDate = (value?: string) => {
  if (!value) return null;
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

export const CASE_DOCUMENT_VARIABLES: CaseDocumentVariableDefinition[] = [
  { key: '{CASO_NUMERO}', label: 'Número interno do caso', category: 'Caso Geral', example: 'CASO-4F81A2C0', getValue: (item) => item?.caseNumber || null },
  { key: '{CASO_PROCESSO}', label: 'Número do processo / protocolo', category: 'Caso Geral', example: '5001234-45.2026.4.04.7102', getValue: (item) => item?.processNumber || null },
  { key: '{CASO_TITULO}', label: 'Título / objeto do caso', category: 'Caso Geral', example: 'Aposentadoria por idade', getValue: (item) => item?.title || null },
  { key: '{CASO_CATEGORIA}', label: 'Área jurídica', category: 'Caso Geral', example: 'Previdenciário', getValue: (item) => item?.category || null },
  { key: '{CASO_STATUS}', label: 'Situação atual do caso', category: 'Caso Geral', example: 'Em análise', getValue: (item) => item?.statusLabel || null },
  { key: '{CASO_ATUACAO}', label: 'Tipo de atuação', category: 'Caso Geral', example: 'Judicial', getValue: (item) => item?.actingType || item?.instance || null },
  { key: '{CASO_ORGAO}', label: 'Órgão / Vara responsável', category: 'Caso Geral', example: '2ª Vara Federal de Santa Maria', getValue: (item) => item?.agencyOrCourt || item?.court || null },
  { key: '{CASO_DATA_ABERTURA}', label: 'Data de abertura do caso', category: 'Caso Geral', example: '14/09/2026', getValue: (item) => formatDate(item?.openingDate || item?.openedAt) },
  { key: '{CASO_DATA_PROTOCOLO}', label: 'Data do protocolo / ajuizamento', category: 'Caso Geral', example: '16/09/2026', getValue: (item) => formatDate(item?.filingDate || item?.administrativeData?.protocolDate || item?.judicialData?.filingDate) },
  { key: '{CASO_PROXIMO_PRAZO}', label: 'Data do próximo prazo', category: 'Caso Geral', example: '25/09/2026', getValue: (item) => formatDate(item?.nextDeadlineDate) },
  { key: '{CASO_TIPO_PROXIMO_PRAZO}', label: 'Tipo do próximo prazo', category: 'Caso Geral', example: 'Manifestação', getValue: (item) => item?.nextDeadlineType || null },
  { key: '{CASO_FATOS}', label: 'Fatos / narrativa do caso', category: 'Caso Geral', example: 'Resumo dos fatos relevantes registrados na ficha.', getValue: (item) => item?.caseFacts || null },
  { key: '{CASO_OBSERVACOES}', label: 'Observações rápidas do caso', category: 'Caso Geral', example: 'Aguardar retorno do cliente.', getValue: (item) => item?.quickNotes || null },
];

export interface CaseReplacementAnalysis {
  replacedText: string;
  missingVariables: CaseDocumentVariableDefinition[];
  usedVariables: CaseDocumentVariableDefinition[];
}

export function replaceCaseVariablesInText(
  text: string,
  legalCase: LegalCase | null,
  placeholder = '[Não informado]'
): CaseReplacementAnalysis {
  let replacedText = text;
  const missingVariables: CaseDocumentVariableDefinition[] = [];
  const usedVariables: CaseDocumentVariableDefinition[] = [];

  CASE_DOCUMENT_VARIABLES.forEach((definition) => {
    if (!replacedText.includes(definition.key)) return;
    usedVariables.push(definition);
    const value = definition.getValue(legalCase)?.trim();
    if (!value) missingVariables.push(definition);
    replacedText = replacedText.split(definition.key).join(value || placeholder);
  });

  return { replacedText, missingVariables, usedVariables };
}
