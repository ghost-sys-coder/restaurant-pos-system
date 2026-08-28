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
export async function getCategories() {
  try {
    return await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  } catch (error) {
    console.error('Failed to get categories:', error);
    throw new Error('Database query failed: categories', { cause: error });
  }
}

export async function createCategory(name: string, icon = 'Utensils', color = 'amber') {
  try {
    const res = await db.insert(categories).values({ name, icon, color }).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to create category:', error);
    throw new Error('Database query failed: createCategory', { cause: error });
  }
}

// Menu Items
export async function getMenuItems(categoryId?: number) {
  try {
    if (categoryId) {
      return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).orderBy(menuItems.name);
  } catch (error) {
    console.error('Failed to get menu items:', error);
    throw new Error('Database query failed: menuItems', { cause: error });
  }
}

export async function createMenuItem(data: {
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
    const res = await db.insert(menuItems).values(data).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to create menu item:', error);
    throw new Error('Database query failed: createMenuItem', { cause: error });
  }
}

export async function updateMenuItem(id: number, data: Partial<{
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
    const res = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update menu item:', error);
    throw new Error('Database query failed: updateMenuItem', { cause: error });
  }
}

export async function deleteMenuItem(id: number) {
  try {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return { success: true };
  } catch (error) {
    console.error('Failed to delete menu item:', error);
    throw new Error('Database query failed: deleteMenuItem', { cause: error });
  }
}

// Tables
export async function getTables() {
  try {
    return await db.select().from(restaurantTables).orderBy(restaurantTables.tableNumber);
  } catch (error) {
    console.error('Failed to get tables:', error);
    throw new Error('Database query failed: tables', { cause: error });
  }
}

export async function updateTableStatus(id: number, status: string, currentOrderId?: number | null) {
  try {
    const res = await db.update(restaurantTables).set({
      status,
      ...(currentOrderId !== undefined ? { currentOrderId } : {})
    }).where(eq(restaurantTables.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update table status:', error);
    throw new Error('Database query failed: updateTableStatus', { cause: error });
  }
}

export async function createTable(tableNumber: string, capacity: number, section: string, posX = 0, posY = 0) {
  try {
    const res = await db.insert(restaurantTables).values({
      tableNumber,
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
export async function getOrders(statusFilter?: string) {
  try {
    const allOrders = await db.query.orders.findMany({
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

export async function getOrderById(id: number) {
  try {
    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
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
    // 1. Create order record
    const createdOrderArr = await db.insert(orders).values({
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      tableId: data.tableId || null,
      serverName: data.serverName || 'Staff Member',
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
      }).where(eq(restaurantTables.id, data.tableId));
    }

    return await getOrderById(createdOrder.id);
  } catch (error) {
    console.error('Failed to create order:', error);
    throw new Error('Database query failed: createOrder', { cause: error });
  }
}

export async function updateOrderStatus(orderId: number, status: string) {
  try {
    const updateData: any = { status };
    if (status === 'completed' || status === 'cancelled') {
      updateData.completedAt = new Date();
    }

    const res = await db.update(orders).set(updateData).where(eq(orders.id, orderId)).returning();
    const updated = res[0];

    // If completed or cancelled, free the table
    if (updated && updated.tableId && (status === 'completed' || status === 'cancelled')) {
      await db.update(restaurantTables).set({
        status: 'available',
        currentOrderId: null,
      }).where(eq(restaurantTables.id, updated.tableId));
    }

    return await getOrderById(orderId);
  } catch (error) {
    console.error('Failed to update order status:', error);
    throw new Error('Database query failed: updateOrderStatus', { cause: error });
  }
}

export async function updateOrderItemStatus(itemId: number, itemStatus: string) {
  try {
    const res = await db.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning();
    return res[0];
  } catch (error) {
    console.error('Failed to update order item status:', error);
    throw new Error('Database query failed: updateOrderItemStatus', { cause: error });
  }
}

export async function processPayment(orderId: number, data: {
  amount: number;
  tip?: number;
  method: string;
  processedBy?: string;
  transactionRef?: string;
}) {
  try {
    // 1. Record payment
    await db.insert(payments).values({
      orderId,
      amount: data.amount,
      tip: data.tip || 0,
      method: data.method,
      processedBy: data.processedBy || 'Cashier',
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
    }).where(eq(orders.id, orderId)).returning();

    const order = updatedOrder[0];
    if (order && order.tableId) {
      await db.update(restaurantTables).set({
        status: 'cleaning',
        currentOrderId: null,
      }).where(eq(restaurantTables.id, order.tableId));
    }

    return await getOrderById(orderId);
  } catch (error) {
    console.error('Failed to process payment:', error);
    throw new Error('Database query failed: processPayment', { cause: error });
  }
}

export async function getAnalyticsSummary() {
  try {
    const allOrders = await db.select().from(orders);
    const allItems = await db.select().from(orderItems);
    const allPayments = await db.select().from(payments);

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
