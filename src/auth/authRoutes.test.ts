import assert from 'node:assert/strict';
import test from 'node:test';
import { authRouteForPath } from './authRoutes.ts';

test('keeps Clerk nested invitation steps mounted', () => {
  assert.equal(authRouteForPath('/accept-invitation'), 'invitation');
  assert.equal(authRouteForPath('/accept-invitation/verify-email-address'), 'invitation');
  assert.equal(authRouteForPath('/accept-invitation/factor-one'), 'invitation');
});

test('keeps nested sign-in and sign-up steps on their correct component', () => {
  assert.equal(authRouteForPath('/sign-in/factor-one'), 'sign-in');
  assert.equal(authRouteForPath('/sign-up/verify-email-address'), 'sign-up');
  assert.equal(authRouteForPath('/'), 'landing');
});
