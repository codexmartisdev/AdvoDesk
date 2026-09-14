import { DocumentTemplate } from '../types';
import { TEMPLATES as LEGACY_TEMPLATES } from './mockData';

export const ADVODESK_DOCUMENT_LIBRARY_VERSION = 2;
export const ADVODESK_BASE_ORIGIN_LABEL = 'Modelo base AdvoDesk';

export interface AdvodeskBaseTemplateDefinition {
  libraryKey: string;
  libraryVersion: number;
  legacyTemplateIds: string[];
  template: Omit<DocumentTemplate, 'id'>;
}

const LEGACY_LIBRARY_KEYS: Record<string, string> = {
  'tpl-procuracao-previdenciaria': 'previdenciario-procuracao-completa',
};

const toBaseDefinition = (template: DocumentTemplate): AdvodeskBaseTemplateDefinition => {
  const { id, ...templateWithoutId } = template;
  return {
    libraryKey: LEGACY_LIBRARY_KEYS[id] || `legacy-${id}`,
    libraryVersion: 1,
    legacyTemplateIds: [id],
    template: templateWithoutId,
  };
};

const GENERAL_OFFICE_TEMPLATES: AdvodeskBaseTemplateDefinition[] = [
  {
    libraryKey: 'geral-procuracao-ad-judicia-et-extra',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Procuração Ad Judicia et Extra — Geral',
      badge: 'Essencial',
      icon: 'assignment_ind',
      category: 'Representação',
      format: 'Procuração',
      description: 'Procuração geral para representação judicial e extrajudicial, com cláusula ad judicia et extra e poderes ordinários de atuação.',
      contentPattern: `INSTRUMENTO PARTICULAR DE PROCURAÇÃO AD JUDICIA ET EXTRA

OUTORGANTE: {CLIENTE_NOME}, {CLIENTE_NACIONALIDADE}, {CLIENTE_ESTADO_CIVIL}, {CLIENTE_PROFISSAO}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, residente e domiciliado(a) em {CLIENTE_ENDERECO_COMPLETO}, telefone {CLIENTE_TELEFONE_PRINCIPAL}, e-mail {CLIENTE_EMAIL}.

OUTORGADO(A): {ADVOGADO_QUALIFICACAO_COMPLETA}.

PODERES

Pelo presente instrumento particular, o(a) OUTORGANTE nomeia e constitui seu(sua) bastante procurador(a) o(a) OUTORGADO(A), conferindo-lhe poderes da cláusula ad judicia et extra para representá-lo(a) judicial e extrajudicialmente, perante quaisquer juízos, tribunais, repartições públicas, autarquias, órgãos administrativos, pessoas jurídicas de direito público ou privado e demais instituições, podendo praticar os atos ordinários necessários à defesa de seus direitos e interesses.

O mandato compreende, entre outros atos compatíveis com os poderes gerais, apresentar requerimentos e petições, acompanhar processos e procedimentos, consultar autos, obter cópias e certidões, produzir e requerer provas, apresentar manifestações, defesas, impugnações, razões e contrarrazões, interpor recursos e acompanhar o feito até decisão final.

Os atos que dependam de poderes especiais por determinação legal somente poderão ser praticados quando estiverem expressamente abrangidos por instrumento próprio ou por cláusula específica adicionada a esta procuração.

SUBSTABELECIMENTO

Fica autorizado o substabelecimento dos poderes ora conferidos, com ou sem reserva, quando necessário ao adequado desempenho do mandato.

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
  {
    libraryKey: 'geral-procuracao-poderes-especificos',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Procuração com Poderes Específicos',
      badge: 'Essencial',
      icon: 'gavel',
      category: 'Representação',
      format: 'Procuração',
      description: 'Procuração com poderes especiais expressos para atos que exigem autorização específica, além dos poderes gerais de foro.',
      contentPattern: `INSTRUMENTO PARTICULAR DE PROCURAÇÃO

OUTORGANTE: {CLIENTE_NOME}, {CLIENTE_NACIONALIDADE}, {CLIENTE_ESTADO_CIVIL}, {CLIENTE_PROFISSAO}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, residente e domiciliado(a) em {CLIENTE_ENDERECO_COMPLETO}.

OUTORGADO(A): {ADVOGADO_QUALIFICACAO_COMPLETA}.

PODERES GERAIS

O(A) OUTORGANTE confere ao(à) OUTORGADO(A) poderes da cláusula ad judicia et extra para representá-lo(a) em juízo ou fora dele, perante órgãos públicos e privados, em qualquer instância ou grau de jurisdição, praticando todos os atos necessários à defesa de seus direitos e interesses.

PODERES ESPECÍFICOS

De forma expressa, o(a) OUTORGANTE confere poderes para receber citação, confessar, reconhecer a procedência do pedido, transigir, celebrar acordos, desistir, renunciar ao direito sobre o qual se funda a ação, receber valores e dar quitação, firmar compromisso, assinar declaração de hipossuficiência econômica e praticar outros atos para os quais a legislação exija poder especial, quando relacionados ao objeto do mandato.

AUTORIZAÇÕES COMPLEMENTARES

O(A) OUTORGADO(A) poderá solicitar documentos, certidões e informações, acessar processos físicos ou eletrônicos, apresentar requerimentos, recursos e manifestações, participar de audiências e sessões, acompanhar perícias e diligências, requerer expedição e levantamento de valores quando juridicamente cabível e praticar os demais atos necessários ao cumprimento do mandato.

SUBSTABELECIMENTO

Fica autorizado o substabelecimento, no todo ou em parte, com ou sem reserva de poderes.

OBSERVAÇÃO OU LIMITAÇÃO ESPECÍFICA DO MANDATO:
[PREENCHER: se houver limitação, finalidade específica ou processo determinado; caso contrário, remover este campo]

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
  {
    libraryKey: 'geral-declaracao-hipossuficiencia',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Declaração de Hipossuficiência Econômica',
      badge: 'Essencial',
      icon: 'description',
      category: 'Declarações',
      format: 'Declaração',
      description: 'Declaração pessoal de insuficiência de recursos para instrução de pedido de gratuidade, sujeita à análise do caso concreto.',
      contentPattern: `DECLARAÇÃO DE HIPOSSUFICIÊNCIA ECONÔMICA

Eu, {CLIENTE_NOME}, {CLIENTE_NACIONALIDADE}, {CLIENTE_ESTADO_CIVIL}, {CLIENTE_PROFISSAO}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, residente e domiciliado(a) em {CLIENTE_ENDERECO_COMPLETO}, DECLARO, sob as penas da lei e para os fins cabíveis, que não disponho de recursos suficientes para arcar com custas, despesas processuais e demais encargos do processo sem prejuízo do meu sustento e/ou de minha família.

Declaro que as informações econômicas prestadas ao(à) meu(minha) advogado(a) e às autoridades competentes correspondem à minha situação atual, comprometendo-me a comunicar eventual alteração relevante quando necessário.

Renda mensal declarada: {CLIENTE_RENDA_MENSAL}.

Esta declaração é firmada para instruir pedido de gratuidade da justiça ou finalidade equivalente, ficando sua concessão sujeita à apreciação da autoridade competente.

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
  {
    libraryKey: 'geral-contrato-honorarios-advocaticios',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Contrato de Honorários Advocatícios — Geral',
      badge: 'Essencial',
      icon: 'handshake',
      category: 'Contratos & Honorários',
      format: 'Contrato',
      description: 'Contrato-base de prestação de serviços advocatícios com escopo, honorários, despesas, deveres das partes e encerramento do mandato.',
      contentPattern: `CONTRATO PARTICULAR DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS

CONTRATANTE: {CLIENTE_NOME}, {CLIENTE_NACIONALIDADE}, {CLIENTE_ESTADO_CIVIL}, {CLIENTE_PROFISSAO}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, residente e domiciliado(a) em {CLIENTE_ENDERECO_COMPLETO}, telefone {CLIENTE_TELEFONE_PRINCIPAL}, e-mail {CLIENTE_EMAIL}.

CONTRATADO(A): {ADVOGADO_QUALIFICACAO_COMPLETA}.

As partes ajustam a prestação de serviços advocatícios nos seguintes termos:

1. OBJETO
O(A) CONTRATADO(A) prestará serviços jurídicos relacionados a:
[PREENCHER: descrever com precisão o objeto da contratação, procedimento, demanda ou atividade]

A contratação não abrange automaticamente serviços, recursos, incidentes, demandas autônomas ou providências estranhas ao objeto acima, salvo ajuste escrito entre as partes.

2. HONORÁRIOS CONTRATUAIS
Pelos serviços descritos, o(a) CONTRATANTE pagará ao(à) CONTRATADO(A):
[PREENCHER: valor fixo, forma de pagamento, vencimentos e/ou percentual de êxito]

Honorários de êxito, quando pactuados:
[PREENCHER: percentual, base de cálculo, momento de exigibilidade e hipóteses de incidência; remover se não aplicável]

3. HONORÁRIOS DE SUCUMBÊNCIA
Eventuais honorários de sucumbência fixados judicialmente pertencem ao(à) advogado(a), não se confundindo com os honorários contratuais aqui ajustados.

4. CUSTAS E DESPESAS
Custas judiciais ou administrativas, emolumentos, diligências, deslocamentos, cópias, perícias, pareceres, correspondentes e demais despesas necessárias ao caso correrão por conta do(a) CONTRATANTE, quando não incluídas expressamente nos honorários acima.

5. OBRIGAÇÕES DO(A) CONTRATANTE
O(A) CONTRATANTE compromete-se a fornecer informações verdadeiras e completas, entregar documentos necessários, manter seus dados de contato atualizados, comparecer aos atos para os quais for convocado(a), cumprir orientações e prazos que dependam de sua atuação e comunicar imediatamente fatos relevantes ao caso.

6. OBRIGAÇÕES DO(A) CONTRATADO(A)
O(A) CONTRATADO(A) atuará com diligência técnica e independência profissional, manterá o(a) CONTRATANTE informado(a) sobre fatos relevantes e preservará o sigilo profissional, sem garantia de resultado determinado.

7. COMUNICAÇÕES
Serão considerados meios de contato os dados cadastrados pelo(a) CONTRATANTE, inclusive telefone e e-mail acima indicados. O(A) CONTRATANTE deverá informar alterações desses dados.

8. REVOGAÇÃO, RENÚNCIA E ENCERRAMENTO
A revogação do mandato pelo(a) CONTRATANTE ou a renúncia pelo(a) CONTRATADO(A) não afasta o pagamento dos honorários já vencidos nem daqueles proporcionais ao trabalho efetivamente realizado, observadas as condições deste contrato e a legislação aplicável.

9. DADOS E DOCUMENTOS
Os dados e documentos fornecidos poderão ser utilizados na extensão necessária à execução dos serviços contratados, ao cumprimento de deveres profissionais e legais e à defesa dos interesses do(a) CONTRATANTE.

10. DISPOSIÇÕES FINAIS
Qualquer alteração deste contrato deverá ser formalizada por escrito. O(A) CONTRATANTE declara ter lido, compreendido e recebido oportunidade de esclarecer as condições pactuadas.

FORO OU FORMA DE SOLUÇÃO DE CONTROVÉRSIAS:
[PREENCHER: ajustar conforme o caso concreto e a legislação aplicável]

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CONTRATANTE — CPF: {CLIENTE_CPF}

________________________________________
{ADVOGADO_NOME}
CONTRATADO(A) — {ADVOGADO_OAB}`,
    },
  },
  {
    libraryKey: 'geral-substabelecimento-com-reserva',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Substabelecimento com Reserva de Poderes',
      badge: 'Essencial',
      icon: 'assignment_ind',
      category: 'Substabelecimentos',
      format: 'Substabelecimento',
      description: 'Instrumento de substabelecimento com reserva dos poderes originalmente conferidos ao advogado substabelecente.',
      contentPattern: `SUBSTABELECIMENTO COM RESERVA DE PODERES

Eu, {ADVOGADO_NOME}, inscrito(a) na Ordem dos Advogados do Brasil sob o nº {ADVOGADO_OAB}, na qualidade de procurador(a) de {CLIENTE_NOME}, CPF nº {CLIENTE_CPF}, SUBSTABELEÇO, COM RESERVA DE IGUAIS PODERES, ao(à) advogado(a):

NOME: [PREENCHER: NOME DO(A) ADVOGADO(A) SUBSTABELECIDO(A)]
OAB: [PREENCHER: OAB/UF E NÚMERO]
ENDEREÇO PROFISSIONAL: [PREENCHER: ENDEREÇO, SE NECESSÁRIO]

os poderes que me foram conferidos pelo(a) outorgante acima identificado(a), na extensão necessária à atuação conjunta ou específica no seguinte assunto/processo:

[PREENCHER: número do processo, procedimento ou objeto; remover se o substabelecimento for geral]

Permaneço com os poderes originariamente recebidos, nos limites do mandato.

{CIDADE_DATA_EXTENSO}

________________________________________
{ADVOGADO_NOME}
{ADVOGADO_OAB}`,
    },
  },
  {
    libraryKey: 'geral-substabelecimento-sem-reserva',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Substabelecimento sem Reserva de Poderes',
      badge: 'Essencial',
      icon: 'assignment_ind',
      category: 'Substabelecimentos',
      format: 'Substabelecimento',
      description: 'Instrumento de substabelecimento sem reserva, para transferência dos poderes recebidos no mandato indicado.',
      contentPattern: `SUBSTABELECIMENTO SEM RESERVA DE PODERES

Eu, {ADVOGADO_NOME}, inscrito(a) na Ordem dos Advogados do Brasil sob o nº {ADVOGADO_OAB}, na qualidade de procurador(a) de {CLIENTE_NOME}, CPF nº {CLIENTE_CPF}, SUBSTABELEÇO, SEM RESERVA DE PODERES, ao(à) advogado(a):

NOME: [PREENCHER: NOME DO(A) ADVOGADO(A) SUBSTABELECIDO(A)]
OAB: [PREENCHER: OAB/UF E NÚMERO]
ENDEREÇO PROFISSIONAL: [PREENCHER: ENDEREÇO, SE NECESSÁRIO]

os poderes que me foram conferidos pelo(a) outorgante acima identificado(a), relativamente ao seguinte assunto/processo:

[PREENCHER: número do processo, procedimento ou objeto; remover se o substabelecimento for geral]

O presente instrumento é firmado sem reserva dos poderes ora transferidos, devendo ser observadas as providências profissionais e processuais cabíveis à substituição da representação.

{CIDADE_DATA_EXTENSO}

________________________________________
{ADVOGADO_NOME}
{ADVOGADO_OAB}`,
    },
  },
  {
    libraryKey: 'geral-declaracao-residencia',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Declaração de Residência',
      badge: 'Comum',
      icon: 'description',
      category: 'Declarações',
      format: 'Declaração',
      description: 'Declaração simples de endereço residencial informado pelo cliente para instrução de procedimentos jurídicos ou administrativos.',
      contentPattern: `DECLARAÇÃO DE RESIDÊNCIA

Eu, {CLIENTE_NOME}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, DECLARO, para os fins cabíveis e sob as penas da lei, que resido e sou domiciliado(a) no seguinte endereço:

{CLIENTE_ENDERECO_COMPLETO}.

Declaro serem verdadeiras as informações acima e assumo responsabilidade por sua exatidão, comprometendo-me a comunicar eventual alteração de endereço quando necessário ao procedimento a que esta declaração se destina.

FINALIDADE, SE NECESSÁRIO:
[PREENCHER: indicar a finalidade específica ou remover este campo]

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
  {
    libraryKey: 'geral-declaracao-veracidade-informacoes',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Declaração de Veracidade das Informações',
      badge: 'Comum',
      icon: 'description',
      category: 'Declarações',
      format: 'Declaração',
      description: 'Declaração do cliente de que as informações e documentos fornecidos ao escritório correspondem à verdade.',
      contentPattern: `DECLARAÇÃO DE VERACIDADE DAS INFORMAÇÕES

Eu, {CLIENTE_NOME}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, residente e domiciliado(a) em {CLIENTE_ENDERECO_COMPLETO}, DECLARO que as informações, dados e documentos por mim fornecidos a {NOME_ESCRITORIO} e ao(à) advogado(a) {ADVOGADO_NOME} são, segundo meu conhecimento, verdadeiros, completos e correspondem à realidade.

Declaro estar ciente de que informações incorretas, incompletas, desatualizadas ou omitidas podem prejudicar a análise jurídica, a adoção de providências e a defesa de meus interesses.

Comprometo-me a comunicar prontamente qualquer fato novo, alteração de dados, recebimento de correspondência, intimação, notificação, decisão ou documento relacionado ao assunto confiado ao escritório.

Declaro, ainda, que tive oportunidade de esclarecer dúvidas quanto às informações solicitadas e que sou responsável pela autenticidade material dos documentos que apresentei, sem prejuízo da conferência jurídica realizada pelo profissional responsável.

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
  {
    libraryKey: 'geral-recibo-honorarios',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Recibo de Honorários Advocatícios',
      badge: 'Comum',
      icon: 'account_balance',
      category: 'Contratos & Honorários',
      format: 'Recibo',
      description: 'Recibo-base para pagamento de honorários advocatícios, com identificação automática do cliente, advogado e escritório.',
      contentPattern: `RECIBO DE HONORÁRIOS ADVOCATÍCIOS

Recebi de {CLIENTE_NOME}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, a importância de:

VALOR: [PREENCHER: R$ 0,00]
VALOR POR EXTENSO: [PREENCHER: valor por extenso]

referente a:
[PREENCHER: parcela, serviço, etapa processual ou fundamento do pagamento]

FORMA DE PAGAMENTO:
[PREENCHER: PIX, transferência, espécie ou outro meio]

O presente recibo comprova exclusivamente o recebimento do valor acima indicado, na finalidade nele descrita, sem alterar as demais condições eventualmente previstas em contrato de honorários.

{CIDADE_DATA_EXTENSO}

________________________________________
{ADVOGADO_NOME}
{ADVOGADO_OAB}
{NOME_ESCRITORIO}`,
    },
  },
  {
    libraryKey: 'geral-termo-ciencia-responsabilidade-cliente',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Termo de Ciência e Responsabilidade do Cliente',
      badge: 'Essencial',
      icon: 'description',
      category: 'Atendimento & Ciência',
      format: 'Termo',
      description: 'Termo para registrar deveres de cooperação do cliente, atualização de contato, entrega de documentos e ciência sobre ausência de garantia de resultado.',
      contentPattern: `TERMO DE CIÊNCIA E RESPONSABILIDADE DO CLIENTE

CLIENTE: {CLIENTE_NOME}, CPF nº {CLIENTE_CPF}, telefone {CLIENTE_TELEFONE_PRINCIPAL}, e-mail {CLIENTE_EMAIL}.

ESCRITÓRIO/ADVOGADO(A): {NOME_ESCRITORIO} — {ADVOGADO_NOME}, {ADVOGADO_OAB}.

Por este termo, o(a) CLIENTE declara estar ciente de que:

1. deverá fornecer informações verdadeiras, completas e atualizadas sobre o assunto confiado ao escritório;

2. deverá entregar, dentro do prazo solicitado, documentos e comprovantes necessários à análise ou condução do caso;

3. deverá manter telefone, e-mail e endereço atualizados, comunicando alterações ao escritório;

4. deverá comunicar imediatamente o recebimento de citações, intimações, notificações, cartas, mensagens, decisões ou contatos relacionados ao caso;

5. deverá comparecer a audiências, perícias, avaliações, reuniões e demais atos para os quais for convocado(a), observando as orientações recebidas;

6. prazos que dependam da entrega de informação, documento ou providência do(a) CLIENTE poderão ser prejudicados pelo atraso ou omissão dessa colaboração;

7. a atividade advocatícia envolve obrigação de atuação técnica e diligente, não representando promessa ou garantia de resultado;

8. acordos, desistências, renúncias a direitos e outras decisões relevantes serão avaliados conforme as circunstâncias concretas e, quando dependerem de sua manifestação, deverão contar com sua ciência ou autorização;

9. documentos e dados fornecidos poderão ser utilizados na extensão necessária à prestação dos serviços jurídicos, ao cumprimento de deveres profissionais e legais e à defesa de seus interesses.

OBSERVAÇÕES ESPECÍFICAS DO ATENDIMENTO:
[PREENCHER: registrar orientação relevante, pendência ou condição específica; remover se não houver]

Declaro que li, compreendi e tive oportunidade de esclarecer dúvidas sobre este termo.

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}

________________________________________
{ADVOGADO_NOME}
{ADVOGADO_OAB}`,
    },
  },
  {
    libraryKey: 'geral-declaracao-autenticidade-documentos',
    libraryVersion: 2,
    legacyTemplateIds: [],
    template: {
      title: 'Declaração de Autenticidade de Documentos pelo Cliente',
      badge: 'Comum',
      icon: 'description',
      category: 'Declarações',
      format: 'Declaração',
      description: 'Declaração do cliente sobre a origem e autenticidade dos documentos entregues ao escritório para utilização no caso.',
      contentPattern: `DECLARAÇÃO DE AUTENTICIDADE DE DOCUMENTOS

Eu, {CLIENTE_NOME}, inscrito(a) no CPF sob o nº {CLIENTE_CPF}, DECLARO, para os fins cabíveis, que os documentos por mim entregues ou encaminhados a {NOME_ESCRITORIO} para análise e utilização jurídica correspondem aos documentos que recebi, possuo ou obtive de suas respectivas fontes, não tendo realizado adulteração de seu conteúdo.

Declaro estar ciente de que devo informar ao escritório qualquer dúvida quanto à origem, integridade, atualização ou autenticidade de documento apresentado, bem como fornecer o original ou nova via quando solicitado(a).

RELAÇÃO OU OBSERVAÇÃO SOBRE DOCUMENTOS, SE NECESSÁRIO:
[PREENCHER: documentos abrangidos, ressalvas ou observações; remover se não houver]

Firmo a presente declaração de forma livre e consciente.

{CIDADE_DATA_EXTENSO}

________________________________________
{CLIENTE_NOME}
CPF: {CLIENTE_CPF}`,
    },
  },
];

/**
 * Catálogo oficial de modelos-base distribuídos pelo AdvoDesk.
 *
 * A infraestrutura registra cada libraryKey uma única vez por escritório.
 * Modelos já adotados podem ser editados ou arquivados sem que futuras versões
 * sobrescrevam as personalizações. A versão 2 acrescenta as minutas gerais de
 * escritório; etapas seguintes incluirão modelos processuais e previdenciários.
 */
export const ADVODESK_BASE_TEMPLATE_CATALOG: AdvodeskBaseTemplateDefinition[] = [
  ...LEGACY_TEMPLATES.map(toBaseDefinition),
  ...GENERAL_OFFICE_TEMPLATES,
];

export const ADVODESK_BASE_DOCUMENT_CATEGORIES = Array.from(
  new Set(ADVODESK_BASE_TEMPLATE_CATALOG.map((item) => item.template.category).filter(Boolean))
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

export const ADVODESK_BASE_DOCUMENT_FORMATS = Array.from(
  new Set(
    ADVODESK_BASE_TEMPLATE_CATALOG
      .map((item) => item.template.format)
      .filter((value): value is string => Boolean(value))
  )
).sort((a, b) => a.localeCompare(b, 'pt-BR'));

const safeIdPart = (value: string) =>
  value
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

export const buildAdvodeskBaseTemplateId = (firmId: string, libraryKey: string) =>
  `advodesk-base-${safeIdPart(firmId)}-${safeIdPart(libraryKey)}`;
