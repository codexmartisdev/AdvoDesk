import type { IncomingMessage, ServerResponse } from 'http';
import {
  verifyFirebaseBearerToken,
  FirebaseAuthError,
} from './_lib/firebase-auth.js';

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
    const verified = await verifyFirebaseBearerToken(req);

    return sendResponse(res, 200, {
      ok: true,
      authenticated: true,
      uidPresent: Boolean(verified.uid),
    });
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
}
