import { desc, eq, and, sql, gte, isNull } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { calculateOrderTotals, canTransitionItem, canTransitionOrder, canTransitionTable, clampInteger, normalizeCurrency, normalizeModifierGroups, paymentState, priceModifierSelections } from '../domain/posRules.ts';
import {
  categories,
  menuItems,
  restaurantTables,
  orders,
  orderItems,
  payments,
  restaurants,
} from './schema.ts';
import { consumeOrderItemInventory } from './inventory.ts';

// Categories
export async function getCategories(restaurantId: number) {
  try {
    return await db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(categories.sortOrder, categories.name);
  } catch (error) {
    console.error('Failed to get categories:', error);
    throw new Error('Database query failed: categories', { cause: error });
  }
}

export async function createCategory(restaurantId: number, name: string, icon = 'Utensils', color = 'amber') {
  try {
    const existing = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.restaurantId, restaurantId), sql`lower(${categories.name}) = lower(${name})`)).limit(1);
    if (existing[0]) throw new Error('A category with this name already exists');
    const res = await db.insert(categories).values({ restaurantId, name, icon, color }).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to create category:', error);
    throw new Error('Database query failed: createCategory', { cause: error });
  }
}

// Menu Items
export async function getMenuItems(restaurantId: number, categoryId?: number) {
  try {
    if (categoryId) {
      return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.categoryId, categoryId), isNull(menuItems.archivedAt))).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), isNull(menuItems.archivedAt))).orderBy(menuItems.name);
  } catch (error) {
    console.error('Failed to get menu items:', error);
    throw new Error('Database query failed: menuItems', { cause: error });
  }
}

export async function getMenuItemById(restaurantId: number, id: number) {
  return (await db.select().from(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId))).limit(1))[0] ?? null;
}

export async function createMenuItem(data: {
  restaurantId: number;
  categoryId?: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  imagePublicId?: string;
  calories?: number;
  prepTimeMinutes?: number;
  allergens?: string;
  optionsJson?: string;
}) {
  try {
    if (data.categoryId) {
      const category = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.restaurantId, data.restaurantId))).limit(1);
      if (!category[0]) throw new Error('Category not found in this restaurant');
    }
    const res = await db.insert(menuItems).values({ ...data, optionsJson: JSON.stringify(normalizeModifierGroups(data.optionsJson)) }).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to create menu item:', error);
    throw new Error('Database query failed: createMenuItem', { cause: error });
  }
}

export async function updateMenuItem(restaurantId: number, id: number, data: Partial<{
  categoryId: number;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  imagePublicId: string;
  isAvailable: boolean;
  calories: number;
  prepTimeMinutes: number;
  allergens: string;
  optionsJson: string;
}>) {
  try {
    if (data.categoryId) {
      const category = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.restaurantId, restaurantId))).limit(1);
      if (!category[0]) throw new Error('Category not found in this restaurant');
    }
    const normalized = data.optionsJson === undefined ? data : { ...data, optionsJson: JSON.stringify(normalizeModifierGroups(data.optionsJson)) };
    const res = await db.update(menuItems).set(normalized).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId))).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update menu item:', error);
    throw new Error('Database query failed: updateMenuItem', { cause: error });
  }
}

export async function deleteMenuItem(restaurantId: number, id: number) {
  try {
    await db.update(menuItems).set({ isAvailable: false, archivedAt: new Date() }).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId)));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    throw new Error('Database query failed: deleteMenuItem', { cause: error });
  }
}

// Tables
export async function getTables(locationId: number) {
  try {
    return await db.select().from(restaurantTables).where(eq(restaurantTables.locationId, locationId)).orderBy(restaurantTables.tableNumber);
  } catch (error) {
    console.error('Failed to get tables:', error);
    throw new Error('Database query failed: tables', { cause: error });
  }
}

