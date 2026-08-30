import assert from 'node:assert/strict';
import test from 'node:test';
import { availablePaymentProviders, paymentAdapter } from './registry.ts';

test('cash is available for Uganda while unconfigured remote providers fail closed', async () => {
  assert.deepEqual(availablePaymentProviders('UGX'), [{ provider: 'cash', asynchronous: false }]);
  assert.throws(() => paymentAdapter('mtn_momo_uganda'), /not configured/);
  assert.throws(() => paymentAdapter('airtel_money_uganda'), /not configured/);
  assert.throws(() => paymentAdapter('card'), /not configured/);
  assert.equal((await paymentAdapter('cash').initiate({ intentId: 1, externalReference: 'cash-1', amount: 1000, currency: 'UGX', orderNumber: 'KLA-1' })).status, 'succeeded');
});
