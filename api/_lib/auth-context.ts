import type { IncomingMessage } from 'http';
import {
  verifyFirebaseBearerToken,
  FirebaseAuthError,
  type VerifiedFirebaseUser,
} from './firebase-auth.js';
import {
  getServiceAccountAccessToken,
  WifAuthError,
  type WifTokenResult,
} from './gcp-wif.js';

export interface AuthenticatedContext {
  uid: string;
  firmId: string;
  serviceAccountAccessToken: string;
}

export type AuthContextStage =
  | 'authorization_header'
  | 'firebase_id_token'
  | 'vercel_oidc'
  | 'google_sts'
  | 'service_account_impersonation'
  | 'user_profile'
  | 'firestore'
  | 'tenant_context';

export class AuthContextError extends Error {
  readonly stage: AuthContextStage;
  readonly status?: number;

  constructor(stage: AuthContextStage, status?: number) {
    super(`Authentication context resolution failed at stage: ${stage}`);
    this.name = 'AuthContextError';
    this.stage = stage;
    this.status = status;
  }
}

const PROJECT_ID = 'gen-lang-client-0365371352';
const DATABASE_ID =
  'ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be';

export async function getAuthenticatedContext(
  req: IncomingMessage
): Promise<AuthenticatedContext> {
  // 1. Validate Firebase ID Token
  let verified: VerifiedFirebaseUser;
  try {
    verified = await verifyFirebaseBearerToken(req);
  } catch (err) {
    if (err instanceof FirebaseAuthError) {
      throw new AuthContextError(err.stage, 401);
    }
    throw new AuthContextError('firebase_id_token', 401);
  }

  // 2. Obtain service account credentials via Workload Identity Federation
  let wifResult: WifTokenResult;
  try {
    wifResult = await getServiceAccountAccessToken(req);
  } catch (err) {
    if (err instanceof WifAuthError) {
      throw new AuthContextError(err.stage, err.status);
    }
    throw new AuthContextError('service_account_impersonation', 502);
  }

  // 3. Read users/{uid} document from named Firestore database using verified UID
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
    throw new AuthContextError('firestore', 502);
  }

  if (firestoreRes.status === 404) {
    throw new AuthContextError('user_profile', 404);
  }

  if (!firestoreRes.ok) {
    throw new AuthContextError('firestore', firestoreRes.status);
  }

  let docData: { fields?: Record<string, { stringValue?: string }> };
  try {
    docData = (await firestoreRes.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
  } catch (_jsonErr) {
    throw new AuthContextError('firestore', 502);
  }

  const firmIdValue = docData?.fields?.firmId?.stringValue;
  if (typeof firmIdValue !== 'string' || firmIdValue.trim() === '') {
    throw new AuthContextError('tenant_context', 403);
  }

  return {
    uid: verified.uid,
    firmId: firmIdValue.trim(),
    serviceAccountAccessToken: wifResult.accessToken,
  };
}
