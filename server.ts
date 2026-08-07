import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API endpoint for AI Legal Document generation
  app.post('/api/generate-document', async (req, res) => {
    try {
      const { templateTitle, templateContent, clientName, clientCpf, caseDetails, customClauses } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        // Fallback structured generation when key is missing
        const fallbackDoc = generateFallbackText(templateTitle, clientName, clientCpf, caseDetails, customClauses, templateContent);
        return res.json({ documentText: fallbackDoc, source: 'template' });
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Você é um advogado especialista brasileiro. Redija o documento jurídico formal "${templateTitle}".
Se for uma Procuração, siga estritamente a seguinte estrutura oficial da banca Bizerra Neto Advocacia:

OUTORGANTE: ${clientName ? clientName.toUpperCase() : 'QUALIFICAÇÃO DO CLIENTE'}, CPF/MF sob o nº ${clientCpf || '000.000.000-00'}, endereço completo, profissão, estado civil.

OUTORGADO: FRANCISCO DAS CHAGAS BIZERRA DE ARAUJO NETO, brasileiro, solteiro, advogado inscrito no quadro da OAB-PI sob nº 24.334, CPF nº 063.008.273-13 com endereço profissional na rua dos Araujos, 150, bairro Frei Higino, em Parnaíba-PI e VERÔNICA LÍLIAN COSTA GUIMARÃES, advogada inscrita na OAB/PI sob o nº 24.148.

PODERES: O(S) OUTORGANTE(S) acima qualificado(s) nomeia(m) seu bastante procurador e advogado o OUTORGADO supra identificado para, com os poderes de cláusula AD JUDICIA ET EXTRA, representá-lo(s), dentro e fora do foro em geral, com amplos poderes junto a qualquer juízo, instância ou Tribunal, inclusive em qualquer esfera administrativa, seja ela qual for, podendo propor contra terceiros as ações que se fizerem necessárias, ou defendê-lo(s) nas que lhes sejam propostas, seguindo, umas e outras, até decisão final, usando de todos os recursos aplicáveis à espécie, e ainda conferindo-lhe PODERES ESPECIAIS para confessar, reconhecer a procedência do pedido, desistir, renunciar direitos sobre o qual se funda a ação, receber e dar quitação, transigir, firmar compromissos ou acordos, propor Execução, requerer Falências, Alvarás Liberativos, habilitar créditos, Ação Ordinária, Procedimento Sumaríssimo, Ações Rescisórias, Embargos, Agravos, Habeas Corpus, Mandado de Segurança, requerer, ainda, a Concessão dos Benefícios da Gratuidade da Justiça, conforme artigo 105 do Código de Processo Civil. Confere, ainda, poderes específicos para representar o(s) OUTORGANTE(S) perante o INSS – Instituto Nacional do Seguro Social, podendo requerer, acompanhar, interpor recursos administrativos e judiciais, cumprir exigências e praticar todos os atos necessários à concessão, manutenção e revisão de benefícios previdenciários, especialmente de auxílio-acidente, bem como receber valores, assinar declarações, formulários e documentos necessários. Podendo, ainda, assinar formulários de isenção de imposto de renda, formulários de RPV e precatórios e sacar eventuais RPVs junto à Caixa Econômica Federal, Banco do Brasil ou qualquer outra instituição bancária, bem como levantar Alvarás. Fica estabelecido que seus honorários serão de 35%, podendo também receber cartões de benefício previdenciário, agindo em conjunto ou isoladamente, podendo, inclusive, substabelecer esta a outrem, de igual forma e com ou sem reserva de poderes, dando, ao fim, tudo por bom, firme e valioso, sempre no interesse do(s) OUTORGANTE(S).

${caseDetails ? `DETALHES/PROCESSO: ${caseDetails}\n` : ''}${customClauses ? `OBSERVAÇÕES: ${customClauses}\n` : ''}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      const text = response.text || generateFallbackText(templateTitle, clientName, clientCpf, caseDetails, customClauses);
      return res.json({ documentText: text, source: 'ai' });
    } catch (err: any) {
      console.error('Error generating document:', err);
      const fallbackDoc = generateFallbackText(
        req.body?.templateTitle,
        req.body?.clientName,
        req.body?.clientCpf,
        req.body?.caseDetails,
        req.body?.customClauses
      );
      return res.json({ documentText: fallbackDoc, source: 'template', error: err?.message });
    }
  });

  // Vite middleware for dev or static serving for production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

