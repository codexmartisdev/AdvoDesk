import type { IncomingMessage, ServerResponse } from 'http';
import { getServiceAccountAccessToken, WifAuthError } from './_lib/gcp-wif.js';

interface VercelResponse extends ServerResponse {
  status?: (statusCode: number) => VercelResponse;
  json?: (body: unknown) => void;
}

function sendResponse(res: VercelResponse, statusCode: number, body: unknown) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(statusCode).json(body);
  }
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  return res.end(JSON.stringify(body));
}

export default async function handler(
  req: IncomingMessage,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    return sendResponse(res, 405, {
      ok: false,
      error: 'Method Not Allowed',
    });
  }

  try {
    await getServiceAccountAccessToken(req);

    return sendResponse(res, 200, {
      ok: true,
      oidcTokenPresent: true,
      stsExchange: true,
      serviceAccountImpersonation: true,
    });
  } catch (err) {
    if (err instanceof WifAuthError) {
      if (err.stage === 'vercel_oidc') {
        return sendResponse(res, 500, {
          ok: false,
          stage: 'vercel_oidc',
        });
      }

      return sendResponse(res, 502, {
        ok: false,
        stage: err.stage,
        ...(err.status ? { status: err.status } : {}),
      });
    }

    return sendResponse(res, 502, {
      ok: false,
      stage: 'service_account_impersonation',
      status: 502,
    });
  }
}

