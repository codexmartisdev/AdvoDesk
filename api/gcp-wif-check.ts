import type { IncomingMessage, ServerResponse } from 'http';

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

const AUDIENCE =
  '//iam.googleapis.com/projects/157712620388/locations/global/workloadIdentityPools/advodesk-vercel/providers/vercel';
const STS_URL = 'https://sts.googleapis.com/v1/token';
const SERVICE_ACCOUNT_URL =
  'https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/advodesk-backend@gen-lang-client-0365371352.iam.gserviceaccount.com:generateAccessToken';

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

  const oidcHeader = req.headers['x-vercel-oidc-token'];
  const oidcToken = Array.isArray(oidcHeader) ? oidcHeader[0] : oidcHeader;

  if (!oidcToken || typeof oidcToken !== 'string' || oidcToken.trim() === '') {
    return sendResponse(res, 500, {
      ok: false,
      stage: 'vercel_oidc',
    });
  }

  // 1. Google Security Token Service (STS) exchange
  let stsRes: Response;
  try {
    const stsParams = new URLSearchParams();
    stsParams.append('audience', AUDIENCE);
    stsParams.append('grant_type', 'urn:ietf:params:oauth:grant-type:token-exchange');
    stsParams.append('requested_token_type', 'urn:ietf:params:oauth:token-type:access_token');
    stsParams.append('scope', 'https://www.googleapis.com/auth/cloud-platform');
    stsParams.append('subject_token_type', 'urn:ietf:params:oauth:token-type:jwt');
    stsParams.append('subject_token', oidcToken);

    stsRes = await fetch(STS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: stsParams.toString(),
    });
  } catch (_err) {
    console.error('[gcp-wif-check] Failed to connect to Google STS endpoint.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'google_sts',
      status: 502,
    });
  }

  if (!stsRes.ok) {
    console.error(`[gcp-wif-check] Google STS exchange failed with status ${stsRes.status}`);
    return sendResponse(res, 502, {
      ok: false,
      stage: 'google_sts',
      status: stsRes.status,
    });
  }

  let stsData: { access_token?: string };
  try {
    stsData = (await stsRes.json()) as { access_token?: string };
  } catch (_jsonErr) {
    console.error('[gcp-wif-check] Failed to parse Google STS response as JSON.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'google_sts',
      status: stsRes.status,
    });
  }

  if (!stsData.access_token) {
    console.error('[gcp-wif-check] Google STS returned 200 but no access_token found.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'google_sts',
      status: stsRes.status,
    });
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
    console.error('[gcp-wif-check] Failed to connect to IAM Credentials endpoint.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'service_account_impersonation',
      status: 502,
    });
  }

  if (!impersonateRes.ok) {
    console.error(
      `[gcp-wif-check] Service account impersonation failed with status ${impersonateRes.status}`
    );
    return sendResponse(res, 502, {
      ok: false,
      stage: 'service_account_impersonation',
      status: impersonateRes.status,
    });
  }

  let impersonateData: { accessToken?: string };
  try {
    impersonateData = (await impersonateRes.json()) as { accessToken?: string };
  } catch (_jsonErr) {
    console.error('[gcp-wif-check] Failed to parse IAM Credentials response as JSON.');
    return sendResponse(res, 502, {
      ok: false,
      stage: 'service_account_impersonation',
      status: impersonateRes.status,
    });
  }

  if (!impersonateData.accessToken) {
    console.error(
      '[gcp-wif-check] IAM Credentials returned 200 but no accessToken found.'
    );
    return sendResponse(res, 502, {
      ok: false,
      stage: 'service_account_impersonation',
      status: impersonateRes.status,
    });
  }

  return sendResponse(res, 200, {
    ok: true,
    oidcTokenPresent: true,
    stsExchange: true,
    serviceAccountImpersonation: true,
  });
}
