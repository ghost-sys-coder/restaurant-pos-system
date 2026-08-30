import assert from 'node:assert/strict';
import test from 'node:test';
import { buildInvitationRedirectUrl } from './invitationRedirect.ts';

test('pins invitations to the configured application origin', () => {
  assert.equal(buildInvitationRedirectUrl('https://vcpos.veilcode.studio/', 'https://temporary.vercel.app'), 'https://vcpos.veilcode.studio/accept-invitation');
});

test('falls back to the request origin and rejects unsafe schemes', () => {
  assert.equal(buildInvitationRedirectUrl('', 'http://localhost:3000'), 'http://localhost:3000/accept-invitation');
  assert.throws(() => buildInvitationRedirectUrl('javascript:alert(1)', 'https://safe.example'), /http/);
});
