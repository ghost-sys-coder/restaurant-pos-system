import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { locations, restaurants, users } from './schema.ts';
import type { BackOfficeRole } from '../types.ts';

export async function createRestaurantRecord(input: { clerkOrganizationId: string; name: string; slug: string; createdByClerkUserId: string }) {
  const restaurant = (await db.insert(restaurants).values({ ...input, status: 'active' }).returning())[0];
  const location = (await db.insert(locations).values({ restaurantId: restaurant.id, name: 'Main Location' }).returning())[0];
  return { restaurant, location };
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

export async function attachBackOfficeUser(input: { clerkUserId: string; email: string; name: string; orgId: string; role: BackOfficeRole }) {
  const account = await getRestaurantWithDefaultLocation(input.orgId);
  if (!account?.location || account.restaurant.status !== 'active') throw new Error('Restaurant organization is not active');
  const existing = (await db.select().from(users).where(eq(users.clerkUserId, input.clerkUserId)).limit(1))[0];
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
