import { and, desc, eq, gt, isNotNull, isNull, ne, sql } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { auditEvents, restaurants, staffSessions, terminals, users } from './schema.ts';
import { hashPin, hashToken, newOpaqueToken, verifyPin } from '../auth/security.ts';

export async function ensureAccountForStaff(staffId: number) {
  const staff = await db.select().from(users).where(eq(users.id, staffId)).limit(1);
  if (!staff[0]) throw new Error('Staff profile not found');
  if (staff[0].restaurantId && staff[0].locationId) return staff[0];
  throw new Error('Staff profile is not attached to a restaurant organization');
}

export async function enrollTerminal(staffId: number, name: string, type = 'register') {
  const staff = await ensureAccountForStaff(staffId);
  if (!staff.restaurantId || !staff.locationId) throw new Error('Restaurant account is incomplete');
  const rawToken = newOpaqueToken();
  const terminal = (await db.insert(terminals).values({
    restaurantId: staff.restaurantId,
    locationId: staff.locationId,
    name,
    type,
    credentialHash: hashToken(rawToken),
    enrolledByStaffId: staff.id,
  }).returning())[0];
  await writeAudit({ terminal, actorStaffId: staff.id, action: 'terminal.enrolled', entityType: 'terminal', entityId: String(terminal.id) });
  return { terminal, rawToken };
}

export async function listLocationTerminals(locationId: number) {
  return db.select({ id: terminals.id, name: terminals.name, type: terminals.type, isActive: terminals.isActive }).from(terminals)
    .where(and(eq(terminals.locationId, locationId), eq(terminals.isActive, true), isNull(terminals.revokedAt)))
    .orderBy(terminals.name);
}

export async function authorizeTerminal(staffId: number, name: string, pin: string, type = 'register', requestedTerminalId?: number) {
  const staff = await ensureAccountForStaff(staffId);
  const locationTerminals = await db.select().from(terminals).where(and(eq(terminals.locationId, staff.locationId!), eq(terminals.isActive, true), isNull(terminals.revokedAt)));
  const requestedExisting = requestedTerminalId
    ? locationTerminals.find(terminal => terminal.id === requestedTerminalId)
    : locationTerminals.find(terminal => terminal.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (locationTerminals.length && !requestedExisting) throw new Error('Select an existing terminal. New terminal creation is disabled while this location already has terminals.');

  let pinHash: string | undefined;
  if (requestedExisting) {
    if (staff.pinLockedUntil && staff.pinLockedUntil > new Date()) throw new Error('Too many incorrect PIN attempts. Try again in one minute.');
    if (!staff.pinHash) throw new Error('This administrator does not have a PIN. Use staff management from another authorized administrator to set one.');
    if (!await verifyPin(pin, staff.pinHash)) {
      const attempts = (staff.failedPinAttempts || 0) + 1;
      await db.update(users).set({ failedPinAttempts: attempts >= 5 ? 0 : attempts, pinLockedUntil: attempts >= 5 ? new Date(Date.now() + 60_000) : null }).where(eq(users.id, staff.id));
      throw new Error(attempts >= 5 ? 'Too many incorrect PIN attempts. Try again in one minute.' : 'Incorrect administrator PIN');
    }
  } else {
    await assertUniqueLocationPin(staff.locationId, pin, staffId);
    pinHash = await hashPin(pin);
  }
  const rawToken = newOpaqueToken();
  return withTransaction(async transaction => {
    await transaction.update(users).set({ ...(pinHash ? { pinHash, pinVersion: sql`${users.pinVersion} + 1` } : {}), failedPinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() }).where(eq(users.id, staff.id));
    const existing = requestedExisting ? (await transaction.select().from(terminals).where(and(eq(terminals.id, requestedExisting.id), eq(terminals.locationId, staff.locationId!), eq(terminals.isActive, true), isNull(terminals.revokedAt))).limit(1))[0] : undefined;
    if (requestedExisting && !existing) throw new Error('The selected terminal changed while it was being authorized. Reload and try again.');
    const terminal = existing
      ? (await transaction.update(terminals).set({ credentialHash: hashToken(rawToken), type, enrolledByStaffId: staff.id, lastSeenAt: new Date() }).where(eq(terminals.id, existing.id)).returning())[0]
      : (await transaction.insert(terminals).values({ restaurantId: staff.restaurantId!, locationId: staff.locationId!, name, type, credentialHash: hashToken(rawToken), enrolledByStaffId: staff.id }).returning())[0];
    if (existing) await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(and(eq(staffSessions.terminalId, terminal.id), isNull(staffSessions.revokedAt)));
    await transaction.insert(auditEvents).values({ restaurantId: terminal.restaurantId, locationId: terminal.locationId, terminalId: terminal.id, actorStaffId: staff.id, action: existing ? 'terminal.reauthorized' : 'terminal.enrolled', entityType: 'terminal', entityId: String(terminal.id) });
    return { terminal, rawToken };
  });
}

export async function findTerminalByToken(rawToken?: string) {
  if (!rawToken) return null;
  const result = await db.select({ terminal: terminals }).from(terminals).innerJoin(restaurants, eq(restaurants.id, terminals.restaurantId)).where(and(
    eq(terminals.credentialHash, hashToken(rawToken)),
    eq(terminals.isActive, true),
    isNull(terminals.revokedAt),
    eq(restaurants.status, 'active'),
  )).limit(1);
  return result[0]?.terminal ?? null;
}

export async function listTerminalStaff(terminalId: number) {
  const terminal = await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1);
  if (!terminal[0]) return [];
  return db.select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(and(
      eq(users.restaurantId, terminal[0].restaurantId),
      eq(users.locationId, terminal[0].locationId),
      eq(users.isActive, true),
      isNotNull(users.pinHash),
    ));
}