export async function updateTableStatus(locationId: number, id: number, status: string, currentOrderId?: number | null) {
  try {
    return await withTransaction(async tx => {
      const current = (await tx.select().from(restaurantTables).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).limit(1))[0];
      if (!current) return undefined;
      if (!canTransitionTable(current.status || '', status)) throw new Error(`Table cannot move from ${current.status} to ${status}`);
      return (await tx.update(restaurantTables).set({ status, ...(currentOrderId !== undefined ? { currentOrderId } : {}) }).where(eq(restaurantTables.id, current.id)).returning())[0];
    });
  } catch (error) {
    console.error('Failed to update table status:', error);
    throw new Error('Database query failed: updateTableStatus', { cause: error });
  }
}

export async function createTable(locationId: number, tableNumber: string, capacity: number, section: string, posX = 0, posY = 0) {
  try {
    const res = await db.insert(restaurantTables).values({
      locationId, tableNumber,
      capacity,
      section,
      posX,
      posY,
      status: 'available',
    }).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to create table:', error);
    throw new Error('Database query failed: createTable', { cause: error });
  }
}

export async function updateTableDetails(locationId: number, id: number, data: { tableNumber: string; capacity: number; section: string }) {
  try {
    return (await db.update(restaurantTables).set(data).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).returning())[0] ?? null;
  } catch (error) {
    console.error('Failed to update table details:', error);
    throw new Error('Database query failed: updateTableDetails', { cause: error });
  }
}

// Orders
export async function getOrders(restaurantId: number, locationId: number, statusFilter?: string) {
  try {
    const allOrders = await db.query.orders.findMany({
      where: and(eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId)),
      orderBy: [desc(orders.createdAt)],
      with: {
        table: true,
        items: true,
        payments: true,
      },
    });

    if (statusFilter && statusFilter !== 'all') {
      if (statusFilter === 'active') {
        return allOrders.filter(o => o.status !== 'completed' && o.status !== 'cancelled');
      }
      return allOrders.filter(o => o.status === statusFilter);
    }
    return allOrders;
  } catch (error) {
    console.error('Failed to get orders:', error);
    throw new Error('Database query failed: getOrders', { cause: error });
  }
}

export async function getOrderById(restaurantId: number, locationId: number, id: number) {
  try {
    return await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId)),
      with: {
        table: true,
        items: true,
        payments: true,
      },
    });
  } catch (error) {
    console.error('Failed to get order by id:', error);
    throw new Error('Database query failed: getOrderById', { cause: error });
  }
}

