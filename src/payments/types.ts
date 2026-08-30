export type PaymentProvider = 'cash' | 'mtn_momo_uganda' | 'airtel_money_uganda' | 'card';
export type PaymentIntentStatus = 'created' | 'awaiting_customer' | 'processing' | 'succeeded' | 'failed' | 'expired' | 'cancelled';

export interface PaymentAdapterContext {
  intentId: number;
  externalReference: string;
  amount: number;
  currency: string;
  orderNumber: string;
  customerPhone?: string;
}

export interface PaymentAdapterResult {
  status: PaymentIntentStatus;
  providerReference?: string;
  expiresAt?: Date;
  sanitizedResponse?: Record<string, unknown>;
}

export interface PaymentAdapter {
  readonly provider: PaymentProvider;
  readonly asynchronous: boolean;
  supports(currency: string, country: string): boolean;
  initiate(context: PaymentAdapterContext): Promise<PaymentAdapterResult>;
  lookup?(externalReference: string): Promise<PaymentAdapterResult>;
}
