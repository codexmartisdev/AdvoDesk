import type { IncomingMessage, ServerResponse } from 'http';
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
    await getAuthenticatedContext(req);

    return sendResponse(res, 200, {
      ok: true,
      authenticated: true,
      wif: true,
      firestoreAccess: true,
      profileFound: true,
      firmIdPresent: true,
    });
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
          profileFound: false,
        });
      }

      if (err.stage === 'tenant_context') {
        return sendResponse(res, 403, {
          ok: false,
          stage: 'tenant_context',
          profileFound: true,
          firmIdPresent: false,
        });
      }

      if (
        err.stage === 'vercel_oidc' ||
        err.stage === 'google_sts' ||
        err.stage === 'service_account_impersonation'
      ) {
        return sendResponse(res, 502, {
          ok: false,
          stage: err.stage,
          ...(err.status !== undefined ? { status: err.status } : {}),
        });
      }

      if (err.stage === 'firestore') {
        return sendResponse(res, 502, {
          ok: false,
          stage: 'firestore',
          status: err.status ?? 502,
        });
      }
    }

    return sendResponse(res, 500, {
      ok: false,
      stage: 'auth_context',
    });
  }
}
