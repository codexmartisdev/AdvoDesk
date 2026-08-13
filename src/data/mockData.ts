import { Client, LegalCase, DocumentTemplate, ScheduledEvent } from '../types';
import letterheadLogo from '../assets/images/letterhead_background_1785985087731.jpg';

export const LOGO_IMAGE_URL = letterheadLogo;

export const USER_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNfnNa7wyDGqRRvFDh968mhy6P8v8HOaMqFvz2dtr1YDtQgw_-NJaFJH4NCYmU8sEu62L1r8ee1gOuEXYrjPUgUmrLfj7MDZRwEVE0qQ8oJVyS-EB9PyIufUtutFE2-SXNaszPNFgLylY4H0T1VmEgUgheFGDtYiQKfwsyJBoL0igBtO_kP0LhnCvy0pU8uYCSsejtFR-yi6J-3VzRNL1CH-XBkpLDCtaOGcPViYvJ-qrjobOMX1sc6g';

export const INITIAL_CLIENTS: Client[] = [
  {
    id: 'c1',
    code: '092.483.11-X',
    name: 'Maria da Silva Santos',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDWrP_F_kmkcnUPKhT9jhKTLO_bNkdDhvI1wropqUH_tASv0RwI-nhM5wig_pnQ7TfYGlFnLz4TPooO-aG_DgNJldn-6AJBILydLi9DKalZVPRpWNUj9kYQMBMkyJOqKgEHp9N7TC-V23vzbbsPOagndTEuYTdWOgxMx_9gU3HfkzTTAPVYJ4u64-kjQr05yVFXcrzU_pIWkJkpWOWEgsMfLaXCsMtviQN99pIfzz727Jderq_DO30eLQ',
    socialName: '',
    typePill: 'BPC Loas',
    status: 'Pendente',
    updatedAt: 'Atualizado há 2h',
    cpf: '092.483.111-00',
    rgNumber: '44.123.890-5',
    rgIssuer: 'SSP',
    rgUf: 'SP',
    rgIssueDate: '2015-04-12',
    birthDate: '1968-07-25',
    nationality: 'Brasileira',
    birthplace: 'Parnaíba/PI',
    gender: 'Feminino',
    motherName: 'Francisca Maria dos Santos',
    fatherName: 'José Ribeiro dos Santos',
    meuInssPassword: 'Maria@Inss2025',
    maritalStatus: 'Solteira',
    propertyRegime: 'Nenhum',
    spouseName: '',
    familyMembers: [
      { id: 'fm1', name: 'Lucas Gabriel dos Santos', cpf: '499.123.456-77', birthDate: '2012-03-15', kinship: 'Filho(a)', income: 'R$ 0,00' }
    ],
    email: 'maria.santos@email.com',
    phone: '(86) 98765-4321',
    phoneSecondary: '(86) 99988-1122',
    addressStreet: 'Rua dos Araújos',
    addressNumber: '150',
    addressComplement: 'Casa A',
    addressNeighborhood: 'Frei Higino',
    addressCityUf: 'Parnaíba/PI',
    addressZip: '64207-065',
    addressZone: 'Urbana',
    occupation: 'Dona de casa',
    monthlyIncome: 'R$ 0,00',
    employmentStatus: 'Desempregado',
    inssContributionRegime: 'Facultativo',
    nitPisPasep: '123.45678.90-1',
    benefitNumber: '87/123.456.789-0',
    documentChecklist: {
      rgCpf: true,
      comprovanteResidencia: true,
      carteiraTrabalhoCnis: true,
      comprovantesRendaFamilia: true,
      laudosMedicos: true,
      comprovacaoRural: false,
    },
    bankName: 'Caixa Econômica Federal',
    bankAgency: '0032',
    bankAccount: '00012345-6',
    pixKey: '092.483.111-00',
    casesCount: 1,
  },
  {
    id: 'c2',
    code: '145.882.90-Y',
    name: 'João Oliveira Costa',
    typePill: 'Auxílio Doença',
    status: 'Ativo',
    updatedAt: 'Atualizado há 1 dia',
    cpf: '123.456.789-00',
    rgNumber: '22.456.789-1',
    rgIssuer: 'SSP',
    rgUf: 'PI',
    rgIssueDate: '2010-09-05',
    birthDate: '1980-03-14',
    nationality: 'Brasileiro',
    birthplace: 'Teresina/PI',
    gender: 'Masculino',
    motherName: 'Antônia Oliveira Costa',
    fatherName: 'Raimundo Costa',
    maritalStatus: 'Casado(a)',
    propertyRegime: 'Comunhão Parcial de Bens',
    spouseName: 'Maria de Fátima Costa',
    familyMembers: [
      { id: 'fm2', name: 'Maria de Fátima Costa', cpf: '321.654.987-11', birthDate: '1982-11-20', kinship: 'Cônjuge', income: 'R$ 1.412,00' }
    ],
    email: 'joao.costa@email.com',
    phone: '(86) 97654-3210',
    addressStreet: 'Av. São Sebastião',
    addressNumber: '2400',
    addressNeighborhood: 'Fátima',
    addressCityUf: 'Parnaíba/PI',
    addressZip: '64202-000',
    addressZone: 'Urbana',
    occupation: 'Pedreiro',
    monthlyIncome: 'R$ 2.500,00',
    employmentStatus: 'CLT',
    inssContributionRegime: 'Empregado',
    nitPisPasep: '201.98765.43-2',
    benefitNumber: '31/987.654.321-9',
    documentChecklist: {
      rgCpf: true,
      comprovanteResidencia: true,
      carteiraTrabalhoCnis: true,
      comprovantesRendaFamilia: false,
      laudosMedicos: true,
      comprovacaoRural: false,
    },
    bankName: 'Banco do Brasil',
    bankAgency: '0129-8',
    bankAccount: '12345-X',
    pixKey: 'joao.costa@email.com',
    casesCount: 2,
  },
  {
    id: 'c3',
    code: '412.001.33-Z',
    name: 'Carlos Mendes Junior',
    avatarUrl: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDd7GUJId0pdTC0VayTIFlcK2cE9vmKf6QO8NlfcKCpnx2vTsli4-azJ3lFi32FOxbtgYkh0kVX9t6V-fhsQhVmxMFSxTqSdaPtTCMgjaWrhN6iBT5TVTdj1wI97U_BQCyczeBs1CwZPGxS6anb-gYPyUk1F2lgmH9PF9Sx8KQHtU9gyUGdEUHf0dTEHZaG0tHBBevJiSD-FY9ynmFvyIDyhqUi8OqNwXyb5IHlXb8hoE0h2dlWaOOyXg',
    typePill: 'Aposentadoria',
    status: 'Rascunho',
    updatedAt: 'Atualizado há 3 dias',
    cpf: '412.001.333-88',
    email: 'carlos.mendes@email.com',
    phone: '(11) 96543-2109',
    casesCount: 1,
  },
  {
    id: 'c4',
    code: '882.109.45-W',
    name: 'Ana Paula Fernandes',
    typePill: 'BPC Loas',
    status: 'Ativo',
    updatedAt: 'Atualizado há 1 sem',
    cpf: '882.109.454-12',
    email: 'ana.paula@email.com',
    phone: '(11) 95432-1098',
    casesCount: 1,
  },
];

