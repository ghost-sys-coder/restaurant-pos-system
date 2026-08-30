import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { auditEvents, orders, payments, restaurants, staffSessions, users } from './schema.ts';

export async function getOrCreateUser(clerkUserId: string, email: string, restaurantId: number, locationId: number, name?: string, defaultRole: string = 'cashier') {
  try {
    const existing = (await db.select().from(users).where(and(eq(users.clerkUserId, clerkUserId), eq(users.restaurantId, restaurantId))).limit(1))[0];
    if (existing) {
      // Keep existing role from DB, update profile details
      const updated = await db.update(users)
        .set({
          email,
          ...(name ? { name } : {}),
        })
        .where(eq(users.id, existing.id))
        .returning();
      return updated[0];
    }

    const result = await db.insert(users)
      .values({
        clerkUserId,
        restaurantId,
        locationId,
        email,
        name: name || email.split('@')[0],
        role: defaultRole,
      })
      .returning();

    return result[0];
  } catch (error) {
    console.error('Database query failed in getOrCreateUser:', error);
    throw new Error('Failed to retrieve or create user profile', { cause: error });
  }
}

export async function updateUserRole(id: number, role: string) {
  try {
    const result = await db.update(users)
      .set({ role })
      .where(eq(users.id, id))
      .returning();
    return result[0] ?? null;
  } catch (error) {
    console.error('Database query failed in updateUserRole:', error);
    throw new Error('Failed to update staff user role', { cause: error });
  }
}

export async function getUserByClerkId(clerkUserId: string) {
  const result = await db.select().from(users).where(eq(users.clerkUserId, clerkUserId)).limit(1);
  return result[0] ?? null;
}

export async function getUserByClerkOrg(clerkUserId: string, clerkOrganizationId: string) {
  const result = await db.select({ user: users }).from(users)
    .innerJoin(restaurants, eq(restaurants.id, users.restaurantId))
    .where(and(eq(users.clerkUserId, clerkUserId), eq(restaurants.clerkOrganizationId, clerkOrganizationId), eq(users.isActive, true), eq(restaurants.status, 'active')))
    .limit(1);
  return result[0]?.user ?? null;
}

export async function getUserById(id: number) {
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result[0] ?? null;
}

export async function getAllUsers(restaurantId: number, locationId: number) {
  try {
    return await db.select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt,
    }).from(users)
      .innerJoin(restaurants, eq(restaurants.id, users.restaurantId))
      .where(and(
        eq(users.restaurantId, restaurantId),
        eq(users.locationId, locationId),
        or(isNull(users.clerkUserId), isNull(restaurants.createdByClerkUserId), ne(users.clerkUserId, restaurants.createdByClerkUserId)),
      ));
  } catch (error) {
    console.error('Database query failed in getAllUsers:', error);
    throw new Error('Failed to fetch staff users', { cause: error });
  }
}

export async function setUserActive(id: number, isActive: boolean) {
  return withTransaction(async transaction => {
    const updated = (await transaction.update(users).set({ isActive, updatedAt: new Date() }).where(eq(users.id, id)).returning())[0] ?? null;
    if (updated && !isActive) await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(eq(staffSessions.staffId, id));
    return updated;
  });
}

export async function permanentlyDeleteUser(id: number) {
  return withTransaction(async transaction => {
    const [orderReference, paymentReference, auditReference] = await Promise.all([
      transaction.select({ id: orders.id }).from(orders).where(eq(orders.createdByStaffId, id)).limit(1),
      transaction.select({ id: payments.id }).from(payments).where(eq(payments.processedByStaffId, id)).limit(1),
      transaction.select({ id: auditEvents.id }).from(auditEvents).where(eq(auditEvents.actorStaffId, id)).limit(1),
    ]);
    if (orderReference[0] || paymentReference[0] || auditReference[0]) throw new Error('STAFF_HAS_BUSINESS_HISTORY');
    await transaction.delete(staffSessions).where(eq(staffSessions.staffId, id));
    return (await transaction.delete(users).where(eq(users.id, id)).returning())[0] ?? null;
  });
}
