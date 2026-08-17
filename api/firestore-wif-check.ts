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

const PROJECT_ID = 'gen-lang-client-0365371352';
const DATABASE_ID = 'ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be';
const DOCUMENT_PATH = 'users/ffv3y8vcGKNrcEsdnohNQwGGcmh2';
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/${DOCUMENT_PATH}?mask.fieldPaths=firmId`;

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

  let wifResult;
  try {
    wifResult = await getServiceAccountAccessToken(req);
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

  let firestoreRes: Response;
  try {
    firestoreRes = await fetch(FIRESTORE_URL, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${wifResult.accessToken}`,
      },
    });
  } catch (_err) {
    console.error('[firestore-wif-check] Failed to connect to Firestore REST endpoint.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: 502,
    });
  }

  if (!firestoreRes.ok) {
    console.error(`[firestore-wif-check] Firestore read returned status ${firestoreRes.status}`);
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: firestoreRes.status,
    });
  }

  let docData: { fields?: Record<string, unknown> };
  try {
    docData = (await firestoreRes.json()) as { fields?: Record<string, unknown> };
  } catch (_jsonErr) {
    console.error('[firestore-wif-check] Failed to parse Firestore response as JSON.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: firestoreRes.status,
    });
  }

  const firmIdFieldPresent = Boolean(docData.fields && 'firmId' in docData.fields);

  return sendResponse(res, 200, {
    ok: true,
    wif: true,
    firestoreAccess: true,
    documentFound: true,
    firmIdFieldPresent,
  });
}