export async function createOrder(data: {
  restaurantId: number;
  locationId: number;
  orderType: string;
  tableId?: number | null;
  serverName?: string;
  customerName?: string;
  customerPhone?: string;
  discountPercent?: number;
  tipAmount?: number;
  notes?: string;
  guestCount?: number;
  createdByStaffId?: number;
  items: Array<{
    menuItemId: number;
    quantity: number;
    selectedOptions?: string;
    notes?: string;
  }>;
}) {
  try {
    if (!data.items?.length) throw new Error('An order requires at least one item');
    const orderId = await withTransaction(async tx => {
      if (data.tableId) {
        await tx.execute(sql`select ${restaurantTables.id} from ${restaurantTables} where ${restaurantTables.id} = ${data.tableId} and ${restaurantTables.locationId} = ${data.locationId} for update`);
        const table = await tx.select({ id: restaurantTables.id, currentOrderId: restaurantTables.currentOrderId }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1);
        if (!table[0]) throw new Error('Table not found in this location');
        if (table[0].currentOrderId) throw new Error('This table already has an active order');
      }
      const priced = await priceOrderItems(tx, data.restaurantId, data.items);
      const settings = (await tx.select({ taxRateBps: restaurants.taxRateBps, currency: restaurants.currency }).from(restaurants).where(eq(restaurants.id, data.restaurantId)).limit(1))[0];
      if (!settings) throw new Error('Restaurant settings not found');
      const totals = calculateOrderTotals(priced, data.discountPercent ?? 0, settings.taxRateBps);
      const tip = clampInteger(data.tipAmount ?? 0, 0, 100_000_000);
      const currency = normalizeCurrency(settings.currency);
      const discountRateBps = clampInteger(data.discountPercent ?? 0, 0, 100) * 100;
      const created = (await tx.insert(orders).values({
        orderNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        restaurantId: data.restaurantId, locationId: data.locationId, orderType: data.orderType,
        tableId: data.tableId || null, serverName: data.serverName || 'Staff Member', createdByStaffId: data.createdByStaffId,
        customerName: data.customerName || null, customerPhone: data.customerPhone || null, status: 'active',
        currency, taxRateBps: settings.taxRateBps, discountRateBps,
        ...totals, tip, total: totals.total + tip, paymentStatus: 'unpaid',
        notes: data.notes || null, guestCount: data.guestCount || 1,
      }).returning())[0];
      const orderNumber = `L${data.locationId}-${String(created.id).padStart(6, '0')}`;
      await tx.update(orders).set({ orderNumber }).where(eq(orders.id, created.id));
      await tx.insert(orderItems).values(priced.map((item: any) => ({ ...item, orderId: created.id, itemStatus: 'sent' })));
      if (data.tableId) await tx.update(restaurantTables).set({ status: 'occupied', currentOrderId: created.id }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
      return created.id;
    });
    return await getOrderById(data.restaurantId, data.locationId, orderId);
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Database query failed: createOrder', { cause: error });
  }
}

function selectedOptionPrice(optionsJson: string | null, selectedOptions?: string) {
  return priceModifierSelections(optionsJson, selectedOptions);
}

async function priceOrderItems(transaction: any, restaurantId: number, requested: Array<{ menuItemId: number; quantity: number; selectedOptions?: string; notes?: string }>) {
  const result = [];
  for (const request of requested) {
    const quantity = clampInteger(request.quantity, 1, 99);
    const menuItem = (await transaction.select().from(menuItems).where(and(eq(menuItems.id, request.menuItemId), eq(menuItems.restaurantId, restaurantId), eq(menuItems.isAvailable, true))).limit(1))[0];
    if (!menuItem) throw new Error('A selected menu item is unavailable');
    result.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price + selectedOptionPrice(menuItem.optionsJson, request.selectedOptions), quantity, selectedOptions: request.selectedOptions || null, notes: request.notes?.trim().slice(0, 500) || null });
  }
  return result;
}

export async function replaceOrder(data: Parameters<typeof createOrder>[0] & { orderId: number; expectedVersion: number }) {
  const orderId = await withTransaction(async tx => {
    const current = (await tx.select().from(orders).where(and(eq(orders.id, data.orderId), eq(orders.restaurantId, data.restaurantId), eq(orders.locationId, data.locationId))).limit(1))[0];
    if (!current) throw new Error('Order not found');
    if (current.version !== data.expectedVersion) throw new Error('ORDER_CONFLICT');
    if (current.paymentStatus !== 'unpaid' || current.status !== 'active') throw new Error('Only active unpaid orders can be edited');
    if (data.tableId) {
      const nextTable = (await tx.select({ id: restaurantTables.id, currentOrderId: restaurantTables.currentOrderId }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1))[0];
      if (!nextTable) throw new Error('Table not found in this location');
      if (nextTable.currentOrderId && nextTable.currentOrderId !== current.id) throw new Error('This table already has an active order');
    }
    const priced = await priceOrderItems(tx, data.restaurantId, data.items);
    const totals = calculateOrderTotals(priced, data.discountPercent ?? 0, current.taxRateBps);
    const tip = clampInteger(data.tipAmount ?? 0, 0, 100_000_000);
    const discountRateBps = clampInteger(data.discountPercent ?? 0, 0, 100) * 100;
    await tx.delete(orderItems).where(eq(orderItems.orderId, current.id));
    await tx.insert(orderItems).values(priced.map((item: any) => ({ ...item, orderId: current.id, itemStatus: 'sent' })));
    const changed = await tx.update(orders).set({ orderType: data.orderType, tableId: data.tableId || null, customerName: data.customerName || null, customerPhone: data.customerPhone || null, notes: data.notes || null, guestCount: data.guestCount || 1, discountRateBps, ...totals, tip, total: totals.total + tip, version: current.version + 1 }).where(and(eq(orders.id, current.id), eq(orders.version, data.expectedVersion))).returning({ id: orders.id });
    if (!changed[0]) throw new Error('ORDER_CONFLICT');
    if (current.tableId && current.tableId !== data.tableId) await tx.update(restaurantTables).set({ status: 'available', currentOrderId: null }).where(and(eq(restaurantTables.id, current.tableId), eq(restaurantTables.locationId, data.locationId)));
    if (data.tableId) await tx.update(restaurantTables).set({ status: 'occupied', currentOrderId: current.id }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
    return current.id;
  });
  return getOrderById(data.restaurantId, data.locationId, orderId);
}

export async function updateOrderStatus(restaurantId: number, locationId: number, orderId: number, status: string) {
  try {
    await withTransaction(async tx => {
      const current = (await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1))[0];
      if (!current) throw new Error('Order not found');
      if (!canTransitionOrder(current.status || '', status)) throw new Error(`Order cannot move from ${current.status} to ${status}`);
      if (status === 'completed' && current.paymentStatus !== 'paid') throw new Error('An order must be fully paid before completion');
      await tx.update(orders).set({ status, completedAt: status === 'completed' || status === 'cancelled' ? new Date() : null, version: current.version + 1 }).where(eq(orders.id, orderId));
      if (current.tableId && (status === 'completed' || status === 'cancelled')) await tx.update(restaurantTables).set({ status: status === 'completed' ? 'cleaning' : 'available', currentOrderId: null }).where(and(eq(restaurantTables.id, current.tableId), eq(restaurantTables.locationId, locationId)));
    });
    return await getOrderById(restaurantId, locationId, orderId);
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Database query failed: updateOrderStatus', { cause: error });
  }
}

