import type { PaymentAdapter } from './types.ts';

export const cashAdapter: PaymentAdapter = {
  provider: 'cash',
  asynchronous: false,
  supports: (currency, country) => currency === 'UGX' && country === 'UG',
  async initiate(context) {
    return { status: 'succeeded', providerReference: context.externalReference, sanitizedResponse: { acceptedAt: new Date().toISOString(), method: 'cash' } };
  },
};
