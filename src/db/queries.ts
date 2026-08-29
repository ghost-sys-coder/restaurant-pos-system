import { desc, eq, and, sql, gte } from 'drizzle-orm';
import { db } from './index.ts';
import {
  categories,
  menuItems,
  restaurantTables,
  orders,
  orderItems,
  payments,
} from './schema.ts';

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
      return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.categoryId, categoryId))).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).orderBy(menuItems.name);
  } catch (error) {
    console.error('Failed to get menu items:', error);
    throw new Error('Database query failed: menuItems', { cause: error });
  }
}

export async function createMenuItem(data: {
  restaurantId: number;
  categoryId?: number;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
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
    const res = await db.insert(menuItems).values(data).returning();
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
    const res = await db.update(menuItems).set(data).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId))).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update menu item:', error);
    throw new Error('Database query failed: updateMenuItem', { cause: error });
  }
}

export async function deleteMenuItem(restaurantId: number, id: number) {
  try {
    await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId)));
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
    const res = await db.update(restaurantTables).set({
      status,
      ...(currentOrderId !== undefined ? { currentOrderId } : {})
    }).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).returning();
    return res[0];
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

// Orders
export async function getOrders(restaurantId: number, statusFilter?: string) {
  try {
    const allOrders = await db.query.orders.findMany({
      where: eq(orders.restaurantId, restaurantId),
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

export async function getOrderById(restaurantId: number, id: number) {
  try {
    return await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.restaurantId, restaurantId)),
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
  orderNumber: string;
  orderType: string;
  tableId?: number | null;
  serverName?: string;
  customerName?: string;
  customerPhone?: string;
  subtotal: number;
  tax: number;
  discount: number;
  tip: number;
  total: number;
  notes?: string;
  guestCount?: number;
  createdByStaffId?: number;
  items: Array<{
    menuItemId?: number;
    name: string;
    price: number;
    quantity: number;
    selectedOptions?: string;
    notes?: string;
  }>;
}) {
  try {
    if (data.tableId) {
      const table = await db.select({ id: restaurantTables.id }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1);
      if (!table[0]) throw new Error('Table not found in this location');
    }
    // 1. Create order record
    const createdOrderArr = await db.insert(orders).values({
      orderNumber: data.orderNumber,
      restaurantId: data.restaurantId,
      locationId: data.locationId,
      orderType: data.orderType,
      tableId: data.tableId || null,
      serverName: data.serverName || 'Staff Member',
      createdByStaffId: data.createdByStaffId,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      status: 'active',
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      tip: data.tip,
      total: data.total,
      paymentStatus: 'unpaid',
      notes: data.notes || null,
      guestCount: data.guestCount || 1,
    }).returning();

    const createdOrder = createdOrderArr[0];

    // 2. Insert items
    if (data.items && data.items.length > 0) {
      await db.insert(orderItems).values(
        data.items.map(item => ({
          orderId: createdOrder.id,
          menuItemId: item.menuItemId || null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions || null,
          notes: item.notes || null,
          itemStatus: 'sent',
        }))
      );
    }

    // 3. Update table status if dine-in
    if (data.tableId) {
      await db.update(restaurantTables).set({
        status: 'occupied',
        currentOrderId: createdOrder.id,
      }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
    }

    return await getOrderById(data.restaurantId, createdOrder.id);
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Database query failed: createOrder', { cause: error });
  }
}

export async function updateOrderStatus(restaurantId: number, orderId: number, status: string) {
  try {
    const updateData: any = { status };
    if (status === 'completed' || status === 'cancelled') {
      updateData.completedAt = new Date();
    }

    const res = await db.update(orders).set(updateData).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId))).returning();
    const updated = res[0];

    // If completed or cancelled, free the table
    if (updated && updated.tableId && (status === 'completed' || status === 'cancelled')) {
      await db.update(restaurantTables).set({
        status: 'available',
        currentOrderId: null,
      }).where(eq(restaurantTables.id, updated.tableId));
    }

    return await getOrderById(restaurantId, orderId);
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Database query failed: updateOrderStatus', { cause: error });
  }
}

export async function updateOrderItemStatus(restaurantId: number, itemId: number, itemStatus: string) {
  try {
    const owned = await db.select({ id: orderItems.id }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(eq(orderItems.id, itemId), eq(orders.restaurantId, restaurantId))).limit(1);
    if (!owned[0]) return undefined;
    const res = await db.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update order item status:', error);
    throw new Error('Database query failed: updateOrderItemStatus', { cause: error });
  }
}

export async function processPayment(restaurantId: number, orderId: number, data: {
  amount: number;
  tip?: number;
  method: string;
  processedBy?: string;
  processedByStaffId?: number;
  transactionRef?: string;
}) {
  try {
    const ownedOrder = await getOrderById(restaurantId, orderId);
    if (!ownedOrder) throw new Error('Order not found');
    // 1. Record payment
    await db.insert(payments).values({
      orderId,
      amount: data.amount,
      tip: data.tip || 0,
      method: data.method,
      processedBy: data.processedBy || 'Cashier',
      processedByStaffId: data.processedByStaffId,
      transactionRef: data.transactionRef || `TXN-${Date.now()}`,
      status: 'success',
    });

    // 2. Mark order as paid & completed
    const updatedOrder = await db.update(orders).set({
      paymentStatus: 'paid',
      paymentMethod: data.method,
      status: 'completed',
      tip: data.tip || 0,
      completedAt: new Date(),
    }).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId))).returning();

    const order = updatedOrder[0];
    if (order && order.tableId) {
      await db.update(restaurantTables).set({
        status: 'cleaning',
        currentOrderId: null,
      }).where(eq(restaurantTables.id, order.tableId));
    }

    return await getOrderById(restaurantId, orderId);
  } catch (error) {
    console.error('Failed to process payment:', error);
    throw new Error('Database query failed: processPayment', { cause: error });
  }
}

export async function getAnalyticsSummary(restaurantId: number) {
  try {
    const allOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    const allItems = await db.select({ name: orderItems.name, quantity: orderItems.quantity, price: orderItems.price }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(eq(orders.restaurantId, restaurantId));
    const allPayments = await db.select({ method: payments.method, amount: payments.amount }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(eq(orders.restaurantId, restaurantId));

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