export const INITIAL_CASES: LegalCase[] = [
  {
    id: 'case-2023-8941',
    caseNumber: 'Caso #2023-8941',
    processNumber: '1000543-21.2022.5.02.0015',
    court: 'Tribunal de Justiça de São Paulo',
    agencyOrCourt: '3ª Vara Cível de São Paulo',
    category: 'Previdenciário',
    benefitType: 'BPC Loas',
    instance: 'Judicial 1ª Instância',
    title: 'Ação de Concessão de Benefício Assistencial (BPC LOAS)',
    statusLabel: 'Em Análise',
    finalResult: 'Em Andamento',
    concededValue: 'Aguardando Sentença (Est. R$ 1.412,00/mês)',
    clientId: 'c2',
    clientName: 'João Oliveira Costa',
    clientCpf: '123.456.789-00',
    filingDate: '2023-05-12',
    lastMovementDate: '2024-09-10',
    nextDeadlineDate: '2024-10-28',
    nextDeadlineType: 'Perícia Médica Judicial',
    agreedFees: '30% sobre as parcelas vencidas (retroativos)',
    paymentStatus: 'Pendente',
    quickNotes: 'Cliente agendou laudo médico atualizado para a perícia. Parente acompanhante confirmado.',
    currentStepIndex: 2,
    steps: [
      { label: 'Documentação', completed: true, active: false },
      { label: 'Protocolado', completed: true, active: false },
      { label: 'Perícia', completed: false, active: true },
      { label: 'Audiência', completed: false, active: false },
      { label: 'Recurso', completed: false, active: false },
    ],
    documents: [
      {
        id: 'doc-1',
        title: 'Petição Inicial.pdf',
        fileSize: '2.4 MB',
        uploadedAt: 'Enviado em 12/05/2023',
        type: 'pdf',
        tags: ['Principal', 'Assinado'],
      },
      {
        id: 'doc-2',
        title: 'Procuração_Assinada.docx',
        fileSize: '45 KB',
        uploadedAt: 'Enviado em 10/05/2023',
        type: 'docx',
        tags: ['Anexo'],
      },
      {
        id: 'doc-3',
        title: 'Comprovante_Residencia.jpg',
        fileSize: '1.2 MB',
        uploadedAt: 'Enviado em 10/05/2023',
        type: 'image',
        tags: ['Prova'],
      },
    ],
    deadlinesCount: 2,
    notes: [
      'Análise de contestação concluída em 14/05/2023.',
      'Aguardando laudo do perito judicial designado pela 3ª Vara Cível.',
    ],
    costs: [
      { description: 'Taxa Judiciária Inicial', value: 'R$ 350,00', date: '10/05/2023', paid: true },
      { description: 'Honorários de Perito', value: 'R$ 1.200,00', date: '25/05/2023', paid: false },
    ],
  },
  {
    id: 'case-2024-1022',
    caseNumber: 'Caso #2024-1022',
    processNumber: '5001234-88.2024.4.01.8000',
    court: 'Instituto Nacional do Seguro Social',
    agencyOrCourt: 'APS Parnaíba / PI',
    category: 'Previdenciário',
    benefitType: 'Auxílio Doença',
    instance: 'Administrativo INSS',
    title: 'Requerimento Administrativo de Auxílio por Incapacidade Temporária',
    statusLabel: 'Exigência',
    finalResult: 'Em Andamento',
    concededValue: 'R$ 2.200,00/mês (estimado)',
    clientId: 'c1',
    clientName: 'Maria da Silva Santos',
    clientCpf: '092.483.111-00',
    filingDate: '2024-02-01',
    lastMovementDate: '2024-10-01',
    nextDeadlineDate: '2024-10-24',
    nextDeadlineType: 'Retorno de Exigência',
    agreedFees: '3 primeiros benefícios + 20%',
    paymentStatus: 'Em Andamento',
    quickNotes: 'Aguardando o cliente trazer o atestado médico atualizado do posto de saúde com CID.',
    currentStepIndex: 1,
    steps: [
      { label: 'Documentação', completed: true, active: false },
      { label: 'Protocolado', completed: false, active: true },
      { label: 'Perícia', completed: false, active: false },
      { label: 'Audiência', completed: false, active: false },
      { label: 'Recurso', completed: false, active: false },
    ],
    documents: [
      {
        id: 'doc-101',
        title: 'Requerimento_DER_INSS.pdf',
        fileSize: '1.8 MB',
        uploadedAt: 'Enviado em 02/02/2024',
        type: 'pdf',
        tags: ['Principal'],
      },
    ],
    deadlinesCount: 1,
    notes: ['Apresentação de réplica e cumprimento de exigência cadastral.'],
    costs: [
      { description: 'Distribuição de Ação', value: 'R$ 280,00', date: '01/02/2024', paid: true },
    ],
  },
];

