import { and, asc, eq, inArray, lte, or, sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { db, withTransaction } from './index.ts';
import { printJobs, printerProfiles } from './schema.ts';

export async function listPrinterProfiles(restaurantId: number, locationId: number) {
  return db.select().from(printerProfiles).where(and(eq(printerProfiles.restaurantId, restaurantId), eq(printerProfiles.locationId, locationId))).orderBy(printerProfiles.name);
}

export async function createPrinterProfile(input: { restaurantId: number; locationId: number; name: string; jobType: string; connectionType: string; address?: string; stations: string[] }) {
  return (await db.insert(printerProfiles).values({ ...input, address: input.address || null, stationsJson: JSON.stringify(input.stations), isActive: true }).returning())[0];
}

export async function enqueuePrintJobs(transaction: any, input: { restaurantId: number; locationId: number; terminalId?: number; orderId?: number; jobType: 'kitchen' | 'receipt'; eventKey: string; payload: Record<string, unknown>; stations?: string[] }) {
  const profiles = await transaction.select().from(printerProfiles).where(and(eq(printerProfiles.restaurantId, input.restaurantId), eq(printerProfiles.locationId, input.locationId), eq(printerProfiles.jobType, input.jobType), eq(printerProfiles.isActive, true)));
  const selected = profiles.filter((profile: any) => {
    if (input.jobType !== 'kitchen' || !input.stations?.length) return true;
    try { const routed = JSON.parse(profile.stationsJson || '[]'); return !routed.length || routed.some((station: string) => input.stations!.includes(station)); } catch { return false; }
  });
  if (!selected.length) return [];
  return transaction.insert(printJobs).values(selected.map((profile: any) => ({ restaurantId: input.restaurantId, locationId: input.locationId, terminalId: input.terminalId, printerProfileId: profile.id, orderId: input.orderId, jobType: input.jobType, idempotencyKey: `${input.eventKey}:printer:${profile.id}`, payload: input.payload }))).onConflictDoNothing().returning();
}

export async function listPrintJobs(restaurantId: number, locationId: number, statuses = ['pending', 'processing', 'failed']) {
  return db.select().from(printJobs).where(and(eq(printJobs.restaurantId, restaurantId), eq(printJobs.locationId, locationId), inArray(printJobs.status, statuses))).orderBy(asc(printJobs.createdAt)).limit(200);
}

export async function createTestPrintJob(input: { restaurantId: number; locationId: number; terminalId: number; printerProfileId: number; actorName: string }) {
  const profile = (await db.select().from(printerProfiles).where(and(eq(printerProfiles.id, input.printerProfileId), eq(printerProfiles.restaurantId, input.restaurantId), eq(printerProfiles.locationId, input.locationId), eq(printerProfiles.isActive, true))).limit(1))[0];
  if (!profile) throw new Error('Printer profile not found');
  return (await db.insert(printJobs).values({ restaurantId: input.restaurantId, locationId: input.locationId, terminalId: input.terminalId, printerProfileId: profile.id, jobType: 'test', idempotencyKey: `test:${randomUUID()}`, payload: { title: 'VC POS test print', printer: profile.name, requestedBy: input.actorName, requestedAt: new Date().toISOString() } }).returning())[0];
}

export async function claimNextPrintJob(restaurantId: number, locationId: number, terminalId: number) {
  return withTransaction(async tx => {
    const candidate = (await tx.select().from(printJobs).where(and(eq(printJobs.restaurantId, restaurantId), eq(printJobs.locationId, locationId), lte(printJobs.availableAt, new Date()), or(eq(printJobs.status, 'pending'), eq(printJobs.status, 'failed'), and(eq(printJobs.status, 'processing'), lte(printJobs.leaseExpiresAt, new Date()))))).orderBy(asc(printJobs.createdAt)).limit(1).for('update', { skipLocked: true }))[0];
    if (!candidate) return null;
    return (await tx.update(printJobs).set({ status: 'processing', terminalId, attempts: sql`${printJobs.attempts} + 1`, leaseExpiresAt: new Date(Date.now() + 60_000), lastError: null }).where(eq(printJobs.id, candidate.id)).returning())[0] || null;
  });
}

export async function completePrintJob(restaurantId: number, locationId: number, terminalId: number, id: number, success: boolean, error?: string) {
  const current = (await db.select().from(printJobs).where(and(eq(printJobs.id, id), eq(printJobs.restaurantId, restaurantId), eq(printJobs.locationId, locationId), eq(printJobs.terminalId, terminalId), eq(printJobs.status, 'processing'))).limit(1))[0];
  if (!current) throw new Error('Active print job lease not found');
  const permanentlyFailed = !success && current.attempts >= 5;
  return (await db.update(printJobs).set(success ? { status: 'succeeded', completedAt: new Date(), leaseExpiresAt: null } : { status: permanentlyFailed ? 'dead' : 'failed', lastError: String(error || 'Printer reported a failure').slice(0, 500), leaseExpiresAt: null, availableAt: new Date(Date.now() + Math.min(60_000, 2 ** current.attempts * 1000)) }).where(eq(printJobs.id, id)).returning())[0];
}

export async function retryPrintJob(restaurantId: number, locationId: number, id: number) {
  return (await db.update(printJobs).set({ status: 'pending', attempts: 0, lastError: null, availableAt: new Date(), leaseExpiresAt: null }).where(and(eq(printJobs.id, id), eq(printJobs.restaurantId, restaurantId), eq(printJobs.locationId, locationId), inArray(printJobs.status, ['failed', 'dead']))).returning())[0] || null;
}
