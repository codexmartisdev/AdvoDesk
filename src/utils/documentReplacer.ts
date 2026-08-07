import { Client, FirmSettings } from '../types';

export interface VariableDefinition {
  key: string;
  label: string;
  category: 'Identificação' | 'Contato & Endereço' | 'Trabalho & Previdência' | 'Família & Outros' | 'Geral & Advogado';
  example: string;
  getValue: (client: Client | null, settings?: FirmSettings) => string | null;
}

// Full List of Variables aligned with Client Profile
export const CLIENT_VARIABLES: VariableDefinition[] = [
  // 1. Identificação Pessoal
  {
    key: '{CLIENTE_NOME}',
    label: 'Nome Completo do Cliente',
    category: 'Identificação',
    example: 'Maria da Silva Santos',
    getValue: (c) => c?.name || null,
  },
  {
    key: '{CLIENTE_NOME_SOCIAL}',
    label: 'Nome Social',
    category: 'Identificação',
    example: 'Maria Santos',
    getValue: (c) => c?.socialName || null,
  },
  {
    key: '{CLIENTE_CPF}',
    label: 'CPF do Cliente',
    category: 'Identificação',
    example: '092.483.111-00',
    getValue: (c) => c?.cpf || null,
  },
  {
    key: '{CLIENTE_RG}',
    label: 'Número do RG',
    category: 'Identificação',
    example: '44.123.890-5',
    getValue: (c) => c?.rgNumber || null,
  },
  {
    key: '{CLIENTE_RG_ORGAO_UF_DATA}',
    label: 'Órgão, UF e Data de Emissão do RG',
    category: 'Identificação',
    example: 'SSP/SP emitido em 12/04/2015',
    getValue: (c) => {
      if (!c?.rgIssuer && !c?.rgUf && !c?.rgIssueDate) return null;
      const parts = [];
      if (c.rgIssuer || c.rgUf) parts.push(`${c.rgIssuer || ''}/${c.rgUf || ''}`);
      if (c.rgIssueDate) {
        try {
          const date = new Date(c.rgIssueDate + 'T00:00:00').toLocaleDateString('pt-BR');
          parts.push(`emitido em ${date}`);
        } catch {
          parts.push(`emitido em ${c.rgIssueDate}`);
        }
      }
      return parts.join(' ');
    },
  },
  {
    key: '{CLIENTE_DATA_NASCIMENTO}',
    label: 'Data de Nascimento',
    category: 'Identificação',
    example: '25/07/1968',
    getValue: (c) => {
      if (!c?.birthDate) return null;
      try {
        return new Date(c.birthDate + 'T00:00:00').toLocaleDateString('pt-BR');
      } catch {
        return c.birthDate;
      }
    },
  },
  {
    key: '{CLIENTE_NACIONALIDADE}',
    label: 'Nacionalidade',
    category: 'Identificação',
    example: 'Brasileira',
    getValue: (c) => c?.nationality || 'brasileiro(a)',
  },
  {
    key: '{CLIENTE_NATURALIDADE}',
    label: 'Naturalidade',
    category: 'Identificação',
    example: 'Parnaíba/PI',
    getValue: (c) => c?.birthplace || null,
  },
  {
    key: '{CLIENTE_SEXO}',
    label: 'Sexo / Gênero',
    category: 'Identificação',
    example: 'Feminino',
    getValue: (c) => c?.gender || null,
  },
  {
    key: '{CLIENTE_NOME_MAE}',
    label: 'Nome Completo da Mãe',
    category: 'Identificação',
    example: 'Francisca Maria dos Santos',
    getValue: (c) => c?.motherName || null,
  },
  {
    key: '{CLIENTE_NOME_PAI}',
    label: 'Nome Completo do Pai',
    category: 'Identificação',
    example: 'José Ribeiro dos Santos',
    getValue: (c) => c?.fatherName || null,
  },

  // 2. Família & Estado Civil
  {
    key: '{CLIENTE_ESTADO_CIVIL}',
    label: 'Estado Civil',
    category: 'Família & Outros',
    example: 'Solteiro(a)',
    getValue: (c) => c?.maritalStatus || null,
  },
  {
    key: '{CLIENTE_REGIME_BENS}',
    label: 'Regime de Bens',
    category: 'Família & Outros',
    example: 'Comunhão Parcial de Bens',
    getValue: (c) => c?.propertyRegime || null,
  },
  {
    key: '{CLIENTE_CONJUGE}',
    label: 'Nome do Cônjuge / Companheiro(a)',
    category: 'Família & Outros',
    example: 'Maria de Fátima Costa',
    getValue: (c) => c?.spouseName || null,
  },
  {
    key: '{CLIENTE_COMPOSICAO_FAMILIAR}',
    label: 'Tabela da Composição Familiar',
    category: 'Família & Outros',
    example: 'Tabela com Nome, CPF, Parentesco e Renda dos Dependentes',
    getValue: (c) => {
      if (!c?.familyMembers || c.familyMembers.length === 0) {
        return 'Não possui dependentes cadastrados no grupo familiar.';
      }
      let table = 'COMPOSIÇÃO DO GRUPO FAMILIAR:\n';
      table += '----------------------------------------------------------------------------------\n';
      table += 'NOME | CPF | PARENTESCO | RENDA MENSAL\n';
      table += '----------------------------------------------------------------------------------\n';
      c.familyMembers.forEach((fm) => {
        table += `${fm.name} | CPF: ${fm.cpf || 'N/I'} | Parentesco: ${fm.kinship || 'Dependente'} | Renda: ${fm.income || 'R$ 0,00'}\n`;
      });
      table += '----------------------------------------------------------------------------------';
      return table;
    },
  },

  // 3. Contato & Endereço
  {
    key: '{CLIENTE_TELEFONE_PRINCIPAL}',
    label: 'Telefone Principal',
    category: 'Contato & Endereço',
    example: '(86) 98765-4321',
    getValue: (c) => c?.phone || null,
  },
  {
    key: '{CLIENTE_TELEFONE_SECUNDARIO}',
    label: 'Telefone Secundário / Recado',
    category: 'Contato & Endereço',
    example: '(86) 99988-1122',
    getValue: (c) => c?.phoneSecondary || null,
  },
  {
    key: '{CLIENTE_EMAIL}',
    label: 'E-mail de Contato',
    category: 'Contato & Endereço',
    example: 'maria.santos@email.com',
    getValue: (c) => c?.email || null,
  },
  {
    key: '{CLIENTE_ENDERECO_COMPLETO}',
    label: 'Endereço Residencial Completo',
    category: 'Contato & Endereço',
    example: 'Rua dos Araújos, nº 150, Casa A, Bairro Frei Higino, Parnaíba/PI, CEP 64207-065',
    getValue: (c) => {
      if (!c?.addressStreet && !c?.addressCityUf) return null;
      const parts = [];
      if (c.addressStreet) {
        let streetPart = c.addressStreet;
        if (c.addressNumber) streetPart += `, nº ${c.addressNumber}`;
        if (c.addressComplement) streetPart += `, ${c.addressComplement}`;
        parts.push(streetPart);
      }
      if (c.addressNeighborhood) parts.push(`Bairro ${c.addressNeighborhood}`);
      if (c.addressCityUf) parts.push(c.addressCityUf);
      if (c.addressZip) parts.push(`CEP ${c.addressZip}`);
      if (c.addressZone) parts.push(`(Zona ${c.addressZone})`);
      return parts.join(', ');
    },
  },
  {
    key: '{CLIENTE_LOGRADOURO}',
    label: 'Rua / Logradouro',
    category: 'Contato & Endereço',
    example: 'Rua dos Araújos',
    getValue: (c) => c?.addressStreet || null,
  },
  {
    key: '{CLIENTE_NUMERO}',
    label: 'Número do Endereço',
    category: 'Contato & Endereço',
    example: '150',
    getValue: (c) => c?.addressNumber || null,
  },
  {
    key: '{CLIENTE_COMPLEMENTO}',
    label: 'Complemento do Endereço',
    category: 'Contato & Endereço',
    example: 'Casa A',
    getValue: (c) => c?.addressComplement || null,
  },
  {
    key: '{CLIENTE_BAIRRO}',
    label: 'Bairro',
    category: 'Contato & Endereço',
    example: 'Frei Higino',
    getValue: (c) => c?.addressNeighborhood || null,
  },
  {
    key: '{CLIENTE_CIDADE_UF}',
    label: 'Cidade e UF',
    category: 'Contato & Endereço',
    example: 'Parnaíba/PI',
    getValue: (c) => c?.addressCityUf || null,
  },
  {
    key: '{CLIENTE_CEP}',
    label: 'CEP',
    category: 'Contato & Endereço',
    example: '64207-065',
    getValue: (c) => c?.addressZip || null,
  },
  {
    key: '{CLIENTE_ZONA}',
    label: 'Zona Residencial (Urbana / Rural)',
    category: 'Contato & Endereço',
    example: 'Urbana',
    getValue: (c) => c?.addressZone || null,
  },

  // 4. Profissão e Previdência
  {
    key: '{CLIENTE_PROFISSAO}',
    label: 'Profissão / Ocupação',
    category: 'Trabalho & Previdência',
    example: 'Dona de casa',
    getValue: (c) => c?.occupation || null,
  },
  {
    key: '{CLIENTE_RENDA_MENSAL}',
    label: 'Renda Mensal Declarada',
    category: 'Trabalho & Previdência',
    example: 'R$ 0,00',
    getValue: (c) => c?.monthlyIncome || null,
  },
  {
    key: '{CLIENTE_VINCULO_EMPREGATICIO}',
    label: 'Vínculo Empregatício',
    category: 'Trabalho & Previdência',
    example: 'Desempregado / Autônomo',
    getValue: (c) => c?.employmentStatus || null,
  },
  {
    key: '{CLIENTE_REGIME_CONTRIBUICAO}',
    label: 'Regime de Contribuição INSS',
    category: 'Trabalho & Previdência',
    example: 'Facultativo / Baixa Renda',
    getValue: (c) => c?.inssContributionRegime || null,
  },
  {
    key: '{CLIENTE_NIT}',
    label: 'NIT / PIS / PASEP',
    category: 'Trabalho & Previdência',
    example: '123.45678.90-1',
    getValue: (c) => c?.nitPisPasep || null,
  },
  {
    key: '{CLIENTE_NB}',
    label: 'Número do Benefício (NB)',
    category: 'Trabalho & Previdência',
    example: '87/123.456.789-0',
    getValue: (c) => c?.benefitNumber || null,
  },

  // 5. Variáveis Gerais & Advogado
  {
    key: '{DATA_ATUAL}',
    label: 'Data Atual por Extenso',
    category: 'Geral & Advogado',
    example: '06 de agosto de 2026',
    getValue: () => {
      const now = new Date();
      return now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
    },
  },
  {
    key: '{CIDADE_DATA_EXTENSO}',
    label: 'Cidade e Data Extenso',
    category: 'Geral & Advogado',
    example: 'Parnaíba/PI, 06 de agosto de 2026',
    getValue: (c) => {
      const city = c?.addressCityUf || 'Parnaíba/PI';
      const now = new Date();
      const dateStr = now.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
      return `${city}, ${dateStr}`;
    },
  },
  {
    key: '{ADVOGADO_NOME}',
    label: 'Nome do Advogado',
    category: 'Geral & Advogado',
    example: 'Dr. Francisco Bizerra Neto',
    getValue: (_, s) => s?.lawyerName || 'Dr. Francisco Bizerra Neto',
  },
  {
    key: '{ADVOGADO_OAB}',
    label: 'OAB do Advogado',
    category: 'Geral & Advogado',
    example: 'OAB-PI nº 24.334',
    getValue: (_, s) => s?.oabNumber || 'OAB-PI nº 24.334',
  },
  {
    key: '{NOME_ESCRITORIO}',
    label: 'Nome do Escritório',
    category: 'Geral & Advogado',
    example: 'BIZERRA NETO ADVOCACIA',
    getValue: (_, s) => s?.firmName || 'BIZERRA NETO ADVOCACIA',
  },
];

