import type { IncomingMessage } from 'http';
import { initializeApp, getApps, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export type FirebaseAuthStage = 'authorization_header' | 'firebase_id_token';

export class FirebaseAuthError extends Error {
  readonly stage: FirebaseAuthStage;

  constructor(stage: FirebaseAuthStage) {
    super(`Firebase auth verification failed at stage: ${stage}`);
    this.name = 'FirebaseAuthError';
    this.stage = stage;
  }
}

export interface VerifiedFirebaseUser {
  uid: string;
}

const PROJECT_ID = 'gen-lang-client-0365371352';
const APP_NAME = 'advodesk-admin-auth';

function getAdminApp(): App {
  const existingApp = getApps().find((app) => app.name === APP_NAME);
  if (existingApp) {
    return existingApp;
  }

  return initializeApp(
    {
      projectId: PROJECT_ID,
    },
    APP_NAME
  );
}

export async function verifyFirebaseBearerToken(
  req: IncomingMessage
): Promise<VerifiedFirebaseUser> {
  const authHeader = req.headers.authorization;
  if (!authHeader || typeof authHeader !== 'string') {
    throw new FirebaseAuthError('authorization_header');
  }

  const parts = authHeader.trim().split(/\s+/);
  if (parts.length !== 2 || parts[0] !== 'Bearer' || !parts[1]) {
    throw new FirebaseAuthError('authorization_header');
  }

  const idToken = parts[1];

  try {
    const adminApp = getAdminApp();
    const auth = getAuth(adminApp);
    const decodedToken = await auth.verifyIdToken(idToken, false);

    if (!decodedToken || typeof decodedToken.uid !== 'string' || !decodedToken.uid) {
      throw new FirebaseAuthError('firebase_id_token');
    }

    return {
      uid: decodedToken.uid,
    };
  } catch (_err) {
    throw new FirebaseAuthError('firebase_id_token');
  }
}
