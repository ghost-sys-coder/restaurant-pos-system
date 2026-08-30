import { and, desc, eq, sql } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { inventoryItems, menuItemRecipes, menuItems, orderItems, orders, stockMovements } from './schema.ts';
import { clampInteger } from '../domain/posRules.ts';

export async function listInventory(restaurantId: number, locationId: number) {
  const items = await db.select().from(inventoryItems).where(and(eq(inventoryItems.restaurantId, restaurantId), eq(inventoryItems.locationId, locationId), eq(inventoryItems.isActive, true))).orderBy(inventoryItems.name);
  const movements = await db.select().from(stockMovements).where(and(eq(stockMovements.restaurantId, restaurantId), eq(stockMovements.locationId, locationId))).orderBy(desc(stockMovements.createdAt)).limit(100);
  return { items, movements };
}

export async function createInventoryItem(input: { restaurantId: number; locationId: number; name: string; sku?: string; unit: string; onHandMilliunits: number; reorderLevelMilliunits: number; costPerUnit: number; actorStaffId?: number }) {
  return withTransaction(async tx => {
    const item = (await tx.insert(inventoryItems).values({ ...input, sku: input.sku || null }).returning())[0];
    if (input.onHandMilliunits) await tx.insert(stockMovements).values({ restaurantId: input.restaurantId, locationId: input.locationId, inventoryItemId: item.id, deltaMilliunits: input.onHandMilliunits, movementType: 'opening_balance', reason: 'Opening balance', sourceKey: `opening:${item.id}`, actorStaffId: input.actorStaffId });
    return item;
  });
}

export async function adjustInventory(input: { restaurantId: number; locationId: number; inventoryItemId: number; deltaMilliunits: number; movementType: string; reason: string; actorStaffId?: number; sourceKey: string }) {
  return withTransaction(async tx => {
    await tx.execute(sql`select ${inventoryItems.id} from ${inventoryItems} where ${inventoryItems.id} = ${input.inventoryItemId} and ${inventoryItems.restaurantId} = ${input.restaurantId} and ${inventoryItems.locationId} = ${input.locationId} for update`);
    const item = (await tx.select().from(inventoryItems).where(and(eq(inventoryItems.id, input.inventoryItemId), eq(inventoryItems.restaurantId, input.restaurantId), eq(inventoryItems.locationId, input.locationId), eq(inventoryItems.isActive, true))).limit(1))[0];
    if (!item) throw new Error('Inventory item not found in this location');
    const claimed = await tx.insert(stockMovements).values({ ...input }).onConflictDoNothing().returning({ id: stockMovements.id });
    if (!claimed[0]) return item;
    return (await tx.update(inventoryItems).set({ onHandMilliunits: item.onHandMilliunits + input.deltaMilliunits, updatedAt: new Date() }).where(eq(inventoryItems.id, item.id)).returning())[0];
  });
}

export async function replaceMenuItemRecipe(restaurantId: number, locationId: number, menuItemId: number, ingredients: Array<{ inventoryItemId: number; quantityMilliunits: number }>) {
  return withTransaction(async tx => {
    const menu = (await tx.select({ id: menuItems.id }).from(menuItems).where(and(eq(menuItems.id, menuItemId), eq(menuItems.restaurantId, restaurantId))).limit(1))[0];
    if (!menu) throw new Error('Menu item not found');
    const uniqueIds = new Set(ingredients.map(value => value.inventoryItemId));
    if (uniqueIds.size !== ingredients.length || ingredients.length > 100) throw new Error('Recipe ingredients must be unique');
    for (const ingredient of ingredients) {
      const inventory = (await tx.select({ id: inventoryItems.id }).from(inventoryItems).where(and(eq(inventoryItems.id, ingredient.inventoryItemId), eq(inventoryItems.restaurantId, restaurantId), eq(inventoryItems.locationId, locationId), eq(inventoryItems.isActive, true))).limit(1))[0];
      if (!inventory) throw new Error('Recipe inventory item is outside this location');
      clampInteger(ingredient.quantityMilliunits, 1, 1_000_000_000);
    }
    await tx.delete(menuItemRecipes).where(eq(menuItemRecipes.menuItemId, menuItemId));
    if (ingredients.length) await tx.insert(menuItemRecipes).values(ingredients.map(value => ({ menuItemId, inventoryItemId: value.inventoryItemId, quantityMilliunits: clampInteger(value.quantityMilliunits, 1, 1_000_000_000) })));
    return tx.select().from(menuItemRecipes).where(eq(menuItemRecipes.menuItemId, menuItemId));
  });
}

export async function consumeOrderItemInventory(transaction: any, restaurantId: number, locationId: number, orderItemId: number) {
  const line = (await transaction.select({ id: orderItems.id, menuItemId: orderItems.menuItemId, quantity: orderItems.quantity }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(eq(orderItems.id, orderItemId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1))[0];
  if (!line?.menuItemId) return;
  const recipe = await transaction.select().from(menuItemRecipes).where(eq(menuItemRecipes.menuItemId, line.menuItemId));
  for (const ingredient of recipe) {
    const sourceKey = `sale:${orderItemId}:${ingredient.inventoryItemId}`;
    const claimed = await transaction.insert(stockMovements).values({ restaurantId, locationId, inventoryItemId: ingredient.inventoryItemId, deltaMilliunits: -ingredient.quantityMilliunits * line.quantity, movementType: 'sale', reason: `Order item ${orderItemId}`, sourceKey }).onConflictDoNothing().returning({ id: stockMovements.id });
    if (claimed[0]) await transaction.update(inventoryItems).set({ onHandMilliunits: sql`${inventoryItems.onHandMilliunits} - ${ingredient.quantityMilliunits * line.quantity}`, updatedAt: new Date() }).where(and(eq(inventoryItems.id, ingredient.inventoryItemId), eq(inventoryItems.locationId, locationId)));
  }
}