export async function authenticatePin(terminalId: number, staffId: number, pin: string) {
  const terminal = (await db.select().from(terminals).where(eq(terminals.id, terminalId)).limit(1))[0];
  if (!terminal) return { ok: false as const, reason: 'invalid' };

  const staff = (await db.select().from(users).where(and(
    eq(users.id, staffId),
    eq(users.restaurantId, terminal.restaurantId),
    eq(users.locationId, terminal.locationId),
    eq(users.isActive, true),
  )).limit(1))[0];

  if (staff?.pinLockedUntil && staff.pinLockedUntil > new Date()) return { ok: false as const, reason: 'locked' };

  const valid = Boolean(staff?.pinHash) && await verifyPin(pin, staff!.pinHash!);
  if (!valid) {
    const attempts = (staff?.failedPinAttempts || 0) + 1;
    if (staff) await db.update(users).set({
      failedPinAttempts: attempts >= 5 ? 0 : attempts,
      pinLockedUntil: attempts >= 5 ? new Date(Date.now() + 60_000) : null,
    }).where(eq(users.id, staff.id));
    return { ok: false as const, reason: attempts >= 5 ? 'locked' : 'invalid' };
  }

  await db.update(users).set({ failedPinAttempts: 0, pinLockedUntil: null }).where(eq(users.id, staff!.id));
  await db.update(terminals).set({ lastSeenAt: new Date() }).where(eq(terminals.id, terminal.id));
  const rawToken = newOpaqueToken();
  const expiresAt = new Date(Date.now() + terminal.inactivityTimeoutMinutes * 60_000);
  const session = (await db.insert(staffSessions).values({
    tokenHash: hashToken(rawToken), terminalId: terminal.id, staffId: staff.id, expiresAt,
  }).returning())[0];
  await writeAudit({ terminal, actorStaffId: staff.id, action: 'staff.signed_in', entityType: 'staff_session', entityId: String(session.id) });
  return { ok: true as const, rawToken, staff, expiresAt };
}

