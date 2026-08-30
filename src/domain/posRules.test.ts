import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateOrderTotals, canTransitionItem, canTransitionOrder, canTransitionTable, normalizeCurrency, normalizeModifierGroups, paymentState, priceModifierSelections, splitAmounts } from './posRules.ts';

test('server totals ignore client totals and calculate discount then tax', () => {
  assert.deepEqual(calculateOrderTotals([{ price: 10_000, quantity: 2 }], 10, 1800), { subtotal: 20_000, discount: 2_000, tax: 3_240, total: 21_240 });
});

test('normalizes three-letter currency codes and rejects malformed values', () => {
  assert.equal(normalizeCurrency(' ugx '), 'UGX');
  assert.equal(normalizeCurrency('usd'), 'USD');
  assert.throws(() => normalizeCurrency('UG'), /three-letter ISO code/);
  assert.throws(() => normalizeCurrency('US Dollar'), /three-letter ISO code/);
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

test('modifier selections enforce limits and use server prices', () => {
  const groups = [{ name: 'Protein', minSelections: 1, maxSelections: 2, choices: [{ name: 'Chicken', price: 2_000 }, { name: 'Beef', price: 3_000 }] }];
  assert.equal(priceModifierSelections(groups, 'Protein: Chicken, Protein: Beef'), 5_000);
  assert.throws(() => priceModifierSelections(groups, ''), /requires 1 to 2/);
  assert.throws(() => priceModifierSelections(groups, 'Protein: Fake'), /unavailable/);
});

test('modifier definitions reject duplicate groups and choices', () => {
  assert.throws(() => normalizeModifierGroups([{ name: 'Size', choices: [{ name: 'Large', price: 0 }, { name: 'Large', price: 1 }] }]), /invalid or duplicate/);
  assert.throws(() => normalizeModifierGroups([{ name: 'Size', choices: [{ name: 'Large', price: 0 }] }, { name: 'size', choices: [{ name: 'Small', price: 0 }] }]), /unique name/);
});
