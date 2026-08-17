import type { IncomingMessage, ServerResponse } from 'http';

interface VercelResponse extends ServerResponse {
  status?: (statusCode: number) => VercelResponse;
  json?: (body: unknown) => void;
}

export default function handler(
  _req: IncomingMessage,
  res: VercelResponse
) {
  if (typeof res.status === 'function' && typeof res.json === 'function') {
    return res.status(200).json({
      ok: true,
      service: 'advodesk-backend',
    });
  }

  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json');
  res.end(
    JSON.stringify({
      ok: true,
      service: 'advodesk-backend',
    })
  );
}
