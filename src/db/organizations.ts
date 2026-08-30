import { and, eq, isNull } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { locations, restaurants, staffSessions, terminals, users, webhookEvents } from './schema.ts';
import type { BackOfficeRole } from '../types.ts';
import { ClerkAccessEvent, membershipRole } from '../auth/clerkWebhook.ts';

export async function createRestaurantRecord(input: { clerkOrganizationId: string; name: string; slug: string; createdByClerkUserId: string }) {
  return withTransaction(async transaction => {
    const restaurant = (await transaction.insert(restaurants).values({ ...input, status: 'active', receiptName: input.name }).returning())[0];
    const location = (await transaction.insert(locations).values({ restaurantId: restaurant.id, name: 'Main Location' }).returning())[0];
    return { restaurant, location };
  });
}

export async function getRestaurantByClerkOrgId(clerkOrganizationId: string) {
  return (await db.select().from(restaurants).where(eq(restaurants.clerkOrganizationId, clerkOrganizationId)).limit(1))[0] ?? null;
}

export async function getRestaurantById(id: number) {
  return (await db.select().from(restaurants).where(eq(restaurants.id, id)).limit(1))[0] ?? null;
}

export async function getRestaurantWithDefaultLocation(clerkOrganizationId: string) {
  const restaurant = await getRestaurantByClerkOrgId(clerkOrganizationId);
  if (!restaurant) return null;
  const location = (await db.select().from(locations).where(eq(locations.restaurantId, restaurant.id)).limit(1))[0] ?? null;
  return { restaurant, location };
}

export async function listRestaurantClients() {
  return db.select().from(restaurants);
}

export async function updateRestaurantStatus(restaurantId: number, status: 'active' | 'suspended') {
  return (await db.update(restaurants).set({ status }).where(eq(restaurants.id, restaurantId)).returning())[0] ?? null;
}

export async function deactivateBackOfficeMembership(restaurantId: number, clerkUserId: string) {
  return withTransaction(async transaction => {
    const affected = await transaction.update(users).set({ isActive: false, updatedAt: new Date() })
      .where(and(eq(users.restaurantId, restaurantId), eq(users.clerkUserId, clerkUserId)))
      .returning({ id: users.id });
    for (const staff of affected) {
      await transaction.update(staffSessions).set({ revokedAt: new Date() })
        .where(and(eq(staffSessions.staffId, staff.id), isNull(staffSessions.revokedAt)));
    }
    return affected.length;
  });
}

export async function getRestaurantSettings(restaurantId: number, locationId: number) {
  const restaurant = (await db.select().from(restaurants).where(eq(restaurants.id, restaurantId)).limit(1))[0];
  const location = (await db.select().from(locations).where(and(eq(locations.id, locationId), eq(locations.restaurantId, restaurantId))).limit(1))[0];
  return restaurant && location ? { restaurant, location } : null;
}

export async function updateRestaurantSettings(restaurantId: number, locationId: number, terminalId: number, input: { receiptName: string; currency: string; taxRateBps: number; timezone: string; inactivityTimeoutMinutes: number }) {
  return withTransaction(async transaction => {
    const restaurant = (await transaction.update(restaurants).set({ receiptName: input.receiptName, currency: input.currency, taxRateBps: input.taxRateBps }).where(eq(restaurants.id, restaurantId)).returning())[0];
    const location = (await transaction.update(locations).set({ timezone: input.timezone }).where(and(eq(locations.id, locationId), eq(locations.restaurantId, restaurantId))).returning())[0];
    await transaction.update(terminals).set({ inactivityTimeoutMinutes: input.inactivityTimeoutMinutes }).where(and(eq(terminals.id, terminalId), eq(terminals.locationId, locationId)));
    return { restaurant, location, inactivityTimeoutMinutes: input.inactivityTimeoutMinutes };
  });
}

