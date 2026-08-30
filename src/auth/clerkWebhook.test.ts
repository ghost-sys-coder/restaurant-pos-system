import assert from 'node:assert/strict';
import test from 'node:test';
import { isBootstrapPlatformMembership, membershipRole, publicClerkName } from './clerkWebhook.ts';

test('maps supported Clerk membership roles and fails closed for unknown roles', () => {
  const base = { eventId: 'evt_1', organizationId: 'org_1', clerkUserId: 'user_1' } as const;
  assert.equal(membershipRole({ ...base, eventType: 'organizationMembership.updated', clerkRole: 'org:restaurant_admin' }), 'restaurant_admin');
  assert.equal(membershipRole({ ...base, eventType: 'organizationMembership.updated', clerkRole: 'org:unknown' }), null);
  assert.equal(membershipRole({ ...base, eventType: 'organizationMembership.deleted', clerkRole: 'org:restaurant_owner' }), null);
});

test('builds a safe membership display name', () => {
  assert.equal(publicClerkName({ first_name: 'Amina', last_name: 'N.' }), 'Amina N.');
  assert.equal(publicClerkName({ identifier: 'owner@example.com' }), 'owner@example.com');
});

test('identifies the temporary platform membership used to create a client organization', () => {
  assert.equal(isBootstrapPlatformMembership('user_platform', 'user_platform'), true);
  assert.equal(isBootstrapPlatformMembership('user_platform', 'user_restaurant_owner'), false);
  assert.equal(isBootstrapPlatformMembership(null, 'user_platform'), false);
});
