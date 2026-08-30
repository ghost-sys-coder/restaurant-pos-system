import assert from 'node:assert/strict';
import test from 'node:test';
import { permissionsForRole, roleHasPermission } from './permissions.ts';

test('front-of-house roles cannot access administration or reports', () => {
  for (const role of ['cashier', 'server', 'bartender', 'host', 'kitchen'] as const) {
    assert.equal(roleHasPermission(role, 'staff.manage'), false, `${role} must not manage staff`);
    assert.equal(roleHasPermission(role, 'terminals.manage'), false, `${role} must not manage terminals`);
    assert.equal(roleHasPermission(role, 'menu.manage'), false, `${role} must not manage the menu`);
    assert.equal(roleHasPermission(role, 'reports.view'), false, `${role} must not see financial reports`);
  }
});

test('payment and order-cancellation privileges stay manager-scoped', () => {
  assert.equal(roleHasPermission('server', 'payments.process'), false);
  assert.equal(roleHasPermission('cashier', 'payments.process'), true);
  assert.equal(roleHasPermission('cashier', 'payments.refund'), false);
  assert.equal(roleHasPermission('shift_manager', 'payments.refund'), true);
  assert.equal(roleHasPermission('server', 'orders.cancel'), false);
  assert.equal(roleHasPermission('shift_manager', 'orders.cancel'), true);
});

test('accountants are read-only and returned permission arrays cannot mutate policy', () => {
  const permissions = permissionsForRole('accountant');
  assert.deepEqual(permissions, ['orders.read', 'reports.view']);
  permissions.push('staff.manage');
  assert.equal(roleHasPermission('accountant', 'staff.manage'), false);
});
