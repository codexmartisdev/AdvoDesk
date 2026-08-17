import type { IncomingMessage, ServerResponse } from 'http';
import {
  verifyFirebaseBearerToken,
  FirebaseAuthError,
  type VerifiedFirebaseUser,
} from './_lib/firebase-auth.js';
import {
  getServiceAccountAccessToken,
  WifAuthError,
} from './_lib/gcp-wif.js';

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

const PROJECT_ID = 'gen-lang-client-0365371352';
const DATABASE_ID = 'ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be';

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

  // 1. Authenticate user via Firebase Bearer ID token
  let verified: VerifiedFirebaseUser;
  try {
    verified = await verifyFirebaseBearerToken(req);
  } catch (err) {
    if (err instanceof FirebaseAuthError) {
      return sendResponse(res, 401, {
        ok: false,
        stage: err.stage,
      });
    }

    return sendResponse(res, 401, {
      ok: false,
      stage: 'firebase_id_token',
    });
  }

  // 2. Obtain service account credentials via Workload Identity Federation
  let wifResult;
  try {
    wifResult = await getServiceAccountAccessToken(req);
  } catch (err) {
    if (err instanceof WifAuthError) {
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

  // 3. Read users/{uid} document from named Firestore database
  const encodedUid = encodeURIComponent(verified.uid);
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/users/${encodedUid}?mask.fieldPaths=firmId`;

  let firestoreRes: Response;
  try {
    firestoreRes = await fetch(firestoreUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${wifResult.accessToken}`,
      },
    });
  } catch (_err) {
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: 502,
    });
  }

  if (firestoreRes.status === 404) {
    return sendResponse(res, 404, {
      ok: false,
      stage: 'user_profile',
      profileFound: false,
    });
  }

  if (!firestoreRes.ok) {
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: firestoreRes.status,
    });
  }

  let docData: { fields?: Record<string, { stringValue?: string }> };
  try {
    docData = (await firestoreRes.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
  } catch (_jsonErr) {
    return sendResponse(res, 502, {
      ok: false,
      stage: 'firestore',
      status: 502,
    });
  }

  const firmIdValue = docData?.fields?.firmId?.stringValue;
  const firmIdPresent =
    typeof firmIdValue === 'string' && firmIdValue.trim() !== '';

  return sendResponse(res, 200, {
    ok: true,
    authenticated: true,
    wif: true,
    firestoreAccess: true,
    profileFound: true,
    firmIdPresent,
  });
}
