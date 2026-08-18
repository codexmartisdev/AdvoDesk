import type { IncomingMessage, ServerResponse } from 'http';
import { GoogleGenAI } from '@google/genai';
import {
  getAuthenticatedContext,
  AuthContextError,
} from './_lib/auth-context.js';

interface VercelResponse extends ServerResponse {
  status?: (statusCode: number) => VercelResponse;
  json?: (body: unknown) => void;
}

function sendResponse(res: VercelResponse, statusCode: number, body: unknown) {
  res.setHeader('Cache-Control', 'no-store');
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(body);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

async function parseJsonBody(req: IncomingMessage): Promise<{
  data?: unknown;
  error?: 'too_large' | 'invalid_json';
}> {
  const MAX_BYTES = 256 * 1024; // 256 KiB

  const reqWithBody = req as IncomingMessage & { body?: unknown };
  if (
    reqWithBody.body !== undefined &&
    reqWithBody.body !== null &&
    typeof reqWithBody.body === 'object'
  ) {
    try {
      const serialized = JSON.stringify(reqWithBody.body);
      const byteLength = Buffer.byteLength(serialized, 'utf8');
      if (byteLength > MAX_BYTES) {
        return { error: 'too_large' };
      }
      return { data: reqWithBody.body };
    } catch (_err) {
      return { error: 'invalid_json' };
    }
  }

  let receivedBytes = 0;
  let tooLarge = false;
  const chunks: Buffer[] = [];

  return new Promise((resolve) => {
    req.on('data', (chunk: Buffer | string) => {
      const bufferChunk = Buffer.isBuffer(chunk)
        ? chunk
        : Buffer.from(chunk);
      receivedBytes += bufferChunk.length;
      if (receivedBytes > MAX_BYTES) {
        tooLarge = true;
        return;
      }
      if (!tooLarge) {
        chunks.push(bufferChunk);
      }
    });

    req.on('end', () => {
      if (tooLarge) {
        resolve({ error: 'too_large' });
        return;
      }

      const raw = Buffer.concat(chunks).toString('utf-8');
      if (!raw || raw.trim() === '') {
        resolve({ data: {} });
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve({ data: parsed });
      } catch (_jsonErr) {
        resolve({ error: 'invalid_json' });
      }
    });

    req.on('error', () => {
      resolve({ error: 'invalid_json' });
    });
  });
}

function generateTemplateFallback(payload: {
  templateTitle: string;
  templateContent: string;
  clientName: string;
  clientCpf: string;
  caseDetails: string;
  customClauses: string;
}): string {
  const currentDate = new Date().toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });

  const content = payload.templateContent.trim();
  if (content !== '') {
    return content
      .replace(/\{CLIENTE_NOME\}/g, payload.clientName || '____________________')
      .replace(/\{CLIENTE_CPF\}/g, payload.clientCpf || '____________________')
      .replace(/\{CONTEXTO\}/g, payload.caseDetails || '')
      .replace(/\{OBSERVACOES\}/g, payload.customClauses || '')
      .replace(/\{DATA_ATUAL\}/g, currentDate);
  }

  const lines: string[] = [
    payload.templateTitle.toUpperCase(),
    '',
    `CLIENTE: ${payload.clientName || '____________________'}`,
    `CPF: ${payload.clientCpf || '____________________'}`,
  ];

  if (payload.caseDetails.trim() !== '') {
    lines.push('', 'DETALHES / CONTEXTO:', payload.caseDetails.trim());
  }

  if (payload.customClauses.trim() !== '') {
    lines.push('', 'OBSERVAÇÕES / CLÁUSULAS ADICIONAIS:', payload.customClauses.trim());
  }

  lines.push(
    '',
    `Data: ${currentDate}`,
    '',
    '',
    '',
    '_______________________________________________',
    'Assinatura'
  );

  return lines.join('\n');
}