// Helper to replace all variables in template text with client data
export function replaceVariablesInTemplateText(
  text: string,
  client: Client | null,
  settings?: FirmSettings,
  emptyFieldStrategy: 'omit' | 'placeholder' = 'placeholder',
  customFallbackValue: string = '[Não informado]'
): {
  replacedText: string;
  usedVariables: string[];
  missingVariables: { key: string; label: string }[];
} {
  if (!text) {
    return { replacedText: '', usedVariables: [], missingVariables: [] };
  }

  let result = text;
  const usedVariables: string[] = [];
  const missingVariables: { key: string; label: string }[] = [];

  CLIENT_VARIABLES.forEach((v) => {
    if (result.includes(v.key)) {
      usedVariables.push(v.key);
      const val = v.getValue(client, settings);

      if (val && val.trim().length > 0) {
        result = result.split(v.key).join(val);
      } else {
        missingVariables.push({ key: v.key, label: v.label });

        if (emptyFieldStrategy === 'omit') {
          // Clean replacement: omit variable tag completely
          result = result.split(v.key).join('');
        } else {
          result = result.split(v.key).join(customFallbackValue);
        }
      }
    }
  });

  // Clean double spaces or double commas left by omissions
  if (emptyFieldStrategy === 'omit') {
    result = result
      .replace(/,\s*,/g, ',')
      .replace(/\s{2,}/g, ' ')
      .replace(/\(\s*\)/g, '');
  }

  return {
    replacedText: result,
    usedVariables,
    missingVariables,
  };
}
