import type { IncomingMessage, ServerResponse } from 'http';
import {
  getAuthenticatedContext,
  AuthContextError,
} from './_lib/auth-context.js';
import {
  assertCaseTenantAccess,
  CaseAccessError,
} from './_lib/case-access.js';

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

  const url = new URL(req.url ?? '/', 'http://localhost');
  const caseId = url.searchParams.get('caseId');

  try {
    const context = await getAuthenticatedContext(req);
    await assertCaseTenantAccess(context, caseId ?? '');

    return sendResponse(res, 200, {
      ok: true,
      authenticated: true,
      caseFound: true,
      tenantAccess: true,
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

    if (err instanceof CaseAccessError) {
      if (err.stage === 'invalid_case_id') {
        return sendResponse(res, 400, {
          ok: false,
          stage: 'invalid_case_id',
        });
      }

      if (err.stage === 'case_not_found') {
        return sendResponse(res, 404, {
          ok: false,
          stage: 'case_not_found',
          caseFound: false,
        });
      }

      if (err.stage === 'case_tenant') {
        return sendResponse(res, 403, {
          ok: false,
          stage: 'case_tenant',
          caseFound: true,
          tenantAccess: false,
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
      stage: 'case_access',
    });
  }
}
