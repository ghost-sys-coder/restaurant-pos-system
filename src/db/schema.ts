import { relations } from 'drizzle-orm';
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// A restaurant account may eventually contain several physical locations.
export const restaurants = pgTable('restaurants', {
  id: serial('id').primaryKey(),
  clerkOrganizationId: text('clerk_organization_id').unique(),
  slug: text('slug').unique(),
  name: text('name').notNull(),
  status: text('status').default('active').notNull(),
  createdByClerkUserId: text('created_by_clerk_user_id'),
  currency: text('currency').default('UGX').notNull(),
  taxRateBps: integer('tax_rate_bps').default(0).notNull(),
  receiptName: text('receipt_name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const locations = pgTable('locations', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  name: text('name').notNull(),
  timezone: text('timezone').default('Africa/Kampala').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  uniqueIndex('locations_restaurant_name_unique').on(table.restaurantId, table.name),
]);

// Users / Staff
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  clerkUserId: text('uid'),
  email: text('email'),
  name: text('name'),
  role: text('role').default('cashier'), // 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
  pinHash: text('pin_hash'),
  pinVersion: integer('pin_version').default(1).notNull(),
  failedPinAttempts: integer('failed_pin_attempts').default(0).notNull(),
  pinLockedUntil: timestamp('pin_locked_until'),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => [
  index('users_restaurant_location_idx').on(table.restaurantId, table.locationId),
  uniqueIndex('users_clerk_restaurant_unique').on(table.clerkUserId, table.restaurantId),
]);

export const terminals = pgTable('terminals', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  name: text('name').notNull(),
  type: text('type').default('register').notNull(),
  credentialHash: text('credential_hash').notNull(),
  enrolledByStaffId: integer('enrolled_by_staff_id').references(() => users.id),
  isActive: boolean('is_active').default(true).notNull(),
  inactivityTimeoutMinutes: integer('inactivity_timeout_minutes').default(15).notNull(),
  failedPinAttempts: integer('failed_pin_attempts').default(0).notNull(),
  lockedUntil: timestamp('locked_until'),
  lastSeenAt: timestamp('last_seen_at').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  uniqueIndex('terminals_location_name_unique').on(table.locationId, table.name),
]);

export const staffSessions = pgTable('staff_sessions', {
  id: serial('id').primaryKey(),
  tokenHash: text('token_hash').notNull().unique(),
  terminalId: integer('terminal_id').references(() => terminals.id).notNull(),
  staffId: integer('staff_id').references(() => users.id).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastActivityAt: timestamp('last_activity_at').defaultNow().notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
}, (table) => [
  index('staff_sessions_terminal_idx').on(table.terminalId),
  index('staff_sessions_staff_idx').on(table.staffId),
]);

export const auditEvents = pgTable('audit_events', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  terminalId: integer('terminal_id').references(() => terminals.id),
  actorStaffId: integer('actor_staff_id').references(() => users.id),
  approverStaffId: integer('approver_staff_id').references(() => users.id),
  action: text('action').notNull(),
  entityType: text('entity_type'),
  entityId: text('entity_id'),
  metadata: jsonb('metadata').$type<Record<string, unknown>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => [
  index('audit_events_restaurant_created_idx').on(table.restaurantId, table.createdAt),
]);

// Categories
export const categories = pgTable('categories', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  name: text('name').notNull(),
  icon: text('icon').default('Utensils'),
  color: text('color').default('amber'),
  sortOrder: integer('sort_order').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [uniqueIndex('categories_restaurant_name_unique').on(table.restaurantId, table.name)]);

// Menu Items
export const menuItems = pgTable('menu_items', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  categoryId: integer('category_id').references(() => categories.id),
  name: text('name').notNull(),
  description: text('description'),
  price: integer('price').notNull(), // in cents (e.g. 1499 = $14.99)
  imageUrl: text('image_url'),
  imagePublicId: text('image_public_id'),
  isAvailable: boolean('is_available').default(true),
  calories: integer('calories'),
  prepTimeMinutes: integer('prep_time_minutes').default(10),
  allergens: text('allergens'),
  optionsJson: text('options_json'), // Customization options
  createdAt: timestamp('created_at').defaultNow(),
  archivedAt: timestamp('archived_at'),
});

// Restaurant Tables
export const restaurantTables = pgTable('restaurant_tables', {
  id: serial('id').primaryKey(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  tableNumber: text('table_number').notNull(),
  capacity: integer('capacity').default(4),
  section: text('section').default('Main Dining'), // Main Dining, Patio, Bar, VIP
  status: text('status').default('available'), // available, occupied, reserved, cleaning, billing
  currentOrderId: integer('current_order_id'),
  posX: integer('pos_x').default(0),
  posY: integer('pos_y').default(0),
  createdAt: timestamp('created_at').defaultNow(),
}, (table) => [uniqueIndex('restaurant_tables_location_number_unique').on(table.locationId, table.tableNumber)]);

// Orders
export const orders = pgTable('orders', {
  id: serial('id').primaryKey(),
  restaurantId: integer('restaurant_id').references(() => restaurants.id).notNull(),
  locationId: integer('location_id').references(() => locations.id).notNull(),
  orderNumber: text('order_number').notNull(),
  orderType: text('order_type').default('dine-in'), // dine-in, takeout, delivery, bar
  tableId: integer('table_id').references(() => restaurantTables.id),
  createdByStaffId: integer('created_by_staff_id').references(() => users.id),
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
  version: integer('version').default(1).notNull(),
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
  processedByStaffId: integer('processed_by_staff_id').references(() => users.id),
  idempotencyKey: text('idempotency_key').unique(),
  tenderedAmount: integer('tendered_amount'),
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
