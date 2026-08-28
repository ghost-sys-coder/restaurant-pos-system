import { eq } from 'drizzle-orm';
import { db } from './index.ts';
import { users } from './schema.ts';

export async function getOrCreateUser(clerkUserId: string, email: string, name?: string, defaultRole: string = 'cashier') {
  try {
    const existing = await getUserByClerkId(clerkUserId);
    if (existing) {
      // Keep existing role from DB, update profile details
      const updated = await db.update(users)
        .set({
          email,
          ...(name ? { name } : {}),
        })
        .where(eq(users.clerkUserId, clerkUserId))
        .returning();
      return updated[0];
    }

    const result = await db.insert(users)
      .values({
        clerkUserId,
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

export async function getAllUsers() {
  try {
    return await db.select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt,
    }).from(users);
  } catch (error) {
    console.error('Database query failed in getAllUsers:', error);
    throw new Error('Failed to fetch staff users', { cause: error });
  }
}
