import { randomUUID } from 'node:crypto';
import { and, eq, sql } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { ledgerEntries, orders, paymentAttempts, paymentIntents, payments, restaurantTables } from './schema.ts';
import { paymentAdapter } from '../payments/registry.ts';
import type { PaymentProvider } from '../payments/types.ts';
import { enqueuePrintJobs } from './printing.ts';
import { getOrderById } from './queries.ts';

export async function listAvailableMethods(currency: string) {
  const { availablePaymentProviders } = await import('../payments/registry.ts');
  return availablePaymentProviders(currency);
}

export async function createPaymentIntent(input: { restaurantId: number; locationId: number; terminalId: number; staffId: number; orderId: number; provider: PaymentProvider; amount: number; idempotencyKey: string; tenderedAmount?: number }) {
  if (!/^[A-Za-z0-9_-]{8,100}$/.test(input.idempotencyKey)) throw new Error('A valid payment idempotency key is required');
  const amount = Number(input.amount); if (!Number.isSafeInteger(amount) || amount <= 0) throw new Error('Payment amount must be a positive whole minor-unit amount');
  const adapter = paymentAdapter(input.provider);
  const existing = (await db.select().from(paymentIntents).where(and(eq(paymentIntents.idempotencyKey, input.idempotencyKey), eq(paymentIntents.restaurantId, input.restaurantId), eq(paymentIntents.locationId, input.locationId))).limit(1))[0];
  if (existing && existing.status !== 'created') return { intent: existing, order: await getOrderById(input.restaurantId, input.locationId, existing.orderId), replayed: true };

  let created: typeof paymentIntents.$inferSelect;
  if (existing) created = existing;
  else try { created = await withTransaction(async tx => {
    await tx.execute(sql`select ${orders.id} from ${orders} where ${orders.id} = ${input.orderId} and ${orders.restaurantId} = ${input.restaurantId} and ${orders.locationId} = ${input.locationId} for update`);
    const order = (await tx.select().from(orders).where(and(eq(orders.id, input.orderId), eq(orders.restaurantId, input.restaurantId), eq(orders.locationId, input.locationId))).limit(1))[0];
    if (!order) throw new Error('Order not found');
    if (['completed', 'cancelled'].includes(order.status || '') || order.paymentStatus === 'paid') throw new Error('This order is not payable');
    if (!adapter.supports(order.currency, 'UG')) throw new Error(`${input.provider.replaceAll('_', ' ')} does not support ${order.currency} in Uganda`);
    const paid = (await tx.select({ amount: payments.amount }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, 'success')))).reduce((sum, tender) => sum + tender.amount, 0);
    const pending = (await tx.select({ amount: paymentIntents.amount, status: paymentIntents.status }).from(paymentIntents).where(eq(paymentIntents.orderId, order.id))).filter(intent => ['created', 'awaiting_customer', 'processing'].includes(intent.status)).reduce((sum, intent) => sum + intent.amount, 0);
    const due = order.total - paid - pending;
    if (amount > due) throw new Error('Payment exceeds the outstanding balance');
    if (input.provider === 'cash' && (!Number.isSafeInteger(input.tenderedAmount) || input.tenderedAmount! < amount)) throw new Error('Cash tendered must cover the payment amount');
    return (await tx.insert(paymentIntents).values({ restaurantId: input.restaurantId, locationId: input.locationId, orderId: order.id, provider: input.provider, method: input.provider, amount, currency: order.currency, status: 'created', idempotencyKey: input.idempotencyKey, externalReference: randomUUID(), createdByStaffId: input.staffId }).returning())[0];
  }); } catch (error) {
    const replay = (await db.select().from(paymentIntents).where(and(eq(paymentIntents.idempotencyKey, input.idempotencyKey), eq(paymentIntents.restaurantId, input.restaurantId), eq(paymentIntents.locationId, input.locationId))).limit(1))[0];
    if (replay) return createPaymentIntent(input);
    throw error;
  }

  const adapterResult = await adapter.initiate({ intentId: created.id, externalReference: created.externalReference!, amount, currency: created.currency, orderNumber: String(input.orderId) });
  if (adapterResult.status !== 'succeeded') {
    const intent = (await db.update(paymentIntents).set({ status: adapterResult.status, expiresAt: adapterResult.expiresAt, updatedAt: new Date() }).where(eq(paymentIntents.id, created.id)).returning())[0];
    await db.insert(paymentAttempts).values({ paymentIntentId: created.id, attemptNumber: 1, status: adapterResult.status, sanitizedResponse: adapterResult.sanitizedResponse });
    return { intent, order: await getOrderById(input.restaurantId, input.locationId, input.orderId), replayed: Boolean(existing) };
  }

  await withTransaction(async tx => {
    await tx.execute(sql`select ${paymentIntents.id} from ${paymentIntents} where ${paymentIntents.id} = ${created.id} for update`);
    const intent = (await tx.select().from(paymentIntents).where(eq(paymentIntents.id, created.id)).limit(1))[0];
    if (intent.status === 'succeeded') return;
    await tx.execute(sql`select ${orders.id} from ${orders} where ${orders.id} = ${intent.orderId} for update`);
    const order = (await tx.select().from(orders).where(and(eq(orders.id, intent.orderId), eq(orders.restaurantId, input.restaurantId), eq(orders.locationId, input.locationId))).limit(1))[0];
    if (!order) throw new Error('Order not found while posting payment');
    const paid = (await tx.select({ amount: payments.amount }).from(payments).where(and(eq(payments.orderId, order.id), eq(payments.status, 'success')))).reduce((sum, tender) => sum + tender.amount, 0);
    if (intent.amount > order.total - paid) throw new Error('Payment exceeds the outstanding balance');
    await tx.insert(paymentAttempts).values({ paymentIntentId: intent.id, attemptNumber: 1, status: 'succeeded', sanitizedResponse: adapterResult.sanitizedResponse });
    await tx.insert(payments).values({ orderId: order.id, amount: intent.amount, tip: 0, method: intent.method, transactionRef: adapterResult.providerReference, status: 'success', processedByStaffId: input.staffId, idempotencyKey: `intent-${intent.id}`, tenderedAmount: input.tenderedAmount });
    await tx.insert(ledgerEntries).values({ restaurantId: input.restaurantId, locationId: input.locationId, orderId: order.id, paymentIntentId: intent.id, entryType: 'tender', amount: intent.amount, currency: intent.currency, idempotencyKey: `intent-${intent.id}-tender`, actorStaffId: input.staffId, metadata: { provider: intent.provider } });
    const isPaid = paid + intent.amount === order.total;
    await tx.update(paymentIntents).set({ status: 'succeeded', updatedAt: new Date() }).where(eq(paymentIntents.id, intent.id));
    await tx.update(orders).set({ paymentStatus: isPaid ? 'paid' : 'partially_paid', paymentMethod: isPaid && paid === 0 ? intent.method : 'split', status: isPaid ? 'completed' : order.status, completedAt: isPaid ? new Date() : null, version: order.version + 1 }).where(eq(orders.id, order.id));
    if (isPaid && order.tableId) await tx.update(restaurantTables).set({ status: 'cleaning', currentOrderId: null }).where(and(eq(restaurantTables.id, order.tableId), eq(restaurantTables.locationId, input.locationId)));
    if (isPaid) await enqueuePrintJobs(tx, { restaurantId: input.restaurantId, locationId: input.locationId, terminalId: input.terminalId, orderId: order.id, jobType: 'receipt', eventKey: `payment-intent:${intent.id}:receipt`, stations: [], payload: { orderId: order.id, orderNumber: order.orderNumber, total: order.total, currency: order.currency, method: intent.method } });
  });
  const intent = (await db.select().from(paymentIntents).where(eq(paymentIntents.id, created.id)).limit(1))[0];
  return { intent, order: await getOrderById(input.restaurantId, input.locationId, input.orderId), replayed: Boolean(existing) };
}

export async function getPaymentIntent(restaurantId: number, locationId: number, id: number) {
  return (await db.select().from(paymentIntents).where(and(eq(paymentIntents.id, id), eq(paymentIntents.restaurantId, restaurantId), eq(paymentIntents.locationId, locationId))).limit(1))[0] ?? null;
}
