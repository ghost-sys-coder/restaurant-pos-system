import assert from 'node:assert/strict';
import test from 'node:test';
import { membershipRemovalError } from './clientLifecycle.ts';

const ownerRole = 'org:restaurant_owner';

test('prevents removal of the final restaurant owner', () => {
  assert.equal(membershipRemovalError([{ userId: 'owner-1', role: ownerRole }], 'owner-1', ownerRole), 'Add another restaurant owner before removing the last owner');
});

test('allows owner removal after another owner exists', () => {
  assert.equal(membershipRemovalError([{ userId: 'owner-1', role: ownerRole }, { userId: 'owner-2', role: ownerRole }], 'owner-1', ownerRole), null);
});

test('rejects a member selector outside the organization', () => {
  assert.equal(membershipRemovalError([{ userId: 'admin-1', role: 'org:restaurant_admin' }], 'admin-2', ownerRole), 'Organization member not found');
});
