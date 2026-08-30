import { randomUUID } from 'node:crypto';
import type { NextFunction, Request, Response } from 'express';

type ErrorBody = Record<string, unknown> & { error?: unknown; code?: unknown; requestId?: unknown };

const STATUS_CODES: Record<number, string> = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  422: 'VALIDATION_FAILED',
  429: 'RATE_LIMITED',
  500: 'INTERNAL_ERROR',
  502: 'UPSTREAM_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

export function errorCodeForStatus(status: number): string {
  return STATUS_CODES[status] || (status >= 500 ? 'INTERNAL_ERROR' : 'REQUEST_FAILED');
}

export function requestIdFromHeader(value: string | string[] | undefined): string {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}

export function structuredErrorBody(body: ErrorBody, status: number, requestId: string): ErrorBody {
  if (status < 400 || typeof body.error !== 'string') return body;
  return {
    ...body,
    code: typeof body.code === 'string' && body.code ? body.code : errorCodeForStatus(status),
    requestId,
  };
}

export function apiDiagnostics(req: Request, res: Response, next: NextFunction) {
  if (!req.path.startsWith('/api')) return next();

  const requestId = requestIdFromHeader(req.headers['x-request-id']);
  const startedAt = Date.now();
  res.locals.requestId = requestId;
  res.setHeader('x-request-id', requestId);

  const sendJson = res.json.bind(res);
  res.json = ((body: ErrorBody) => sendJson(structuredErrorBody(body, res.statusCode, requestId))) as Response['json'];

  res.once('finish', () => {
    if (res.statusCode < 400) return;
    console.error(JSON.stringify({
      level: res.statusCode >= 500 ? 'error' : 'warn',
      event: 'api_request_failed',
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt,
    }));
  });

  next();
}

