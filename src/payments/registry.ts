import { cashAdapter } from './cashAdapter.ts';
import type { PaymentAdapter, PaymentProvider } from './types.ts';

const adapters = new Map<PaymentProvider, PaymentAdapter>([['cash', cashAdapter]]);

export function paymentAdapter(provider: PaymentProvider): PaymentAdapter {
  const adapter = adapters.get(provider);
  if (!adapter) throw new Error(`${provider.replaceAll('_', ' ')} is not configured for live processing`);
  return adapter;
}

export function availablePaymentProviders(currency: string, country = 'UG') {
  return ([...adapters.values()]).filter(adapter => adapter.supports(currency, country)).map(adapter => ({ provider: adapter.provider, asynchronous: adapter.asynchronous }));
}
