import { relations } from 'drizzle-orm';
import { boolean, integer, pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core';

// Users / Staff
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  clerkUserId: text('uid').notNull().unique(),
  email: text('email').notNull(),
  name: text('name'),
  role: text('role').default('cashier'), // 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
  createdAt: timestamp('created_at').defaultNow(),
});

// Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  icon: text('icon').default('Utensils'),
  color: text('color').default('amber'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Menu Items
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // in cents (e.g. 1499 = $14.99)
  imageUrl: text('image_url'),
  isAvailable: boolean('is_available').default(true),
  calories: integer('calories'),
  prepTimeMinutes: integer('prep_time_minutes').default(10),
  allergens: text('allergens'),
  optionsJson: text('options_json'), // Customization options
  createdAt: timestamp('created_at').defaultNow(),
});

// Restaurant Tables
export const restaurantTables = pgTable('restaurant_tables', {
  id: serial('id').primaryKey(),
  tableNumber: text('table_number').notNull().unique(),
  capacity: integer('capacity').default(4),
  section: text('section').default('Main Dining'), // Main Dining, Patio, Bar, VIP
  status: text('status').default('available'), // available, occupied, reserved, cleaning, billing
  currentOrderId: integer('current_order_id'),
  posX: integer('pos_x').default(0),
  posY: integer('pos_y').default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// Orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  orderNumber: text('order_number').notNull(),
  orderType: text('order_type').default('dine-in'), // dine-in, takeout, delivery, bar
  tableId: integer('table_id').references(() => restaurantTables.id),
  serverName: text('server_name').default('Server 1'),
  customerName: text('customer_name'),
  customerPhone: text('customer_phone'),
  status: text('status').default('active'), // pending, active, preparing, ready, served, completed, cancelled
  subtotal: integer('subtotal').default(0).notNull(),
  tax: integer('tax').default(0).notNull(),
  discount: integer('discount').default(0).notNull(),
  tip: integer('tip').default(0).notNull(),
  total: integer('total').default(0).notNull(),
  paymentStatus: text('payment_status').default('unpaid'), // unpaid, partially_paid, paid, refunded
  paymentMethod: text('payment_method'), // cash, card, digital, split
  notes: text('notes'),
  guestCount: integer('guest_count').default(1),
  createdAt: timestamp('created_at').defaultNow(),
  completedAt: timestamp('completed_at'),
});

// Order Items
export const orderItems = pgTable('order_items', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  menuItemId: integer('menu_item_id').references(() => menuItems.id),
  name: text('name').notNull(),
  price: integer('price').notNull(),
  quantity: integer('quantity').default(1).notNull(),
  selectedOptions: text('selected_options'),
  notes: text('notes'),
  itemStatus: text('item_status').default('sent'), // sent, preparing, ready, served, void
  createdAt: timestamp('created_at').defaultNow(),
});

// Payments
export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  orderId: integer('order_id').references(() => orders.id).notNull(),
  amount: integer('amount').notNull(),
  tip: integer('tip').default(0),
  method: text('method').notNull(), // cash, card, digital, split
  transactionRef: text('transaction_ref'),
  status: text('status').default('success'),
  processedBy: text('processed_by'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Relations
export const categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems),
}));

export const menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id],
  }),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(restaurantTables, {
    fields: [orders.tableId],
    references: [restaurantTables.id],
  }),
  items: many(orderItems),
  payments: many(payments),
}));

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id],
  }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id],
  }),
}));
