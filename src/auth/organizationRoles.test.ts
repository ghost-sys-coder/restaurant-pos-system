import assert from 'node:assert/strict';
import test from 'node:test';
import { appRoleForClerkRole, clerkRoleForAppRole } from './organizationRoles.ts';
import { hashPin, verifyPin } from './security.ts';

test('maps Clerk organization roles to restaurant roles', () => {
  assert.equal(appRoleForClerkRole(clerkRoleForAppRole.restaurant_owner), 'restaurant_owner');
  assert.equal(appRoleForClerkRole(clerkRoleForAppRole.restaurant_admin), 'restaurant_admin');
  assert.equal(appRoleForClerkRole(clerkRoleForAppRole.general_manager), 'general_manager');
  assert.equal(appRoleForClerkRole(clerkRoleForAppRole.accountant), 'accountant');
  assert.equal(appRoleForClerkRole('org:unknown'), null);
});

test('retains default Clerk role compatibility during rollout', () => {
  assert.equal(appRoleForClerkRole('org:admin'), 'restaurant_owner');
  assert.equal(appRoleForClerkRole('org:member'), 'restaurant_admin');
});

test('PIN hashes verify without containing the PIN', async () => {
  const hash = await hashPin('4826');
  assert.equal(hash.includes('4826'), false);
  assert.equal(await verifyPin('4826', hash), true);
  assert.equal(await verifyPin('4827', hash), false);
});