function generateFallbackText(
  templateTitle: string = 'Contrato de Honorários',
  clientName: string = 'João Silva e Oliveira',
  clientCpf: string = '123.456.789-00',
  caseDetails: string = '',
  customClauses: string = '',
  templateContent: string = ''
): string {
  const dateStr = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  
  if (templateContent && templateContent.trim().length > 0) {
    let text = templateContent;
    text = text.replace(/\{CLIENTE_NOME\}/g, (clientName || 'CLIENTE').toUpperCase());
    text = text.replace(/\{CLIENTE_CPF\}/g, clientCpf || '000.000.000-00');
    text = text.replace(/\{DATA_ATUAL\}/g, dateStr);
    text = text.replace(/\{CONTEXTO\}/g, caseDetails || 'Sem observações adicionais');
    text = text.replace(/\{OBSERVACOES\}/g, customClauses || '');
    return text;
  }
  
  if (templateTitle.includes('Procuração')) {
    return `INSTRUMENTO PARTICULAR DE PROCURAÇÃO CLÁUSULA AD JUDICIA ET EXTRA

OUTORGANTE:
${clientName.toUpperCase()}, inscrito(a) no CPF/MF sob o nº ${clientCpf}, residente e domiciliado(a) no endereço fornecido.

OUTORGADO:
FRANCISCO DAS CHAGAS BIZERRA DE ARAUJO NETO, brasileiro, solteiro, advogado inscrito no quadro da OAB-PI sob nº 24.334, CPF nº 063.008.273-13 com endereço profissional na rua dos Araujos, 150, bairro Frei Higino, em Parnaíba-PI e VERÔNICA LÍLIAN COSTA GUIMARÃES, advogada inscrita na OAB/PI sob o nº 24.148.

PODERES:
O(S) OUTORGANTE(S) acima qualificado(s) nomeia(m) seu bastante procurador e advogado o OUTORGADO supra identificado para, com os poderes de cláusula AD JUDICIA ET EXTRA, representá-lo(s), dentro e fora do foro em geral, com amplos poderes junto a qualquer juízo, instância ou Tribunal, inclusive em qualquer esfera administrativa, seja ela qual for, podendo propor contra terceiros as ações que se fizerem necessárias, ou defendê-lo(s) nas que lhes sejam propostas, seguindo, umas e outras, até decisão final, usando de todos os recursos aplicáveis à espécie, e ainda conferindo-lhe PODERES ESPECIAIS para confessar, reconhecer a procedência do pedido, desistir, renunciar direitos sobre o qual se funda a ação, receber e dar quitação, transigir, firmar compromissos ou acordos, propor Execução, requerer Falências, Alvarás Liberativos, habilitar créditos, Ação Ordinária, Procedimento Sumaríssimo, Ações Rescisórias, Embargos, Agravos, Habeas Corpus, Mandado de Segurança, requerer, ainda, a Concessão dos Benefícios da Gratuidade da Justiça, conforme artigo 105 do Código de Processo Civil. Confere, ainda, poderes específicos para representar o(s) OUTORGANTE(S) perante o INSS – Instituto Nacional do Seguro Social, podendo requerer, acompanhar, interpor recursos administrativos e judiciais, cumprir exigências e praticar todos os atos necessários à concessão, manutenção e revisão de benefícios previdenciários, especialmente de auxílio-acidente, bem como receber valores, assinar declarações, formulários e documentos necessários. Podendo, ainda, assinar formulários de isenção de imposto de renda, formulários de RPV e precatórios e sacar eventuais RPVs junto à Caixa Econômica Federal, Banco do Brasil ou qualquer outra instituição bancária, bem como levantar Alvarás. Fica established que seus honorários serão de 35%, podendo também receber cartões de benefício previdenciário, agindo em conjunto ou isoladamente, podendo, inclusive, substabelecer esta a outrem, de igual forma e com ou sem reserva de poderes, dando, ao fim, tudo por bom, firme e valioso, sempre no interesse do(s) OUTORGANTE(S)."

Parnaíba - PI, ${dateStr}.

X____________________________________________________________
Outorgante

Digital [  ]

A Rogo: _________________________________________________________
Testemunha: _______________________________________ CPF: _______________
Testemunha: _______________________________________ CPF: _______________`;
  }

  if (templateTitle.includes('Hipossuficiência')) {
    return `DECLARAÇÃO DE HIPOSSUFICIÊNCIA FINANCEIRA
(Justiça Gratuita - Art. 99, §3º do CPC)

Eu, ${clientName.toUpperCase()}, inscrito(a) no CPF/MF sob o nº ${clientCpf}, declaro para os devidos fins de direito, sob as penas da lei (art. 299 do Código Penal), que não possuo condições financeiras de arcar com as custas processuais, despesas com honorários advocatícios e periciais sem prejuízo do meu próprio sustento e de minha família.

Por tais razões, requeiro a concessão dos benefícios da JUSTIÇA GRATUITA, nos termos dos artigos 98 e seguintes da Lei nº 13.105/2015 (Código de Processo Civil) e do artigo 5º, LXXIV da Constituição Federal.

${caseDetails ? `CONTEXTO PROCESSUAL: ${caseDetails}\n` : ''}
Por ser a expressão da verdade, firmo a presente declaração.

Parnaíba - PI, ${dateStr}.

_____________________________________
${clientName}`;
  }

  // Default Contrato de Honorários
  return `CONTRATO DE PRESTAÇÃO DE SERVIÇOS ADVOCATÍCIOS E HONORÁRIOS

Pelo presente instrumento particular, de um lado:

CONTRATANTE: ${clientName.toUpperCase()}, inscrito(a) no CPF/MF sob o nº ${clientCpf}.
CONTRATADO: BIZERRA NETO ADVOCACIA (OAB-PI nº 24.334).

CLÁUSULA 1ª - DO OBJETO
O CONTRATADO compromete-se a prestar serviços advocatícios na defesa dos interesses do CONTRATANTE referentes a: ${caseDetails || 'Ação previdenciária de concessão de benefício perante o INSS / Justiça Federal'}.

CLÁUSULA 2ª - DOS HONORÁRIOS
Pela prestação dos serviços convencionados, o CONTRATANTE pagará ao CONTRATADO o percentual de 35% (trinta e cinco por cento) sobre o proveito econômico obtido ao final do processo.

CLÁUSULA 3ª - DAS DESPESAS PROCESSUAIS
As custas e despesas judiciais decorrentes do processo correm por conta do CONTRATANTE, ressalvada a concessão do benefício da assistência judiciária gratuita.

${customClauses ? `CLÁUSULA 4ª - DISPOSIÇÕES ESPECIAIS\n${customClauses}\n` : ''}
CLÁUSULA 5ª - DO FORO
Fica eleito o Foro da Comarca de Parnaíba/PI para dirimir quaisquer dúvidas oriundas deste contrato.

E, por estarem assim justos e contratados, assinam o presente em 2 (duas) vias de igual teor.

Parnaíba - PI, ${dateStr}.

_____________________________________          _____________________________________
CONTRATANTE: ${clientName}                      CONTRATADO: Bizerra Neto Advocacia`;
}

startServer();