export async function attachBackOfficeUser(input: { clerkUserId: string; email: string; name: string; orgId: string; role: BackOfficeRole }) {
  const account = await getRestaurantWithDefaultLocation(input.orgId);
  if (!account?.location || account.restaurant.status !== 'active') throw new Error('Restaurant organization is not active');
  const existing = (await db.select().from(users).where(and(eq(users.clerkUserId, input.clerkUserId), eq(users.restaurantId, account.restaurant.id))).limit(1))[0];
  if (existing) {
    return (await db.update(users).set({
      restaurantId: account.restaurant.id,
      locationId: account.location.id,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      updatedAt: new Date(),
    }).where(eq(users.id, existing.id)).returning())[0];
  }
  return (await db.insert(users).values({
    restaurantId: account.restaurant.id,
    locationId: account.location.id,
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    role: input.role,
  }).returning())[0];
}

export async function reconcileClerkAccessEvent(event: ClerkAccessEvent) {
  return withTransaction(async transaction => {
    const claimed = await transaction.insert(webhookEvents).values({
      provider: 'clerk', eventId: event.eventId, eventType: event.eventType,
    }).onConflictDoNothing().returning({ id: webhookEvents.id });
    if (!claimed[0]) return { duplicate: true };

    if (event.eventType === 'organization.updated') {
      await transaction.update(restaurants).set({
        ...(event.name ? { name: event.name } : {}),
        ...(event.slug ? { slug: event.slug } : {}),
      }).where(eq(restaurants.clerkOrganizationId, event.organizationId));
    } else if (event.eventType === 'organization.deleted') {
      const restaurant = (await transaction.update(restaurants).set({ status: 'suspended' }).where(eq(restaurants.clerkOrganizationId, event.organizationId)).returning({ id: restaurants.id }))[0];
      if (restaurant) {
        const affected = await transaction.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.restaurantId, restaurant.id)).returning({ id: users.id });
        for (const user of affected) await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(eq(staffSessions.staffId, user.id));
      }
    } else if (event.eventType === 'user.deleted') {
      const affected = await transaction.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.clerkUserId, event.clerkUserId)).returning({ id: users.id });
      for (const user of affected) await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(eq(staffSessions.staffId, user.id));
    } else {
      const membershipEvent = event as import('../auth/clerkWebhook.ts').ClerkMembershipEvent;
      const restaurant = (await transaction.select().from(restaurants).where(eq(restaurants.clerkOrganizationId, membershipEvent.organizationId)).limit(1))[0];
      if (restaurant) {
        const existing = (await transaction.select().from(users).where(and(eq(users.clerkUserId, membershipEvent.clerkUserId), eq(users.restaurantId, restaurant.id))).limit(1))[0];
        const role = membershipRole(membershipEvent);
        if (membershipEvent.eventType === 'organizationMembership.deleted' || !role) {
          if (existing) {
            await transaction.update(users).set({ isActive: false, updatedAt: new Date() }).where(eq(users.id, existing.id));
            await transaction.update(staffSessions).set({ revokedAt: new Date() }).where(eq(staffSessions.staffId, existing.id));
          }
        } else if (restaurant.status === 'active') {
          const location = (await transaction.select().from(locations).where(eq(locations.restaurantId, restaurant.id)).limit(1))[0];
          if (!location) throw new Error('Restaurant has no location for Clerk membership synchronization');
          await transaction.insert(users).values({
            restaurantId: restaurant.id, locationId: location.id, clerkUserId: membershipEvent.clerkUserId,
            email: membershipEvent.email || null, name: membershipEvent.name || membershipEvent.email || 'Back-office user', role, isActive: true,
          }).onConflictDoUpdate({
            target: [users.clerkUserId, users.restaurantId],
            set: { locationId: location.id, email: membershipEvent.email || null, name: membershipEvent.name || membershipEvent.email || 'Back-office user', role, isActive: true, updatedAt: new Date() },
          });
        }
      }
    }

    await transaction.update(webhookEvents).set({ status: 'processed', processedAt: new Date() }).where(eq(webhookEvents.id, claimed[0].id));
    return { duplicate: false };
  });
}