export async function updateOrderItemStatus(restaurantId: number, locationId: number, itemId: number, itemStatus: string) {
  try {
    return await withTransaction(async tx => {
      const owned = await tx.select({ id: orderItems.id, itemStatus: orderItems.itemStatus }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(eq(orderItems.id, itemId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1);
      if (!owned[0]) return undefined;
      if (!canTransitionItem(owned[0].itemStatus || '', itemStatus)) throw new Error(`Item cannot move from ${owned[0].itemStatus} to ${itemStatus}`);
      const updated = (await tx.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning())[0];
      if (itemStatus === 'served') await consumeOrderItemInventory(tx, restaurantId, locationId, itemId);
      return updated;
    });
  } catch (error) {
    console.error('Failed to update order item status:', error);
    throw new Error('Database query failed: updateOrderItemStatus', { cause: error });
  }
}

export async function processPayment(restaurantId: number, locationId: number, orderId: number, data: {
  amount: number;
  tip?: number;
  method: string;
  processedBy?: string;
  processedByStaffId?: number;
  transactionRef?: string;
  idempotencyKey: string;
  tenderedAmount?: number;
}) {
  try {
    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(data.idempotencyKey)) throw new Error('A valid payment idempotency key is required');
    if (!['cash', 'card', 'digital'].includes(data.method)) throw new Error('Unsupported payment method');
    await withTransaction(async tx => {
      const duplicate = (await tx.select().from(payments).where(eq(payments.idempotencyKey, data.idempotencyKey)).limit(1))[0];
      if (duplicate) {
        if (duplicate.orderId !== orderId) throw new Error('Payment key is already assigned to another order');
        return;
      }
      await tx.execute(sql`select ${orders.id} from ${orders} where ${orders.id} = ${orderId} and ${orders.restaurantId} = ${restaurantId} and ${orders.locationId} = ${locationId} for update`);
      const order = (await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1))[0];
      if (!order || order.status === 'cancelled') throw new Error('Order is not payable');
      const prior = await tx.select({ total: sql<number>`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, 'success')));
      const priorPaid = Number(prior[0]?.total || 0);
      const tip = priorPaid === 0 ? clampInteger(data.tip ?? 0, 0, 100_000_000) : 0;
      const adjustedTotal = order.total + tip;
      const balance = adjustedTotal - priorPaid;
      const amount = clampInteger(data.amount, 1, 1_000_000_000);
      if (amount > balance) throw new Error('Payment exceeds the outstanding balance');
      const tenderedAmount = clampInteger(data.tenderedAmount ?? amount, 0, 1_000_000_000);
      if (data.method === 'cash' && tenderedAmount < amount) throw new Error('Cash tendered is below the payment amount');
      await tx.insert(payments).values({ orderId, amount, tip, method: data.method, processedBy: data.processedBy || 'Cashier', processedByStaffId: data.processedByStaffId, transactionRef: data.transactionRef || `TXN-${Date.now()}`, idempotencyKey: data.idempotencyKey, tenderedAmount, status: 'success' });
      const paid = priorPaid + amount;
      const nextPaymentState = paymentState(adjustedTotal, paid);
      const isPaid = nextPaymentState === 'paid';
      await tx.update(orders).set({ paymentStatus: nextPaymentState, paymentMethod: isPaid ? data.method : 'split', status: isPaid ? 'completed' : order.status, tip: order.tip + tip, total: adjustedTotal, completedAt: isPaid ? new Date() : null, version: order.version + 1 }).where(eq(orders.id, orderId));
      if (isPaid && order.tableId) await tx.update(restaurantTables).set({ status: 'cleaning', currentOrderId: null }).where(and(eq(restaurantTables.id, order.tableId), eq(restaurantTables.locationId, locationId)));
    });
    return await getOrderById(restaurantId, locationId, orderId);
  } catch (error) {
    console.error('Failed to process payment:', error);
    throw new Error('Database query failed: processPayment', { cause: error });
  }
}

export async function getAnalyticsSummary(restaurantId: number, locationId: number, startAt = new Date(new Date().setHours(0, 0, 0, 0))) {
  try {
    const scope = and(eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId), gte(orders.createdAt, startAt));
    const allOrders = await db.select().from(orders).where(scope);
    const allItems = await db.select({ name: orderItems.name, quantity: orderItems.quantity, price: orderItems.price }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(scope, eq(orders.paymentStatus, 'paid')));
    const allPayments = await db.select({ method: payments.method, amount: payments.amount }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(and(scope, eq(payments.status, 'success')));

    const paidOrders = allOrders.filter(o => o.paymentStatus === 'paid');
    const totalRevenueCents = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalTipsCents = paidOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
    const averageOrderValueCents = paidOrders.length > 0 ? Math.round(totalRevenueCents / paidOrders.length) : 0;

    // Item sales aggregation
    const itemCounts: Record<string, { count: number; revenue: number }> = {};
    for (const item of allItems) {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { count: 0, revenue: 0 };
      }
      itemCounts[item.name].count += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    }

    const topSellingItems = Object.entries(itemCounts)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    // Payment methods breakdown
    const paymentBreakdown: Record<string, number> = {
      cash: 0,
      card: 0,
      digital: 0,
      split: 0,
    };
    for (const p of allPayments) {
      const method = p.method || 'card';
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + p.amount;
    }

    // Order type breakdown
    const orderTypes = ['dine-in', 'takeout', 'bar', 'delivery'] as const;
    const orderTypeBreakdown: Record<string, { count: number; revenue: number }> = {};
    for (const ot of orderTypes) {
      const typeOrders = paidOrders.filter(o => o.orderType === ot);
      orderTypeBreakdown[ot] = {
        count: typeOrders.length,
        revenue: typeOrders.reduce((sum, o) => sum + (o.total || 0), 0),
      };
    }

    return {
      totalOrders: allOrders.length,
      paidOrdersCount: paidOrders.length,
      activeOrdersCount: allOrders.filter(o => o.status === 'active' || o.status === 'preparing').length,
      totalRevenueCents,
      totalTipsCents,
      averageOrderValueCents,
      topSellingItems,
      paymentBreakdown,
      orderTypeBreakdown,
    };
  } catch (error) {
    console.error('Failed to get analytics summary:', error);
    throw new Error('Database query failed: analyticsSummary', { cause: error });
  }
}
