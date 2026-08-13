import { Client, LegalCase, DocumentTemplate, ScheduledEvent } from '../types';
import letterheadLogo from '../assets/images/letterhead_background_1785985087731.jpg';

export const LOGO_IMAGE_URL = letterheadLogo;

export const USER_AVATAR_URL = 'https://lh3.googleusercontent.com/aida-public/AB6AXuBNfnNa7wyDGqRRvFDh968mhy6P8v8HOaMqFvz2dtr1YDtQgw_-NJaFJH4NCYmU8sEu62L1r8ee1gOuEXYrjPUgUmrLfj7MDZRwEVE0qQ8oJVyS-EB9PyIufUtutFE2-SXNaszPNFgLylY4H0T1VmEgUgheFGDtYiQKfwsyJBoL0igBtO_kP0LhnCvy0pU8uYCSsejtFR-yi6J-3VzRNL1CH-XBkpLDCtaOGcPViYvJ-qrjobOMX1sc6g';

export const INITIAL_CLIENTS: Client[] = [];

export const INITIAL_CASES: LegalCase[] = [];

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

export const SCHEDULED_EVENTS: ScheduledEvent[] = [];
