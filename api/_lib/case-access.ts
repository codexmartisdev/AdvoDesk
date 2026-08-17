import type { AuthenticatedContext } from './auth-context.js';

export type CaseAccessStage =
  | 'invalid_case_id'
  | 'case_not_found'
  | 'firestore'
  | 'case_tenant';

export class CaseAccessError extends Error {
  readonly stage: CaseAccessStage;
  readonly status?: number;

  constructor(stage: CaseAccessStage, status?: number) {
    super(`Case access verification failed at stage: ${stage}`);
    this.name = 'CaseAccessError';
    this.stage = stage;
    this.status = status;
  }
}

const PROJECT_ID = 'gen-lang-client-0365371352';
const DATABASE_ID =
  'ai-studio-bizerranetoadvoc-3ceabbf7-259b-4a9e-b48e-0ede91e287be';

export async function assertCaseTenantAccess(
  context: AuthenticatedContext,
  caseId: string
): Promise<void> {
  // 1. Defensive validation of resource identifier
  if (typeof caseId !== 'string') {
    throw new CaseAccessError('invalid_case_id', 400);
  }

  const normalizedCaseId = caseId.trim();
  if (normalizedCaseId === '' || normalizedCaseId.length > 512) {
    throw new CaseAccessError('invalid_case_id', 400);
  }

  // 2. Build URL for named Firestore database
  const encodedCaseId = encodeURIComponent(normalizedCaseId);
  const firestoreUrl = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/${DATABASE_ID}/documents/cases/${encodedCaseId}?mask.fieldPaths=firmId`;

  // 3. Fetch case document using server-side service account token
  let firestoreRes: Response;
  try {
    firestoreRes = await fetch(firestoreUrl, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${context.serviceAccountAccessToken}`,
      },
    });
  } catch (_err) {
    throw new CaseAccessError('firestore', 502);
  }

  if (firestoreRes.status === 404) {
    throw new CaseAccessError('case_not_found', 404);
  }

  if (!firestoreRes.ok) {
    throw new CaseAccessError('firestore', firestoreRes.status);
  }

  // 4. Parse Firestore response internally
  let docData: { fields?: Record<string, { stringValue?: string }> };
  try {
    docData = (await firestoreRes.json()) as {
      fields?: Record<string, { stringValue?: string }>;
    };
  } catch (_jsonErr) {
    throw new CaseAccessError('firestore', 502);
  }

  const caseFirmId = docData?.fields?.firmId?.stringValue;
  if (typeof caseFirmId !== 'string' || caseFirmId.trim() === '') {
    throw new CaseAccessError('case_tenant', 403);
  }

  // 5. Compare resolved case firmId with authenticated user context firmId
  if (caseFirmId.trim() !== context.firmId.trim()) {
    throw new CaseAccessError('case_tenant', 403);
  }
}