export default async function handler(
  req: IncomingMessage,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return sendResponse(res, 405, {
      ok: false,
      error: 'Method Not Allowed',
    });
  }

  // 1. Mandatory server-side authentication and tenant resolution
  try {
    await getAuthenticatedContext(req);
  } catch (err) {
    if (err instanceof AuthContextError) {
      if (
        err.stage === 'authorization_header' ||
        err.stage === 'firebase_id_token'
      ) {
        return sendResponse(res, 401, {
          ok: false,
          stage: err.stage,
        });
      }

      if (err.stage === 'user_profile') {
        return sendResponse(res, 404, {
          ok: false,
          stage: 'user_profile',
        });
      }

      if (err.stage === 'tenant_context') {
        return sendResponse(res, 403, {
          ok: false,
          stage: 'tenant_context',
        });
      }

      if (
        err.stage === 'vercel_oidc' ||
        err.stage === 'google_sts' ||
        err.stage === 'service_account_impersonation' ||
        err.stage === 'firestore'
      ) {
        return sendResponse(res, 502, {
          ok: false,
          stage: err.stage,
          status: err.status ?? 502,
        });
      }
    }

    return sendResponse(res, 500, {
      ok: false,
      stage: 'auth_context',
    });
  }

  // 2. Safe JSON body reading and size limits
  const bodyResult = await parseJsonBody(req);
  if (bodyResult.error === 'too_large') {
    return sendResponse(res, 413, {
      ok: false,
      error: 'Payload Too Large',
    });
  }
  if (bodyResult.error === 'invalid_json' || !bodyResult.data || typeof bodyResult.data !== 'object') {
    return sendResponse(res, 400, {
      ok: false,
      error: 'Invalid JSON',
    });
  }

  const rawBody = bodyResult.data as Record<string, unknown>;

  const templateTitle = typeof rawBody.templateTitle === 'string' ? rawBody.templateTitle : '';
  const templateContent = typeof rawBody.templateContent === 'string' ? rawBody.templateContent : '';
  const clientName = typeof rawBody.clientName === 'string' ? rawBody.clientName : '';
  const clientCpf = typeof rawBody.clientCpf === 'string' ? rawBody.clientCpf : '';
  const caseDetails = typeof rawBody.caseDetails === 'string' ? rawBody.caseDetails : '';
  const customClauses = typeof rawBody.customClauses === 'string' ? rawBody.customClauses : '';

  // 3. Defensive validation of field constraints
  if (
    templateTitle.trim() === '' ||
    templateTitle.length > 300 ||
    templateContent.length > 100000 ||
    clientName.length > 500 ||
    clientCpf.length > 100 ||
    caseDetails.length > 20000 ||
    customClauses.length > 20000
  ) {
    return sendResponse(res, 400, {
      ok: false,
      error: 'Invalid Request',
    });
  }

  const payload = {
    templateTitle: templateTitle.trim(),
    templateContent,
    clientName: clientName.trim(),
    clientCpf: clientCpf.trim(),
    caseDetails: caseDetails.trim(),
    customClauses: customClauses.trim(),
  };

  const fallbackText = generateTemplateFallback(payload);

  // 4. Check Gemini API key
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return sendResponse(res, 200, {
      documentText: fallbackText,
      source: 'template',
    });
  }

  // 5. Generate document with Gemini using a tenant-neutral prompt
  try {
    const ai = new GoogleGenAI({ apiKey });
    const prompt = `Você auxilia na redação de documentos jurídicos brasileiros. Produza uma minuta baseada exclusivamente nas informações e no modelo fornecidos abaixo.

Não invente nomes de advogados, OAB, CPF, endereço, percentuais de honorários, fatos, datas processuais ou cláusulas específicas que não estejam presentes nos dados fornecidos.

Preserve a estrutura e a intenção do modelo fornecido quando houver.

Título:
${payload.templateTitle}

${payload.templateContent ? `Modelo:\n${payload.templateContent}\n` : ''}
Cliente:
${payload.clientName || 'Não informado'}

CPF:
${payload.clientCpf || 'Não informado'}

${payload.caseDetails ? `Contexto:\n${payload.caseDetails}\n` : ''}
${payload.customClauses ? `Observações:\n${payload.customClauses}\n` : ''}
Instrução de formatação:
Ao final do documento, inclua espaço adequado para data e assinatura física.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: prompt,
    });

    const generatedText = response.text?.trim();
    if (generatedText) {
      return sendResponse(res, 200, {
        documentText: generatedText,
        source: 'ai',
      });
    }

    console.error('[generate-document] gemini_empty_response');
    return sendResponse(res, 200, {
      documentText: fallbackText,
      source: 'template',
    });
  } catch (err) {
    const errObj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : {};
    console.error('[generate-document] gemini_generation_failed', {
      name: typeof errObj.name === 'string' ? errObj.name : undefined,
      status: typeof errObj.status === 'number' || typeof errObj.status === 'string' ? errObj.status : undefined,
      code: typeof errObj.code === 'number' || typeof errObj.code === 'string' ? errObj.code : undefined,
    });
    return sendResponse(res, 200, {
      documentText: fallbackText,
      source: 'template',
    });
  }
}