export const TEMPLATES: DocumentTemplate[] = [
  {
    id: 'tpl-procuracao-previdenciaria',
    title: 'Procuração Ad Judicia et Extra - Atuação Previdenciária e Assistencial Completa',
    badge: 'Essencial',
    icon: 'assignment_ind',
    category: 'Representação',
    format: 'Procuração / Declaração',
    description: 'Procuração completa com poderes específicos para atuação no INSS, CRPS, Perícia Médica, Justiça Federal, BPC/LOAS e levantamento de RPV/Precatórios.',
    contentPattern: `INSTRUMENTO PARTICULAR DE PROCURAÇÃO AD JUDICIA ET EXTRA

COM PODERES ESPECÍFICOS PARA ATUAÇÃO PREVIDENCIÁRIA E ASSISTENCIAL

OUTORGANTE: {CLIENTE_NOME}, {CLIENTE_NACIONALIDADE}, {CLIENTE_ESTADO_CIVIL}, {CLIENTE_PROFISSAO}, nascido(a) em {CLIENTE_DATA_NASCIMENTO}, filho(a) de {CLIENTE_NOME_MAE} e {CLIENTE_NOME_PAI}, portador(a) do documento de identidade nº {CLIENTE_RG} ({CLIENTE_RG_ORGAO_UF_DATA}), inscrito(a) no CPF sob o nº {CLIENTE_CPF}, inscrito(a) no NIT/PIS/PASEP sob o nº {CLIENTE_NIT}, residente e domiciliado(a) na {CLIENTE_ENDERECO_COMPLETO}, telefone {CLIENTE_TELEFONE_PRINCIPAL}, e-mail {CLIENTE_EMAIL}.

OUTORGADO: {ADVOGADO_NOME}, brasileiro, solteiro, advogado, inscrito no quadro da Ordem dos Advogados do Brasil, Seccional do Piauí, sob o nº {ADVOGADO_OAB}, com endereço profissional integrante da banca {NOME_ESCRITORIO}.

O(A) OUTORGANTE nomeia e constitui o advogado acima qualificado como seu bastante procurador, conferindo-lhe os poderes adiante especificados para a defesa de seus direitos e interesses previdenciários, assistenciais, administrativos e judiciais.

## 1. OBJETO DO MANDATO
O presente mandato tem por objeto a representação do(a) OUTORGANTE em matérias relacionadas:
a) ao Regime Geral de Previdência Social – RGPS;
b) aos benefícios e serviços administrados pelo Instituto Nacional do Seguro Social – INSS;
c) ao Benefício de Prestação Continuada – BPC, previsto na Lei nº 8.742/1993;
d) ao reconhecimento, averbação, regularização ou retificação de vínculos, remunerações, contribuições, períodos de atividade rural, especial, urbana, militar, estatutária ou exercida em regime próprio;
e) à concessão, restabelecimento, manutenção, revisão, transformação, acumulação, cessação, suspensão, reativação ou cobrança de benefício previdenciário ou assistencial;
f) à defesa dos interesses do(a) OUTORGANTE no processo administrativo ou judicial relacionado ao benefício, serviço, requerimento, benefício NB nº {CLIENTE_NB}.

A ausência de indicação de número de benefício, protocolo ou processo não restringirá os poderes gerais conferidos neste instrumento para atuação em matéria previdenciária ou assistencial, salvo se houver limitação expressa no campo próprio ao final desta procuração.

## 2. PODERES GERAIS PARA O FORO
O(A) OUTORGANTE confere ao OUTORGADO os poderes da cláusula ad judicia et extra, para representá-lo(a) perante quaisquer juízos, tribunais, turmas recursais, turmas de uniformização, órgãos administrativos e instâncias competentes, podendo, para tanto:
a) propor ações, incidentes processuais, reclamações, mandados de segurança, ações rescisórias e demais medidas judiciais adequadas;
b) apresentar petições iniciais, emendas, manifestações, impugnações, réplicas, memoriais, razões e contrarrazões;
c) contestar, reconvir, excepcionar, impugnar e defender o(a) OUTORGANTE em procedimentos nos quais figure no polo passivo ou como interessado(a);
d) requerer tutelas provisórias de urgência ou de evidência e postular seu cumprimento;
e) produzir, juntar, requerer e impugnar provas documentais, periciais, testemunhais, técnicas, médicas, sociais, contábeis e socioeconômicas;
f) formular quesitos, indicar assistentes técnicos, impugnar laudos, requerer esclarecimentos e solicitar a realização de nova perícia ou complementação pericial;
g) participar de audiências, sessões de julgamento, conciliações, mediações e sustentações orais;
h) interpor, acompanhar e desistir de recursos, reclamações, incidentes de uniformização, pedidos de reconsideração e demais meios de impugnação admitidos em lei;
i) requerer certidões, cópias, desarquivamentos, habilitações, vistas e acesso integral aos autos físicos ou eletrônicos;
j) requerer implantação, restabelecimento ou revisão de benefício concedido judicialmente;
k) promover liquidação, cumprimento provisório ou definitivo de sentença e execução de obrigação de fazer ou de pagar;
l) apresentar, conferir, concordar, discordar e impugnar cálculos, inclusive cálculos de atrasados, renda mensal inicial, renda mensal atual, juros, correção monetária e honorários;
m) requerer expedição de alvarás, requisições de pequeno valor (RPV), precatórios, ofícios requisitórios e ordens de implantação;
n) praticar todos os demais atos processuais necessários à preservação e à defesa dos direitos e interesses do(a) OUTORGANTE, em qualquer fase processual, inclusive na fase recursal e no cumprimento de sentença.

## 3. PODERES ESPECIAIS PREVISTOS NO ART. 105 DO CPC
De maneira específica e expressa, o(a) OUTORGANTE confere ao OUTORGADO poderes para:
a) receber citação;
b) confessar;
c) reconhecer a procedência do pedido;
d) transigir e celebrar acordos judiciais ou extrajudiciais;
e) desistir de ações, recursos, incidentes, pedidos ou medidas processuais;
f) renunciar ao direito sobre o qual se funda a ação;
g) receber valores e dar quitação;
h) firmar compromisso;
i) assinar declaração de hipossuficiência econômica;
j) concordar com propostas de acordo apresentadas pelo INSS ou por outro órgão público;
k) requerer e aceitar a renúncia ao valor excedente ao limite de competência dos Juizados Especiais Federais, quando juridicamente necessária à tramitação da demanda;
l) reconhecer cálculos, valores, períodos contributivos, datas de início, datas de cessação e demais elementos relacionados ao objeto do processo ou procedimento administrativo.

Os poderes previstos nesta cláusula são conferidos expressamente para os fins exigidos pelo art. 105 do Código de Processo Civil.

## 4. PODERES PARA RECEBIMENTO DE VALORES JUDICIAIS
O(A) OUTORGANTE confere ao OUTORGADO poderes expressos para:
a) requerer e promover o levantamento de valores depositados judicialmente;
b) receber valores decorrentes de alvarás judiciais, requisições de pequeno valor, precatórios, depósitos, restituições e condenações relacionadas ao objeto do mandato;
c) assinar recibos, termos de levantamento e documentos necessários à liberação dos valores;
d) fornecer dados bancários autorizados para transferência dos créditos;
e) dar quitação dos valores efetivamente recebidos;
f) requerer destaque, reserva ou pagamento direto dos honorários contratuais, quando houver contrato escrito e quando juridicamente admitido;
g) receber os honorários sucumbenciais pertencentes ao advogado, nos termos da legislação aplicável.

## 5. PODERES PERANTE O INSS E DEMAIS ÓRGÃOS ADMINISTRATIVOS
O(A) OUTORGANTE confere ao OUTORGADO poderes para representá-lo(a) perante o Instituto Nacional do Seguro Social – INSS, Conselho de Recursos da Previdência Social – CRPS, Ministério da Previdência Social, Perícia Médica Federal e demais órgãos públicos e privados.

Para o desempenho da representação administrativa, poderá o OUTORGADO:
a) requerer concessão, restabelecimento, manutenção, reativação, revisão, transformação ou cessação de benefícios e serviços;
b) formular requerimentos administrativos, pedidos de revisão, recursos, incidentes, reclamações e pedidos de reconsideração;
c) apresentar razões e contrarrazões recursais;
d) cumprir exigências, apresentar documentos, justificativas, memoriais, cálculos e manifestações;
e) requerer reafirmação da data de entrada do requerimento, quando juridicamente cabível;
f) requerer acerto, inclusão, exclusão ou retificação de vínculos, remunerações, contribuições e registros no CNIS;
g) requerer averbação de tempo de contribuição, emissão, revisão ou cancelamento de Certidão de Tempo de Contribuição – CTC;
h) requerer reconhecimento de atividade rural, especial, urbana, autônoma, doméstica ou facultativa;
i) apresentar e solicitar retificação de PPP, laudos técnicos, formulários e certidões laborais;
j) agendar, reagendar ou acompanhar perícia médica, avaliação biopsicossocial, avaliação social e reabilitação profissional;
k) consultar, solicitar, receber e extrair CNIS, carta de concessão, memória de cálculo, histórico de créditos e extratos de pagamento.

## 6. ACESSO A INFORMAÇÕES E DOCUMENTOS
O(A) OUTORGANTE autoriza expressamente o OUTORGADO a acessar, consultar, solicitar, receber, armazenar, reproduzir e utilizar, exclusivamente para execução deste mandato, todos os dados cadastrais, previdenciários, laudos médicos, prontuários e documentos funcionais.

## 7. ASSINATURA DE DECLARAÇÃO DE HIPOSSUFICIÊNCIA E GRATUIDADE DA JUSTIÇA
O(A) OUTORGANTE confere ao OUTORGADO poder específico para assinar declaração de hipossuficiência econômica e requerer os benefícios da gratuidade da justiça.

## 8. SUBSTABELECIMENTO
O(A) OUTORGANTE autoriza o OUTORGADO a substabelecer, no todo ou em parte, os poderes recebidos, com ou sem reserva de iguais poderes.

## 9. VIGÊNCIA E EXTINÇÃO
O presente mandato é outorgado por prazo indeterminado e permanecerá válido durante toda a tramitação administrativa e judicial.

## 10. FUNDAMENTAÇÃO FORMAL DO INSTRUMENTO
O presente instrumento é outorgado com fundamento nos arts. 104 e 105 do CPC, arts. 653 e seguintes do Código Civil, Lei nº 8.906/1994 (Estatuto da OAB) e Instrução Normativa PRES/INSS nº 128/2022 (Anexo XXII).

{CIDADE_DATA_EXTENSO}`,
  },
];

