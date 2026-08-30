import assert from 'node:assert/strict';
import test from 'node:test';
import { errorCodeForStatus, requestIdFromHeader, structuredErrorBody } from './httpDiagnostics.ts';

test('assigns stable generic codes for HTTP errors', () => {
  assert.equal(errorCodeForStatus(400), 'BAD_REQUEST');
  assert.equal(errorCodeForStatus(409), 'CONFLICT');
  assert.equal(errorCodeForStatus(599), 'INTERNAL_ERROR');
});

test('accepts safe upstream request IDs and rejects unsafe values', () => {
  assert.equal(requestIdFromHeader('terminal-1234'), 'terminal-1234');
  assert.match(requestIdFromHeader('bad value with spaces'), /^[0-9a-f-]{36}$/);
});

test('normalizes error responses without replacing specific codes', () => {
  assert.deepEqual(structuredErrorBody({ error: 'Missing order' }, 404, 'request-123'), {
    error: 'Missing order', code: 'NOT_FOUND', requestId: 'request-123',
  });
  assert.deepEqual(structuredErrorBody({ error: 'Locked', code: 'STAFF_LOCKED' }, 429, 'request-456'), {
    error: 'Locked', code: 'STAFF_LOCKED', requestId: 'request-456',
  });
  assert.deepEqual(structuredErrorBody({ ok: true }, 200, 'request-789'), { ok: true });
});

