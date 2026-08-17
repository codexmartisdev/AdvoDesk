import type { IncomingMessage, ServerResponse } from 'http';

interface VercelResponse extends ServerResponse {
  status?: (statusCode: number) => VercelResponse;
  json?: (body: unknown) => void;
}

export default function handler(
  req: IncomingMessage,
  res: VercelResponse
) {
  if (req.method !== 'GET') {
    if (typeof res.status === 'function' && typeof res.json === 'function') {
      return res.status(405).json({
        ok: false,
        error: 'Method Not Allowed',
      });
    }

    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    return res.end(
      JSON.stringify({
        ok: false,
        error: 'Method Not Allowed',
      })
    );
  }

  const oidcHeader = req.headers['x-vercel-oidc-token'];
  const oidcTokenPresent = Boolean(
    Array.isArray(oidcHeader) ? oidcHeader.length > 0 && Boolean(oidcHeader[0]) : Boolean(oidcHeader)
  );

  const payload = {
    ok: true,
    oidcTokenPresent,
  };

  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json(payload);
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}
