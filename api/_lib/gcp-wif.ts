import type { IncomingMessage } from 'http';

export type WifStage =
  | 'vercel_oidc'
  | 'google_sts'
  | 'service_account_impersonation';

export class WifAuthError extends Error {
  readonly stage: WifStage;
  readonly status?: number;

  constructor(stage: WifStage, status?: number) {
    super(`WIF authentication failed at stage: ${stage}`);
    this.name = 'WifAuthError';
    this.stage = stage;
    this.status = status;
  }
}

export interface WifTokenResult {
  accessToken: string;
  expireTime?: string;
}

const PROJECT_NUMBER = '157712620388';
const WORKLOAD_IDENTITY_POOL = 'advodesk-vercel';
const PROVIDER = 'vercel';
const SERVICE_ACCOUNT =
  'advodesk-backend@gen-lang-client-0365371352.iam.gserviceaccount.com';

const AUDIENCE = `//iam.googleapis.com/projects/${PROJECT_NUMBER}/locations/global/workloadIdentityPools/${WORKLOAD_IDENTITY_POOL}/providers/${PROVIDER}`;
const STS_URL = 'https://sts.googleapis.com/v1/token';
const SERVICE_ACCOUNT_URL = `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${SERVICE_ACCOUNT}:generateAccessToken`;

export async function getServiceAccountAccessToken(
  req: IncomingMessage
): Promise<WifTokenResult> {
  const oidcHeader = req.headers['x-vercel-oidc-token'];
  const oidcToken = Array.isArray(oidcHeader) ? oidcHeader[0] : oidcHeader;

  if (!oidcToken || typeof oidcToken !== 'string' || oidcToken.trim() === '') {
    throw new WifAuthError('vercel_oidc');
  }

  // 1. Google Security Token Service (STS) exchange
  let stsRes: Response;
  try {
    const stsParams = new URLSearchParams();
    stsParams.append('audience', AUDIENCE);
    stsParams.append(
      'grant_type',
      'urn:ietf:params:oauth:grant-type:token-exchange'
    );
    stsParams.append(
      'requested_token_type',
      'urn:ietf:params:oauth:token-type:access_token'
    );
    stsParams.append(
      'scope',
      'https://www.googleapis.com/auth/cloud-platform'
    );
    stsParams.append(
      'subject_token_type',
      'urn:ietf:params:oauth:token-type:jwt'
    );
    stsParams.append('subject_token', oidcToken);

    stsRes = await fetch(STS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stsParams.toString(),
    });
  } catch (_err) {
    console.error('[gcp-wif] Failed to connect to Google STS endpoint.');
    throw new WifAuthError('google_sts', 502);
  }

  if (!stsRes.ok) {
    console.error(
      `[gcp-wif] Google STS exchange failed with status ${stsRes.status}`
    );
    throw new WifAuthError('google_sts', stsRes.status);
  }

  let stsData: { access_token?: string };
  try {
    stsData = (await stsRes.json()) as { access_token?: string };
  } catch (_jsonErr) {
    console.error('[gcp-wif] Failed to parse Google STS response as JSON.');
    throw new WifAuthError('google_sts', stsRes.status);
  }

  if (!stsData.access_token) {
    console.error(
      '[gcp-wif] Google STS returned 200 but no access_token found.'
    );
    throw new WifAuthError('google_sts', stsRes.status);
  }

  // 2. Service Account impersonation via IAM Credentials API
  let impersonateRes: Response;
  try {
    impersonateRes = await fetch(SERVICE_ACCOUNT_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${stsData.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        scope: ['https://www.googleapis.com/auth/cloud-platform'],
      }),
    });
  } catch (_err) {
    console.error(
      '[gcp-wif] Failed to connect to IAM Credentials endpoint.'
    );
    throw new WifAuthError('service_account_impersonation', 502);
  }

  if (!impersonateRes.ok) {
    console.error(
      `[gcp-wif] Service account impersonation failed with status ${impersonateRes.status}`
    );
    throw new WifAuthError(
      'service_account_impersonation',
      impersonateRes.status
    );
  }

  let impersonateData: { accessToken?: string; expireTime?: string };
  try {
    impersonateData = (await impersonateRes.json()) as {
      accessToken?: string;
      expireTime?: string;
    };
  } catch (_jsonErr) {
    console.error(
      '[gcp-wif] Failed to parse IAM Credentials response as JSON.'
    );
    throw new WifAuthError(
      'service_account_impersonation',
      impersonateRes.status
    );
  }

  if (!impersonateData.accessToken) {
    console.error(
      '[gcp-wif] IAM Credentials returned 200 but no accessToken found.'
    );
    throw new WifAuthError(
      'service_account_impersonation',
      impersonateRes.status
    );
  }

  return {
    accessToken: impersonateData.accessToken,
    expireTime: impersonateData.expireTime,
  };
}
