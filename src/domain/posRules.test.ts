import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderTotals, canTransitionItem, canTransitionOrder, canTransitionTable, paymentState, splitAmounts } from './posRules.ts';

test('server totals ignore client totals and calculate discount then tax', () => {
  assert.deepEqual(calculateOrderTotals([{ price: 10_000, quantity: 2 }], 10, 1800), { subtotal: 20_000, discount: 2_000, tax: 3_240, total: 21_240 });
});

test('state machines reject backwards and terminal transitions', () => {
  assert.equal(canTransitionOrder('active', 'preparing'), true);
  assert.equal(canTransitionOrder('completed', 'active'), false);
  assert.equal(canTransitionItem('ready', 'served'), true);
  assert.equal(canTransitionItem('served', 'preparing'), false);
});

test('table state changes cannot bypass order settlement or cleaning', () => {
  assert.equal(canTransitionTable('available', 'reserved'), true);
  assert.equal(canTransitionTable('occupied', 'billing'), true);
  assert.equal(canTransitionTable('billing', 'cleaning'), false);
  assert.equal(canTransitionTable('occupied', 'available'), false);
});

test('payment state supports partial settlement and rejects overpayment', () => {
  assert.equal(paymentState(10_000, 4_000), 'partially_paid');
  assert.equal(paymentState(10_000, 10_000), 'paid');
  assert.throws(() => paymentState(10_000, 10_001));
});

test('split amounts reconcile exactly without rounding overpayment', () => {
  const shares = splitAmounts(10_000, 3);
  assert.deepEqual(shares, [3334, 3333, 3333]);
  assert.equal(shares.reduce((sum, value) => sum + value, 0), 10_000);
});