export async function findStaffSession(rawToken: string | undefined, terminalId: number) {
  if (!rawToken) return null;
  const rows = await db.select({ session: staffSessions, staff: users }).from(staffSessions)
    .innerJoin(users, eq(users.id, staffSessions.staffId))
    .where(and(
      eq(staffSessions.tokenHash, hashToken(rawToken)),
      eq(staffSessions.terminalId, terminalId),
      isNull(staffSessions.revokedAt),
      gt(staffSessions.expiresAt, new Date()),
      eq(users.isActive, true),
    )).limit(1);
  if (!rows[0]) return null;
  const terminal = (await db.select({ inactivityTimeoutMinutes: terminals.inactivityTimeoutMinutes }).from(terminals).where(eq(terminals.id, terminalId)).limit(1))[0];
  const expiresAt = new Date(Date.now() + (terminal?.inactivityTimeoutMinutes || 15) * 60_000);
  await db.update(staffSessions).set({ lastActivityAt: new Date(), expiresAt }).where(eq(staffSessions.id, rows[0].session.id));
  return { ...rows[0], expiresAt };
}

export async function revokeStaffSession(rawToken?: string) {
  if (!rawToken) return;
  await db.update(staffSessions).set({ revokedAt: new Date() }).where(eq(staffSessions.tokenHash, hashToken(rawToken)));
}

export async function revokeTerminal(terminalId: number) {
  await db.update(staffSessions).set({ revokedAt: new Date() }).where(and(eq(staffSessions.terminalId, terminalId), isNull(staffSessions.revokedAt)));
  return (await db.update(terminals).set({ isActive: false, revokedAt: new Date() }).where(eq(terminals.id, terminalId)).returning())[0] ?? null;
}

export async function setStaffPin(staffId: number, pin: string) {
  const target = (await db.select().from(users).where(eq(users.id, staffId)).limit(1))[0];
  if (!target) return null;
  await assertUniqueLocationPin(target.locationId, pin, staffId);
  const pinHash = await hashPin(pin);
  return withTransaction(async transaction => {
    const updated = await transaction.update(users).set({ pinHash, pinVersion: sql`${users.pinVersion} + 1`, failedPinAttempts: 0, pinLockedUntil: null, updatedAt: new Date() }).where(eq(users.id, staffId)).returning();
    await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(and(eq(staffSessions.staffId, staffId), isNull(staffSessions.revokedAt)));
    return updated[0] ?? null;
  });
}

export async function createPinStaff(input: { restaurantId: number; locationId: number; name: string; role: string; pin: string }) {
  await assertUniqueLocationPin(input.locationId, input.pin);
  const pinHash = await hashPin(input.pin);
  return (await db.insert(users).values({ ...input, pinHash, email: null, clerkUserId: null }).returning())[0];
}

async function assertUniqueLocationPin(locationId: number | null, pin: string, exceptStaffId?: number) {
  if (!locationId) return;
  const conditions = [eq(users.locationId, locationId), eq(users.isActive, true)];
  if (exceptStaffId) conditions.push(ne(users.id, exceptStaffId));
  const candidates = await db.select({ pinHash: users.pinHash }).from(users).where(and(...conditions));
  for (const candidate of candidates) {
    if (candidate.pinHash && await verifyPin(pin, candidate.pinHash)) throw new Error('That PIN is already assigned at this location');
  }
}

export async function writeAudit(input: {
  terminal: typeof terminals.$inferSelect;
  actorStaffId?: number;
  approverStaffId?: number;
  action: string;
  entityType?: string;
  entityId?: string;
  metadata?: Record<string, unknown>;
}) {
  await db.insert(auditEvents).values({
    restaurantId: input.terminal.restaurantId,
    locationId: input.terminal.locationId,
    terminalId: input.terminal.id,
    actorStaffId: input.actorStaffId,
    approverStaffId: input.approverStaffId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata,
  });
}

export async function listAuditEvents(restaurantId: number, locationId: number, limit = 100) {
  return db.select().from(auditEvents).where(and(eq(auditEvents.restaurantId, restaurantId), eq(auditEvents.locationId, locationId))).orderBy(desc(auditEvents.createdAt)).limit(Math.min(200, Math.max(1, limit)));
}