export const SCHEDULED_EVENTS: ScheduledEvent[] = [
  {
    id: 'ev-1',
    dateStr: '07 AGO',
    fullDate: '2026-08-07',
    time: '14:00',
    type: 'Prazos Fatais (Recursos)',
    badgeColor: 'recurso',
    title: 'Prazo de Recurso Ordinário - Apelação Cível',
    eventType: 'Prazo de Recurso',
    processNumber: '0012345-67.2023.8.26.0100',
    caseId: 'case-2023-8941',
    clientName: 'João Silva e Oliveira',
    benefitType: 'Auxílio-Doença / Invalidez',
    location: '1ª Vara Cível / PJe',
    status: 'Pendente',
    priorityLevel: 'urgente',
    notes: 'Juntar laudo médico complementar assinado pelo ortopedista.',
    reminderDays: 2,
  },
  {
    id: 'ev-2',
    dateStr: '08 AGO',
    fullDate: '2026-08-08',
    time: '16:30',
    type: 'Audiências & Perícias',
    badgeColor: 'pericia',
    title: 'Perícia Médica Presencial - INSS',
    eventType: 'Perícia Médica',
    processNumber: '1000543-21.2022.5.02.0015',
    caseId: 'case-2024-1022',
    clientName: 'Maria Francisca dos Santos',
    benefitType: 'BPC/LOAS Deficiente',
    location: 'APS Parnaíba - Sala 3 (Rua Silva, 120)',
    status: 'Pendente',
    priorityLevel: 'urgente',
    notes: 'Orientar a cliente a levar RG original e receitas atualizadas dos últimos 6 meses.',
    reminderDays: 3,
  },
  {
    id: 'ev-3',
    dateStr: '11 AGO',
    fullDate: '2026-08-11',
    time: '10:00',
    type: 'Reuniões Internas',
    badgeColor: 'reuniao',
    title: 'Reunião com Cliente - Assinatura de Procuração',
    eventType: 'Reunião com Cliente',
    clientName: 'Antônio Carlos Mendes',
    benefitType: 'Aposentadoria por Idade Rural',
    location: 'Escritório Central - Sala VIP 1',
    status: 'Pendente',
    priorityLevel: 'atencao',
    notes: 'Conferir comprovantes de residência e autodeclaração rural.',
    reminderDays: 1,
  },
  {
    id: 'ev-4',
    dateStr: '15 AGO',
    fullDate: '2026-08-15',
    time: '11:00',
    type: 'Prazos Fatais (Recursos)',
    badgeColor: 'recurso',
    title: 'Retorno de Exigência INSS - Envio de CNIS',
    eventType: 'Retorno de Exigência',
    processNumber: '5003412-88.2024.8.26.0000',
    clientName: 'Valéria Rossi',
    benefitType: 'Aposentadoria por Tempo de Contribuição',
    location: 'Meu INSS / Digital',
    status: 'Pendente',
    priorityLevel: 'normal',
    notes: 'Anexar carteira de trabalho digitalizada páginas 12 a 18.',
    reminderDays: 5,
  },
  {
    id: 'ev-5',
    dateStr: '18 AGO',
    fullDate: '2026-08-18',
    time: '09:00',
    type: 'Audiências & Perícias',
    badgeColor: 'pericia',
    title: 'Perícia Social Domiciliar',
    eventType: 'Perícia Social',
    processNumber: '4001299-11.2023.8.26.0002',
    clientName: 'Carlos Mendes',
    benefitType: 'BPC/LOAS Idoso',
    location: 'Residência do requerente',
    status: 'Concluído',
    priorityLevel: 'normal',
    notes: 'Assistente social realizou a visita técnica. Aguardando laudo no sistema.',
    reminderDays: 1,
  },
];
