import { and, eq } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { locations, restaurants, terminals, users } from './schema.ts';
import type { BackOfficeRole } from '../types.ts';

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
