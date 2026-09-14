import { BpcCaseItem } from '../types/bpc';

export interface BpcDocumentVariableDefinition {
  key: string;
  label: string;
  category: 'BPC / Caso';
  example: string;
  getValue: (bpcCase: BpcCaseItem | null) => string | null;
}

const formatDate = (value?: string) => {
  if (!value) return null;
  try {
    return new Date(`${value}T00:00:00`).toLocaleDateString('pt-BR');
  } catch {
    return value;
  }
};

export const BPC_DOCUMENT_VARIABLES: BpcDocumentVariableDefinition[] = [
  {
    key: '{BPC_MODALIDADE}',
    label: 'Modalidade do BPC',
    category: 'BPC / Caso',
    example: 'BPC Pessoa com Deficiência',
    getValue: (item) => item ? (item.modality === 'pcd' ? 'BPC Pessoa com Deficiência' : 'BPC Idoso') : null,
  },
  {
    key: '{BPC_STATUS}',
    label: 'Status atual do caso BPC',
    category: 'BPC / Caso',
    example: 'Protocolado Meu INSS',
    getValue: (item) => item?.status || null,
  },
  {
    key: '{BPC_NUMERO_CASO}',
    label: 'Número interno do caso BPC',
    category: 'BPC / Caso',
    example: 'BPC-2026-001',
    getValue: (item) => item?.caseNumber || null,
  },
  {
    key: '{BPC_PROTOCOLO}',
    label: 'Número do protocolo / requerimento',
    category: 'BPC / Caso',
    example: '1234567890',
    getValue: (item) => item?.protocolNumber || null,
  },
  {
    key: '{BPC_DER}',
    label: 'Data de Entrada do Requerimento (DER)',
    category: 'BPC / Caso',
    example: '14/09/2026',
    getValue: (item) => formatDate(item?.derDate),
  },
  {
    key: '{BPC_NIS}',
    label: 'NIS do requerente',
    category: 'BPC / Caso',
    example: '12345678901',
    getValue: (item) => item?.nisNumber || null,
  },
  {
    key: '{BPC_CADUNICO_STATUS}',
    label: 'Situação do CadÚnico',
    category: 'BPC / Caso',
    example: 'Atualizado',
    getValue: (item) => item?.cadUnicoStatus || null,
  },
  {
    key: '{BPC_PERICIA_DATA}',
    label: 'Data da perícia médica',
    category: 'BPC / Caso',
    example: '20/10/2026',
    getValue: (item) => formatDate(item?.periciaDate),
  },
  {
    key: '{BPC_AVALIACAO_SOCIAL_DATA}',
    label: 'Data da avaliação social',
    category: 'BPC / Caso',
    example: '22/10/2026',
    getValue: (item) => formatDate(item?.avaliacaoSocialDate),
  },
  {
    key: '{BPC_EXIGENCIA_PRAZO}',
    label: 'Prazo atual de exigência',
    category: 'BPC / Caso',
    example: '30/09/2026',
    getValue: (item) => formatDate(item?.exigenciaDeadline),
  },
  {
    key: '{BPC_CID}',
    label: 'CID principal',
    category: 'BPC / Caso',
    example: 'F84.0',
    getValue: (item) => item?.cidPrincipal || null,
  },
  {
    key: '{BPC_OBSERVACOES}',
    label: 'Observações do caso BPC',
    category: 'BPC / Caso',
    example: 'Observações registradas no acompanhamento do caso.',
    getValue: (item) => item?.observacoes || null,
  },
];

export interface BpcReplacementAnalysis {
  replacedText: string;
  missingVariables: BpcDocumentVariableDefinition[];
  usedVariables: BpcDocumentVariableDefinition[];
}

export function replaceBpcVariablesInText(
  text: string,
  bpcCase: BpcCaseItem | null,
  placeholder = '[Não informado]'
): BpcReplacementAnalysis {
  let replacedText = text;
  const missingVariables: BpcDocumentVariableDefinition[] = [];
  const usedVariables: BpcDocumentVariableDefinition[] = [];

  BPC_DOCUMENT_VARIABLES.forEach((definition) => {
    if (!replacedText.includes(definition.key)) return;

    usedVariables.push(definition);
    const value = definition.getValue(bpcCase)?.trim();
    if (!value) missingVariables.push(definition);

    replacedText = replacedText.split(definition.key).join(value || placeholder);
  });

  return { replacedText, missingVariables, usedVariables };
}
