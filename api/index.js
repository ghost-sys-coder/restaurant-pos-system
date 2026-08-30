var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/app.ts
import "dotenv/config";
import express from "express";
import multer from "multer";

// src/db/queries.ts
import { desc, eq, and, sql as sql2, gte, isNull } from "drizzle-orm";

// src/db/index.ts
import "dotenv/config";
import { neon, neonConfig, Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import { drizzle as drizzleWebSocket } from "drizzle-orm/neon-serverless";
import ws from "ws";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  auditEvents: () => auditEvents,
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  locations: () => locations,
  menuItems: () => menuItems,
  menuItemsRelations: () => menuItemsRelations,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  restaurantTables: () => restaurantTables,
  restaurants: () => restaurants,
  staffSessions: () => staffSessions,
  terminals: () => terminals,
  users: () => users
});
import { relations } from "drizzle-orm";
import { boolean, index, integer, jsonb, pgTable, serial, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
var restaurants = pgTable("restaurants", {
  id: serial("id").primaryKey(),
  clerkOrganizationId: text("clerk_organization_id").unique(),
  slug: text("slug").unique(),
  name: text("name").notNull(),
  status: text("status").default("active").notNull(),
  createdByClerkUserId: text("created_by_clerk_user_id"),
  currency: text("currency").default("UGX").notNull(),
  taxRateBps: integer("tax_rate_bps").default(0).notNull(),
  receiptName: text("receipt_name"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var locations = pgTable("locations", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  name: text("name").notNull(),
  timezone: text("timezone").default("Africa/Kampala").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  uniqueIndex("locations_restaurant_name_unique").on(table.restaurantId, table.name)
]);
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  clerkUserId: text("uid"),
  email: text("email"),
  name: text("name"),
  role: text("role").default("cashier"),
  // 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
  pinHash: text("pin_hash"),
  pinVersion: integer("pin_version").default(1).notNull(),
  failedPinAttempts: integer("failed_pin_attempts").default(0).notNull(),
  pinLockedUntil: timestamp("pin_locked_until"),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  index("users_restaurant_location_idx").on(table.restaurantId, table.locationId),
  uniqueIndex("users_clerk_restaurant_unique").on(table.clerkUserId, table.restaurantId)
]);
var terminals = pgTable("terminals", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  name: text("name").notNull(),
  type: text("type").default("register").notNull(),
  credentialHash: text("credential_hash").notNull(),
  enrolledByStaffId: integer("enrolled_by_staff_id").references(() => users.id),
  isActive: boolean("is_active").default(true).notNull(),
  inactivityTimeoutMinutes: integer("inactivity_timeout_minutes").default(15).notNull(),
  failedPinAttempts: integer("failed_pin_attempts").default(0).notNull(),
  lockedUntil: timestamp("locked_until"),
  lastSeenAt: timestamp("last_seen_at").defaultNow().notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  revokedAt: timestamp("revoked_at")
}, (table) => [
  uniqueIndex("terminals_location_name_unique").on(table.locationId, table.name)
]);
var staffSessions = pgTable("staff_sessions", {
  id: serial("id").primaryKey(),
  tokenHash: text("token_hash").notNull().unique(),
  terminalId: integer("terminal_id").references(() => terminals.id).notNull(),
  staffId: integer("staff_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  lastActivityAt: timestamp("last_activity_at").defaultNow().notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  revokedAt: timestamp("revoked_at")
}, (table) => [
  index("staff_sessions_terminal_idx").on(table.terminalId),
  index("staff_sessions_staff_idx").on(table.staffId)
]);
var auditEvents = pgTable("audit_events", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  terminalId: integer("terminal_id").references(() => terminals.id),
  actorStaffId: integer("actor_staff_id").references(() => users.id),
  approverStaffId: integer("approver_staff_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: text("entity_id"),
  metadata: jsonb("metadata").$type(),
  createdAt: timestamp("created_at").defaultNow().notNull()
}, (table) => [
  index("audit_events_restaurant_created_idx").on(table.restaurantId, table.createdAt)
]);
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  name: text("name").notNull(),
  icon: text("icon").default("Utensils"),
  color: text("color").default("amber"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [uniqueIndex("categories_restaurant_name_unique").on(table.restaurantId, table.name)]);
var menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  // integer minor units; whole shillings for UGX
  imageUrl: text("image_url"),
  imagePublicId: text("image_public_id"),
  isAvailable: boolean("is_available").default(true),
  calories: integer("calories"),
  prepTimeMinutes: integer("prep_time_minutes").default(10),
  allergens: text("allergens"),
  optionsJson: text("options_json"),
  // Customization options
  createdAt: timestamp("created_at").defaultNow(),
  archivedAt: timestamp("archived_at")
});
var restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  tableNumber: text("table_number").notNull(),
  capacity: integer("capacity").default(4),
  section: text("section").default("Main Dining"),
  // Main Dining, Patio, Bar, VIP
  status: text("status").default("available"),
  // available, occupied, reserved, cleaning, billing
  currentOrderId: integer("current_order_id"),
  posX: integer("pos_x").default(0),
  posY: integer("pos_y").default(0),
  createdAt: timestamp("created_at").defaultNow()
}, (table) => [uniqueIndex("restaurant_tables_location_number_unique").on(table.locationId, table.tableNumber)]);
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id).notNull(),
  locationId: integer("location_id").references(() => locations.id).notNull(),
  orderNumber: text("order_number").notNull(),
  orderType: text("order_type").default("dine-in"),
  // dine-in, takeout, delivery, bar
  tableId: integer("table_id").references(() => restaurantTables.id),
  createdByStaffId: integer("created_by_staff_id").references(() => users.id),
  serverName: text("server_name").default("Server 1"),
  customerName: text("customer_name"),
  customerPhone: text("customer_phone"),
  status: text("status").default("active"),
  // pending, active, preparing, ready, served, completed, cancelled
  currency: text("currency").default("UGX").notNull(),
  taxRateBps: integer("tax_rate_bps").default(0).notNull(),
  discountRateBps: integer("discount_rate_bps").default(0).notNull(),
  subtotal: integer("subtotal").default(0).notNull(),
  tax: integer("tax").default(0).notNull(),
  discount: integer("discount").default(0).notNull(),
  tip: integer("tip").default(0).notNull(),
  total: integer("total").default(0).notNull(),
  paymentStatus: text("payment_status").default("unpaid"),
  // unpaid, partially_paid, paid, refunded
  paymentMethod: text("payment_method"),
  // cash, card, digital, split
  notes: text("notes"),
  guestCount: integer("guest_count").default(1),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  completedAt: timestamp("completed_at")
});
var orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  menuItemId: integer("menu_item_id").references(() => menuItems.id),
  name: text("name").notNull(),
  price: integer("price").notNull(),
  quantity: integer("quantity").default(1).notNull(),
  selectedOptions: text("selected_options"),
  notes: text("notes"),
  itemStatus: text("item_status").default("sent"),
  // sent, preparing, ready, served, void
  createdAt: timestamp("created_at").defaultNow()
});
var payments = pgTable("payments", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id).notNull(),
  amount: integer("amount").notNull(),
  tip: integer("tip").default(0),
  method: text("method").notNull(),
  // cash, card, digital, split
  transactionRef: text("transaction_ref"),
  status: text("status").default("success"),
  processedBy: text("processed_by"),
  processedByStaffId: integer("processed_by_staff_id").references(() => users.id),
  idempotencyKey: text("idempotency_key").unique(),
  tenderedAmount: integer("tendered_amount"),
  createdAt: timestamp("created_at").defaultNow()
});
var categoriesRelations = relations(categories, ({ many }) => ({
  menuItems: many(menuItems)
}));
var menuItemsRelations = relations(menuItems, ({ one }) => ({
  category: one(categories, {
    fields: [menuItems.categoryId],
    references: [categories.id]
  })
}));
var ordersRelations = relations(orders, ({ one, many }) => ({
  table: one(restaurantTables, {
    fields: [orders.tableId],
    references: [restaurantTables.id]
  }),
  items: many(orderItems),
  payments: many(payments)
}));
var orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id]
  }),
  menuItem: one(menuItems, {
    fields: [orderItems.menuItemId],
    references: [menuItems.id]
  })
}));
var paymentsRelations = relations(payments, ({ one }) => ({
  order: one(orders, {
    fields: [payments.orderId],
    references: [orders.id]
  })
}));

// src/db/index.ts
var connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set. Add the Neon connection string to .env.");
}
var sql = neon(connectionString);
var db = drizzle(sql, { schema: schema_exports });
neonConfig.webSocketConstructor = ws;
async function withTransaction(work) {
  const pool = new Pool({ connectionString });
  const transactionalDb = drizzleWebSocket(pool, { schema: schema_exports });
  try {
    return await transactionalDb.transaction(work);
  } finally {
    await pool.end();
  }
}

// src/domain/posRules.ts
function clampInteger(value, minimum, maximum) {
  if (!Number.isFinite(value)) throw new Error("A numeric value is required");
  return Math.min(maximum, Math.max(minimum, Math.round(value)));
}
function normalizeCurrency(value) {
  const currency = String(value || "").trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("Currency must be a three-letter ISO code");
  return currency;
}
function calculateOrderTotals(lines, discountPercent, taxRateBps) {
  const normalizedDiscount = clampInteger(discountPercent, 0, 100);
  const normalizedTax = clampInteger(taxRateBps, 0, 1e4);
  const subtotal = lines.reduce((sum, line) => sum + clampInteger(line.price, 0, 1e9) * clampInteger(line.quantity, 1, 99), 0);
  const discount = Math.round(subtotal * normalizedDiscount / 100);
  const taxable = Math.max(0, subtotal - discount);
  const tax = Math.round(taxable * normalizedTax / 1e4);
  return { subtotal, discount, tax, total: taxable + tax };
}
var ORDER_TRANSITIONS = { active: ["preparing", "cancelled"], preparing: ["ready", "cancelled"], ready: ["served", "cancelled"], served: ["completed"] };
var ITEM_TRANSITIONS = { sent: ["preparing", "void"], preparing: ["ready", "void"], ready: ["served"], served: [], void: [] };
var TABLE_TRANSITIONS = { available: ["reserved"], reserved: ["available"], occupied: ["billing"], billing: [], cleaning: ["available"] };
function canTransitionOrder(from, to) {
  return Boolean(ORDER_TRANSITIONS[from]?.includes(to));
}
function canTransitionItem(from, to) {
  return Boolean(ITEM_TRANSITIONS[from]?.includes(to));
}
function canTransitionTable(from, to) {
  return Boolean(TABLE_TRANSITIONS[from]?.includes(to));
}
function paymentState(total, paid) {
  if (paid <= 0) return "unpaid";
  if (paid < total) return "partially_paid";
  if (paid === total) return "paid";
  throw new Error("Payment exceeds the outstanding balance");
}

// src/db/queries.ts
async function getCategories(restaurantId) {
  try {
    return await db.select().from(categories).where(eq(categories.restaurantId, restaurantId)).orderBy(categories.sortOrder, categories.name);
  } catch (error) {
    console.error("Failed to get categories:", error);
    throw new Error("Database query failed: categories", { cause: error });
  }
}
async function createCategory(restaurantId, name, icon = "Utensils", color = "amber") {
  try {
    const existing = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.restaurantId, restaurantId), sql2`lower(${categories.name}) = lower(${name})`)).limit(1);
    if (existing[0]) throw new Error("A category with this name already exists");
    const res = await db.insert(categories).values({ restaurantId, name, icon, color }).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to create category:", error);
    throw new Error("Database query failed: createCategory", { cause: error });
  }
}
async function getMenuItems(restaurantId, categoryId) {
  try {
    if (categoryId) {
      return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.categoryId, categoryId), isNull(menuItems.archivedAt))).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), isNull(menuItems.archivedAt))).orderBy(menuItems.name);
  } catch (error) {
    console.error("Failed to get menu items:", error);
    throw new Error("Database query failed: menuItems", { cause: error });
  }
}
async function getMenuItemById(restaurantId, id) {
  return (await db.select().from(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId))).limit(1))[0] ?? null;
}
async function createMenuItem(data) {
  try {
    if (data.categoryId) {
      const category = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.restaurantId, data.restaurantId))).limit(1);
      if (!category[0]) throw new Error("Category not found in this restaurant");
    }
    const res = await db.insert(menuItems).values(data).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to create menu item:", error);
    throw new Error("Database query failed: createMenuItem", { cause: error });
  }
}
async function updateMenuItem(restaurantId, id, data) {
  try {
    if (data.categoryId) {
      const category = await db.select({ id: categories.id }).from(categories).where(and(eq(categories.id, data.categoryId), eq(categories.restaurantId, restaurantId))).limit(1);
      if (!category[0]) throw new Error("Category not found in this restaurant");
    }
    const res = await db.update(menuItems).set(data).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId))).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update menu item:", error);
    throw new Error("Database query failed: updateMenuItem", { cause: error });
  }
}
async function deleteMenuItem(restaurantId, id) {
  try {
    await db.update(menuItems).set({ isAvailable: false, archivedAt: /* @__PURE__ */ new Date() }).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId)));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    throw new Error("Database query failed: deleteMenuItem", { cause: error });
  }
}
async function getTables(locationId) {
  try {
    return await db.select().from(restaurantTables).where(eq(restaurantTables.locationId, locationId)).orderBy(restaurantTables.tableNumber);
  } catch (error) {
    console.error("Failed to get tables:", error);
    throw new Error("Database query failed: tables", { cause: error });
  }
}
async function updateTableStatus(locationId, id, status, currentOrderId) {
  try {
    return await withTransaction(async (tx) => {
      const current = (await tx.select().from(restaurantTables).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).limit(1))[0];
      if (!current) return void 0;
      if (!canTransitionTable(current.status || "", status)) throw new Error(`Table cannot move from ${current.status} to ${status}`);
      return (await tx.update(restaurantTables).set({ status, ...currentOrderId !== void 0 ? { currentOrderId } : {} }).where(eq(restaurantTables.id, current.id)).returning())[0];
    });
  } catch (error) {
    console.error("Failed to update table status:", error);
    throw new Error("Database query failed: updateTableStatus", { cause: error });
  }
}
async function createTable(locationId, tableNumber, capacity, section, posX = 0, posY = 0) {
  try {
    const res = await db.insert(restaurantTables).values({
      locationId,
      tableNumber,
      capacity,
      section,
      posX,
      posY,
      status: "available"
    }).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to create table:", error);
    throw new Error("Database query failed: createTable", { cause: error });
  }
}
async function updateTableDetails(locationId, id, data) {
  try {
    return (await db.update(restaurantTables).set(data).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).returning())[0] ?? null;
  } catch (error) {
    console.error("Failed to update table details:", error);
    throw new Error("Database query failed: updateTableDetails", { cause: error });
  }
}
async function getOrders(restaurantId, locationId, statusFilter) {
  try {
    const allOrders = await db.query.orders.findMany({
      where: and(eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId)),
      orderBy: [desc(orders.createdAt)],
      with: {
        table: true,
        items: true,
        payments: true
      }
    });
    if (statusFilter && statusFilter !== "all") {
      if (statusFilter === "active") {
        return allOrders.filter((o) => o.status !== "completed" && o.status !== "cancelled");
      }
      return allOrders.filter((o) => o.status === statusFilter);
    }
    return allOrders;
  } catch (error) {
    console.error("Failed to get orders:", error);
    throw new Error("Database query failed: getOrders", { cause: error });
  }
}
async function getOrderById(restaurantId, locationId, id) {
  try {
    return await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId)),
      with: {
        table: true,
        items: true,
        payments: true
      }
    });
  } catch (error) {
    console.error("Failed to get order by id:", error);
    throw new Error("Database query failed: getOrderById", { cause: error });
  }
}
async function createOrder(data) {
  try {
    if (!data.items?.length) throw new Error("An order requires at least one item");
    const orderId = await withTransaction(async (tx) => {
      if (data.tableId) {
        await tx.execute(sql2`select ${restaurantTables.id} from ${restaurantTables} where ${restaurantTables.id} = ${data.tableId} and ${restaurantTables.locationId} = ${data.locationId} for update`);
        const table = await tx.select({ id: restaurantTables.id, currentOrderId: restaurantTables.currentOrderId }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1);
        if (!table[0]) throw new Error("Table not found in this location");
        if (table[0].currentOrderId) throw new Error("This table already has an active order");
      }
      const priced = await priceOrderItems(tx, data.restaurantId, data.items);
      const settings = (await tx.select({ taxRateBps: restaurants.taxRateBps, currency: restaurants.currency }).from(restaurants).where(eq(restaurants.id, data.restaurantId)).limit(1))[0];
      if (!settings) throw new Error("Restaurant settings not found");
      const totals = calculateOrderTotals(priced, data.discountPercent ?? 0, settings.taxRateBps);
      const tip = clampInteger(data.tipAmount ?? 0, 0, 1e8);
      const currency = normalizeCurrency(settings.currency);
      const discountRateBps = clampInteger(data.discountPercent ?? 0, 0, 100) * 100;
      const created = (await tx.insert(orders).values({
        orderNumber: `PENDING-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        restaurantId: data.restaurantId,
        locationId: data.locationId,
        orderType: data.orderType,
        tableId: data.tableId || null,
        serverName: data.serverName || "Staff Member",
        createdByStaffId: data.createdByStaffId,
        customerName: data.customerName || null,
        customerPhone: data.customerPhone || null,
        status: "active",
        currency,
        taxRateBps: settings.taxRateBps,
        discountRateBps,
        ...totals,
        tip,
        total: totals.total + tip,
        paymentStatus: "unpaid",
        notes: data.notes || null,
        guestCount: data.guestCount || 1
      }).returning())[0];
      const orderNumber = `L${data.locationId}-${String(created.id).padStart(6, "0")}`;
      await tx.update(orders).set({ orderNumber }).where(eq(orders.id, created.id));
      await tx.insert(orderItems).values(priced.map((item) => ({ ...item, orderId: created.id, itemStatus: "sent" })));
      if (data.tableId) await tx.update(restaurantTables).set({ status: "occupied", currentOrderId: created.id }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
      return created.id;
    });
    return await getOrderById(data.restaurantId, data.locationId, orderId);
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error("Database query failed: createOrder", { cause: error });
  }
}
function selectedOptionPrice(optionsJson, selectedOptions) {
  if (!selectedOptions) return 0;
  let groups = [];
  try {
    groups = optionsJson ? JSON.parse(optionsJson) : [];
  } catch {
    throw new Error("Menu options are invalid");
  }
  const selections = selectedOptions.split(",").map((value) => value.trim()).filter(Boolean);
  let total = 0;
  for (const selection of selections) {
    const separator = selection.indexOf(":");
    if (separator < 1) throw new Error("Selected option format is invalid");
    const groupName = selection.slice(0, separator).trim();
    const choiceName = selection.slice(separator + 1).trim();
    const group = groups.find((value) => value.name === groupName);
    const choice = group?.choices.find((value) => value.name === choiceName);
    if (!choice || !Number.isInteger(choice.price) || choice.price < 0) throw new Error(`Option ${selection} is unavailable`);
    total += choice.price;
  }
  return total;
}
async function priceOrderItems(transaction, restaurantId, requested) {
  const result = [];
  for (const request of requested) {
    const quantity = clampInteger(request.quantity, 1, 99);
    const menuItem = (await transaction.select().from(menuItems).where(and(eq(menuItems.id, request.menuItemId), eq(menuItems.restaurantId, restaurantId), eq(menuItems.isAvailable, true))).limit(1))[0];
    if (!menuItem) throw new Error("A selected menu item is unavailable");
    result.push({ menuItemId: menuItem.id, name: menuItem.name, price: menuItem.price + selectedOptionPrice(menuItem.optionsJson, request.selectedOptions), quantity, selectedOptions: request.selectedOptions || null, notes: request.notes?.trim().slice(0, 500) || null });
  }
  return result;
}
async function replaceOrder(data) {
  const orderId = await withTransaction(async (tx) => {
    const current = (await tx.select().from(orders).where(and(eq(orders.id, data.orderId), eq(orders.restaurantId, data.restaurantId), eq(orders.locationId, data.locationId))).limit(1))[0];
    if (!current) throw new Error("Order not found");
    if (current.version !== data.expectedVersion) throw new Error("ORDER_CONFLICT");
    if (current.paymentStatus !== "unpaid" || current.status !== "active") throw new Error("Only active unpaid orders can be edited");
    if (data.tableId) {
      const nextTable = (await tx.select({ id: restaurantTables.id, currentOrderId: restaurantTables.currentOrderId }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1))[0];
      if (!nextTable) throw new Error("Table not found in this location");
      if (nextTable.currentOrderId && nextTable.currentOrderId !== current.id) throw new Error("This table already has an active order");
    }
    const priced = await priceOrderItems(tx, data.restaurantId, data.items);
    const totals = calculateOrderTotals(priced, data.discountPercent ?? 0, current.taxRateBps);
    const tip = clampInteger(data.tipAmount ?? 0, 0, 1e8);
    const discountRateBps = clampInteger(data.discountPercent ?? 0, 0, 100) * 100;
    await tx.delete(orderItems).where(eq(orderItems.orderId, current.id));
    await tx.insert(orderItems).values(priced.map((item) => ({ ...item, orderId: current.id, itemStatus: "sent" })));
    const changed = await tx.update(orders).set({ orderType: data.orderType, tableId: data.tableId || null, customerName: data.customerName || null, customerPhone: data.customerPhone || null, notes: data.notes || null, guestCount: data.guestCount || 1, discountRateBps, ...totals, tip, total: totals.total + tip, version: current.version + 1 }).where(and(eq(orders.id, current.id), eq(orders.version, data.expectedVersion))).returning({ id: orders.id });
    if (!changed[0]) throw new Error("ORDER_CONFLICT");
    if (current.tableId && current.tableId !== data.tableId) await tx.update(restaurantTables).set({ status: "available", currentOrderId: null }).where(and(eq(restaurantTables.id, current.tableId), eq(restaurantTables.locationId, data.locationId)));
    if (data.tableId) await tx.update(restaurantTables).set({ status: "occupied", currentOrderId: current.id }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
    return current.id;
  });
  return getOrderById(data.restaurantId, data.locationId, orderId);
}
async function updateOrderStatus(restaurantId, locationId, orderId, status) {
  try {
    await withTransaction(async (tx) => {
      const current = (await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1))[0];
      if (!current) throw new Error("Order not found");
      if (!canTransitionOrder(current.status || "", status)) throw new Error(`Order cannot move from ${current.status} to ${status}`);
      if (status === "completed" && current.paymentStatus !== "paid") throw new Error("An order must be fully paid before completion");
      await tx.update(orders).set({ status, completedAt: status === "completed" || status === "cancelled" ? /* @__PURE__ */ new Date() : null, version: current.version + 1 }).where(eq(orders.id, orderId));
      if (current.tableId && (status === "completed" || status === "cancelled")) await tx.update(restaurantTables).set({ status: status === "completed" ? "cleaning" : "available", currentOrderId: null }).where(and(eq(restaurantTables.id, current.tableId), eq(restaurantTables.locationId, locationId)));
    });
    return await getOrderById(restaurantId, locationId, orderId);
  } catch (error) {
    console.error("Failed to update order status:", error);
    throw new Error("Database query failed: updateOrderStatus", { cause: error });
  }
}
async function updateOrderItemStatus(restaurantId, locationId, itemId, itemStatus) {
  try {
    const owned = await db.select({ id: orderItems.id, itemStatus: orderItems.itemStatus }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(eq(orderItems.id, itemId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1);
    if (!owned[0]) return void 0;
    if (!canTransitionItem(owned[0].itemStatus || "", itemStatus)) throw new Error(`Item cannot move from ${owned[0].itemStatus} to ${itemStatus}`);
    const res = await db.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update order item status:", error);
    throw new Error("Database query failed: updateOrderItemStatus", { cause: error });
  }
}
async function processPayment(restaurantId, locationId, orderId, data) {
  try {
    if (!/^[A-Za-z0-9:_-]{16,128}$/.test(data.idempotencyKey)) throw new Error("A valid payment idempotency key is required");
    if (!["cash", "card", "digital"].includes(data.method)) throw new Error("Unsupported payment method");
    await withTransaction(async (tx) => {
      const duplicate = (await tx.select().from(payments).where(eq(payments.idempotencyKey, data.idempotencyKey)).limit(1))[0];
      if (duplicate) {
        if (duplicate.orderId !== orderId) throw new Error("Payment key is already assigned to another order");
        return;
      }
      await tx.execute(sql2`select ${orders.id} from ${orders} where ${orders.id} = ${orderId} and ${orders.restaurantId} = ${restaurantId} and ${orders.locationId} = ${locationId} for update`);
      const order = (await tx.select().from(orders).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId))).limit(1))[0];
      if (!order || order.status === "cancelled") throw new Error("Order is not payable");
      const prior = await tx.select({ total: sql2`coalesce(sum(${payments.amount}), 0)` }).from(payments).where(and(eq(payments.orderId, orderId), eq(payments.status, "success")));
      const priorPaid = Number(prior[0]?.total || 0);
      const tip = priorPaid === 0 ? clampInteger(data.tip ?? 0, 0, 1e8) : 0;
      const adjustedTotal = order.total + tip;
      const balance = adjustedTotal - priorPaid;
      const amount = clampInteger(data.amount, 1, 1e9);
      if (amount > balance) throw new Error("Payment exceeds the outstanding balance");
      const tenderedAmount = clampInteger(data.tenderedAmount ?? amount, 0, 1e9);
      if (data.method === "cash" && tenderedAmount < amount) throw new Error("Cash tendered is below the payment amount");
      await tx.insert(payments).values({ orderId, amount, tip, method: data.method, processedBy: data.processedBy || "Cashier", processedByStaffId: data.processedByStaffId, transactionRef: data.transactionRef || `TXN-${Date.now()}`, idempotencyKey: data.idempotencyKey, tenderedAmount, status: "success" });
      const paid = priorPaid + amount;
      const nextPaymentState = paymentState(adjustedTotal, paid);
      const isPaid = nextPaymentState === "paid";
      await tx.update(orders).set({ paymentStatus: nextPaymentState, paymentMethod: isPaid ? data.method : "split", status: isPaid ? "completed" : order.status, tip: order.tip + tip, total: adjustedTotal, completedAt: isPaid ? /* @__PURE__ */ new Date() : null, version: order.version + 1 }).where(eq(orders.id, orderId));
      if (isPaid && order.tableId) await tx.update(restaurantTables).set({ status: "cleaning", currentOrderId: null }).where(and(eq(restaurantTables.id, order.tableId), eq(restaurantTables.locationId, locationId)));
    });
    return await getOrderById(restaurantId, locationId, orderId);
  } catch (error) {
    console.error("Failed to process payment:", error);
    throw new Error("Database query failed: processPayment", { cause: error });
  }
}
async function getAnalyticsSummary(restaurantId, locationId, startAt = new Date((/* @__PURE__ */ new Date()).setHours(0, 0, 0, 0))) {
  try {
    const scope = and(eq(orders.restaurantId, restaurantId), eq(orders.locationId, locationId), gte(orders.createdAt, startAt));
    const allOrders = await db.select().from(orders).where(scope);
    const allItems = await db.select({ name: orderItems.name, quantity: orderItems.quantity, price: orderItems.price }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(scope, eq(orders.paymentStatus, "paid")));
    const allPayments = await db.select({ method: payments.method, amount: payments.amount }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(and(scope, eq(payments.status, "success")));
    const paidOrders = allOrders.filter((o) => o.paymentStatus === "paid");
    const totalRevenueCents = paidOrders.reduce((sum, o) => sum + (o.total || 0), 0);
    const totalTipsCents = paidOrders.reduce((sum, o) => sum + (o.tip || 0), 0);
    const averageOrderValueCents = paidOrders.length > 0 ? Math.round(totalRevenueCents / paidOrders.length) : 0;
    const itemCounts = {};
    for (const item of allItems) {
      if (!itemCounts[item.name]) {
        itemCounts[item.name] = { count: 0, revenue: 0 };
      }
      itemCounts[item.name].count += item.quantity;
      itemCounts[item.name].revenue += item.price * item.quantity;
    }
    const topSellingItems = Object.entries(itemCounts).map(([name, data]) => ({ name, ...data })).sort((a, b) => b.count - a.count).slice(0, 6);
    const paymentBreakdown = {
      cash: 0,
      card: 0,
      digital: 0,
      split: 0
    };
    for (const p of allPayments) {
      const method = p.method || "card";
      paymentBreakdown[method] = (paymentBreakdown[method] || 0) + p.amount;
    }
    const orderTypes = ["dine-in", "takeout", "bar", "delivery"];
    const orderTypeBreakdown = {};
    for (const ot of orderTypes) {
      const typeOrders = paidOrders.filter((o) => o.orderType === ot);
      orderTypeBreakdown[ot] = {
        count: typeOrders.length,
        revenue: typeOrders.reduce((sum, o) => sum + (o.total || 0), 0)
      };
    }
    return {
      totalOrders: allOrders.length,
      paidOrdersCount: paidOrders.length,
      activeOrdersCount: allOrders.filter((o) => o.status === "active" || o.status === "preparing").length,
      totalRevenueCents,
      totalTipsCents,
      averageOrderValueCents,
      topSellingItems,
      paymentBreakdown,
      orderTypeBreakdown
    };
  } catch (error) {
    console.error("Failed to get analytics summary:", error);
    throw new Error("Database query failed: analyticsSummary", { cause: error });
  }
}

// src/db/users.ts
import { and as and2, eq as eq2 } from "drizzle-orm";
async function updateUserRole(id, role) {
  try {
    const result = await db.update(users).set({ role }).where(eq2(users.id, id)).returning();
    return result[0] ?? null;
  } catch (error) {
    console.error("Database query failed in updateUserRole:", error);
    throw new Error("Failed to update staff user role", { cause: error });
  }
}
async function getUserByClerkOrg(clerkUserId, clerkOrganizationId) {
  const result = await db.select({ user: users }).from(users).innerJoin(restaurants, eq2(restaurants.id, users.restaurantId)).where(and2(eq2(users.clerkUserId, clerkUserId), eq2(restaurants.clerkOrganizationId, clerkOrganizationId), eq2(users.isActive, true), eq2(restaurants.status, "active"))).limit(1);
  return result[0]?.user ?? null;
}
async function getUserById(id) {
  const result = await db.select().from(users).where(eq2(users.id, id)).limit(1);
  return result[0] ?? null;
}
async function getAllUsers(restaurantId, locationId) {
  try {
    return await db.select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      name: users.name,
      role: users.role,
      isActive: users.isActive,
      createdAt: users.createdAt
    }).from(users).where(and2(eq2(users.restaurantId, restaurantId), eq2(users.locationId, locationId)));
  } catch (error) {
    console.error("Database query failed in getAllUsers:", error);
    throw new Error("Failed to fetch staff users", { cause: error });
  }
}
async function setUserActive(id, isActive) {
  return withTransaction(async (transaction) => {
    const updated = (await transaction.update(users).set({ isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, id)).returning())[0] ?? null;
    if (updated && !isActive) await transaction.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq2(staffSessions.staffId, id));
    return updated;
  });
}
async function permanentlyDeleteUser(id) {
  return withTransaction(async (transaction) => {
    const [orderReference, paymentReference, auditReference] = await Promise.all([
      transaction.select({ id: orders.id }).from(orders).where(eq2(orders.createdByStaffId, id)).limit(1),
      transaction.select({ id: payments.id }).from(payments).where(eq2(payments.processedByStaffId, id)).limit(1),
      transaction.select({ id: auditEvents.id }).from(auditEvents).where(eq2(auditEvents.actorStaffId, id)).limit(1)
    ]);
    if (orderReference[0] || paymentReference[0] || auditReference[0]) throw new Error("STAFF_HAS_BUSINESS_HISTORY");
    await transaction.delete(staffSessions).where(eq2(staffSessions.staffId, id));
    return (await transaction.delete(users).where(eq2(users.id, id)).returning())[0] ?? null;
  });
}

// src/middleware/auth.ts
import { clerkClient, getAuth } from "@clerk/express";

// src/db/access.ts
import { and as and3, desc as desc2, eq as eq3, gt, isNotNull, isNull as isNull2, ne, sql as sql3 } from "drizzle-orm";

// src/auth/security.ts
import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
var scrypt = promisify(nodeScrypt);
var TERMINAL_COOKIE = "vc_terminal";
var STAFF_COOKIE = "vc_staff";
function newOpaqueToken() {
  return randomBytes(32).toString("base64url");
}
function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}
function validatePinFormat(pin) {
  return /^\d{4,6}$/.test(pin);
}
async function hashPin(pin) {
  if (!validatePinFormat(pin)) throw new Error("PIN must contain 4 to 6 digits");
  const salt = randomBytes(16);
  const derived = await scrypt(pin, salt, 64);
  return `scrypt:${salt.toString("base64url")}:${derived.toString("base64url")}`;
}
async function verifyPin(pin, encoded) {
  try {
    const [algorithm, saltValue, hashValue] = encoded.split(":");
    if (algorithm !== "scrypt" || !saltValue || !hashValue) return false;
    const expected = Buffer.from(hashValue, "base64url");
    const actual = await scrypt(pin, Buffer.from(saltValue, "base64url"), expected.length);
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
function readCookies(header) {
  if (!header) return {};
  return Object.fromEntries(header.split(";").map((part) => {
    const index2 = part.indexOf("=");
    const key = index2 < 0 ? part.trim() : part.slice(0, index2).trim();
    const value = index2 < 0 ? "" : part.slice(index2 + 1).trim();
    return [key, decodeURIComponent(value)];
  }));
}
function sessionCookie(name, value, maxAgeSeconds) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=${encodeURIComponent(value)}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAgeSeconds}${secure}`;
}
function clearCookie(name) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${name}=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0${secure}`;
}

// src/db/access.ts
async function ensureAccountForStaff(staffId) {
  const staff = await db.select().from(users).where(eq3(users.id, staffId)).limit(1);
  if (!staff[0]) throw new Error("Staff profile not found");
  if (staff[0].restaurantId && staff[0].locationId) return staff[0];
  throw new Error("Staff profile is not attached to a restaurant organization");
}
async function listLocationTerminals(locationId) {
  return db.select({ id: terminals.id, name: terminals.name, type: terminals.type, isActive: terminals.isActive }).from(terminals).where(and3(eq3(terminals.locationId, locationId), eq3(terminals.isActive, true), isNull2(terminals.revokedAt))).orderBy(terminals.name);
}
async function authorizeTerminal(staffId, name, pin, type = "register", requestedTerminalId) {
  const staff = await ensureAccountForStaff(staffId);
  const locationTerminals = await db.select().from(terminals).where(and3(eq3(terminals.locationId, staff.locationId), eq3(terminals.isActive, true), isNull2(terminals.revokedAt)));
  const requestedExisting = requestedTerminalId ? locationTerminals.find((terminal) => terminal.id === requestedTerminalId) : locationTerminals.find((terminal) => terminal.name.toLocaleLowerCase() === name.toLocaleLowerCase());
  if (locationTerminals.length && !requestedExisting) throw new Error("Select an existing terminal. New terminal creation is disabled while this location already has terminals.");
  let pinHash;
  if (requestedExisting) {
    if (staff.pinLockedUntil && staff.pinLockedUntil > /* @__PURE__ */ new Date()) throw new Error("Too many incorrect PIN attempts. Try again in one minute.");
    if (!staff.pinHash) throw new Error("This administrator does not have a PIN. Use staff management from another authorized administrator to set one.");
    if (!await verifyPin(pin, staff.pinHash)) {
      const attempts = (staff.failedPinAttempts || 0) + 1;
      await db.update(users).set({ failedPinAttempts: attempts >= 5 ? 0 : attempts, pinLockedUntil: attempts >= 5 ? new Date(Date.now() + 6e4) : null }).where(eq3(users.id, staff.id));
      throw new Error(attempts >= 5 ? "Too many incorrect PIN attempts. Try again in one minute." : "Incorrect administrator PIN");
    }
  } else {
    await assertUniqueLocationPin(staff.locationId, pin, staffId);
    pinHash = await hashPin(pin);
  }
  const rawToken = newOpaqueToken();
  return withTransaction(async (transaction) => {
    await transaction.update(users).set({ ...pinHash ? { pinHash, pinVersion: sql3`${users.pinVersion} + 1` } : {}, failedPinAttempts: 0, pinLockedUntil: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, staff.id));
    const existing = requestedExisting ? (await transaction.select().from(terminals).where(and3(eq3(terminals.id, requestedExisting.id), eq3(terminals.locationId, staff.locationId), eq3(terminals.isActive, true), isNull2(terminals.revokedAt))).limit(1))[0] : void 0;
    if (requestedExisting && !existing) throw new Error("The selected terminal changed while it was being authorized. Reload and try again.");
    const terminal = existing ? (await transaction.update(terminals).set({ credentialHash: hashToken(rawToken), type, enrolledByStaffId: staff.id, lastSeenAt: /* @__PURE__ */ new Date() }).where(eq3(terminals.id, existing.id)).returning())[0] : (await transaction.insert(terminals).values({ restaurantId: staff.restaurantId, locationId: staff.locationId, name, type, credentialHash: hashToken(rawToken), enrolledByStaffId: staff.id }).returning())[0];
    if (existing) await transaction.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq3(staffSessions.terminalId, terminal.id), isNull2(staffSessions.revokedAt)));
    await transaction.insert(auditEvents).values({ restaurantId: terminal.restaurantId, locationId: terminal.locationId, terminalId: terminal.id, actorStaffId: staff.id, action: existing ? "terminal.reauthorized" : "terminal.enrolled", entityType: "terminal", entityId: String(terminal.id) });
    return { terminal, rawToken };
  });
}
async function findTerminalByToken(rawToken) {
  if (!rawToken) return null;
  const result = await db.select({ terminal: terminals }).from(terminals).innerJoin(restaurants, eq3(restaurants.id, terminals.restaurantId)).where(and3(
    eq3(terminals.credentialHash, hashToken(rawToken)),
    eq3(terminals.isActive, true),
    isNull2(terminals.revokedAt),
    eq3(restaurants.status, "active")
  )).limit(1);
  return result[0]?.terminal ?? null;
}
async function listTerminalStaff(terminalId) {
  const terminal = await db.select().from(terminals).where(eq3(terminals.id, terminalId)).limit(1);
  if (!terminal[0]) return [];
  return db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(and3(
    eq3(users.restaurantId, terminal[0].restaurantId),
    eq3(users.locationId, terminal[0].locationId),
    eq3(users.isActive, true),
    isNotNull(users.pinHash)
  ));
}
async function authenticatePin(terminalId, staffId, pin) {
  const terminal = (await db.select().from(terminals).where(eq3(terminals.id, terminalId)).limit(1))[0];
  if (!terminal) return { ok: false, reason: "invalid" };
  const staff = (await db.select().from(users).where(and3(
    eq3(users.id, staffId),
    eq3(users.restaurantId, terminal.restaurantId),
    eq3(users.locationId, terminal.locationId),
    eq3(users.isActive, true)
  )).limit(1))[0];
  if (staff?.pinLockedUntil && staff.pinLockedUntil > /* @__PURE__ */ new Date()) return { ok: false, reason: "locked" };
  const valid = Boolean(staff?.pinHash) && await verifyPin(pin, staff.pinHash);
  if (!valid) {
    const attempts = (staff?.failedPinAttempts || 0) + 1;
    if (staff) await db.update(users).set({
      failedPinAttempts: attempts >= 5 ? 0 : attempts,
      pinLockedUntil: attempts >= 5 ? new Date(Date.now() + 6e4) : null
    }).where(eq3(users.id, staff.id));
    return { ok: false, reason: attempts >= 5 ? "locked" : "invalid" };
  }
  await db.update(users).set({ failedPinAttempts: 0, pinLockedUntil: null }).where(eq3(users.id, staff.id));
  await db.update(terminals).set({ lastSeenAt: /* @__PURE__ */ new Date() }).where(eq3(terminals.id, terminal.id));
  const rawToken = newOpaqueToken();
  const expiresAt = new Date(Date.now() + terminal.inactivityTimeoutMinutes * 6e4);
  const session = (await db.insert(staffSessions).values({
    tokenHash: hashToken(rawToken),
    terminalId: terminal.id,
    staffId: staff.id,
    expiresAt
  }).returning())[0];
  await writeAudit({ terminal, actorStaffId: staff.id, action: "staff.signed_in", entityType: "staff_session", entityId: String(session.id) });
  return { ok: true, rawToken, staff, expiresAt };
}
async function findStaffSession(rawToken, terminalId) {
  if (!rawToken) return null;
  const rows = await db.select({ session: staffSessions, staff: users }).from(staffSessions).innerJoin(users, eq3(users.id, staffSessions.staffId)).where(and3(
    eq3(staffSessions.tokenHash, hashToken(rawToken)),
    eq3(staffSessions.terminalId, terminalId),
    isNull2(staffSessions.revokedAt),
    gt(staffSessions.expiresAt, /* @__PURE__ */ new Date()),
    eq3(users.isActive, true)
  )).limit(1);
  if (!rows[0]) return null;
  const terminal = (await db.select({ inactivityTimeoutMinutes: terminals.inactivityTimeoutMinutes }).from(terminals).where(eq3(terminals.id, terminalId)).limit(1))[0];
  const expiresAt = new Date(Date.now() + (terminal?.inactivityTimeoutMinutes || 15) * 6e4);
  await db.update(staffSessions).set({ lastActivityAt: /* @__PURE__ */ new Date(), expiresAt }).where(eq3(staffSessions.id, rows[0].session.id));
  return { ...rows[0], expiresAt };
}
async function revokeStaffSession(rawToken) {
  if (!rawToken) return;
  await db.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq3(staffSessions.tokenHash, hashToken(rawToken)));
}
async function revokeTerminal(terminalId) {
  await db.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq3(staffSessions.terminalId, terminalId), isNull2(staffSessions.revokedAt)));
  return (await db.update(terminals).set({ isActive: false, revokedAt: /* @__PURE__ */ new Date() }).where(eq3(terminals.id, terminalId)).returning())[0] ?? null;
}
async function setStaffPin(staffId, pin) {
  const target = (await db.select().from(users).where(eq3(users.id, staffId)).limit(1))[0];
  if (!target) return null;
  await assertUniqueLocationPin(target.locationId, pin, staffId);
  const pinHash = await hashPin(pin);
  return withTransaction(async (transaction) => {
    const updated = await transaction.update(users).set({ pinHash, pinVersion: sql3`${users.pinVersion} + 1`, failedPinAttempts: 0, pinLockedUntil: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, staffId)).returning();
    await transaction.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq3(staffSessions.staffId, staffId), isNull2(staffSessions.revokedAt)));
    return updated[0] ?? null;
  });
}
async function recoverRestaurantOwnerPin(staffId, pin) {
  const target = await ensureAccountForStaff(staffId);
  if (target.role !== "restaurant_owner") throw new Error("Only a restaurant owner can recover their own PIN");
  await assertUniqueLocationPin(target.locationId, pin, target.id);
  const pinHash = await hashPin(pin);
  return withTransaction(async (transaction) => {
    const updated = (await transaction.update(users).set({ pinHash, pinVersion: sql3`${users.pinVersion} + 1`, failedPinAttempts: 0, pinLockedUntil: null, updatedAt: /* @__PURE__ */ new Date() }).where(eq3(users.id, target.id)).returning())[0];
    await transaction.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq3(staffSessions.staffId, target.id), isNull2(staffSessions.revokedAt)));
    await transaction.insert(auditEvents).values({ restaurantId: target.restaurantId, locationId: target.locationId, actorStaffId: target.id, action: "owner.pin_recovered", entityType: "staff", entityId: String(target.id), metadata: { clerkVerified: true } });
    return updated;
  });
}
async function createPinStaff(input) {
  await assertUniqueLocationPin(input.locationId, input.pin);
  const pinHash = await hashPin(input.pin);
  return (await db.insert(users).values({ ...input, pinHash, email: null, clerkUserId: null }).returning())[0];
}
async function assertUniqueLocationPin(locationId, pin, exceptStaffId) {
  if (!locationId) return;
  const conditions = [eq3(users.locationId, locationId), eq3(users.isActive, true)];
  if (exceptStaffId) conditions.push(ne(users.id, exceptStaffId));
  const candidates = await db.select({ pinHash: users.pinHash }).from(users).where(and3(...conditions));
  for (const candidate of candidates) {
    if (candidate.pinHash && await verifyPin(pin, candidate.pinHash)) throw new Error("That PIN is already assigned at this location");
  }
}
async function writeAudit(input) {
  await db.insert(auditEvents).values({
    restaurantId: input.terminal.restaurantId,
    locationId: input.terminal.locationId,
    terminalId: input.terminal.id,
    actorStaffId: input.actorStaffId,
    approverStaffId: input.approverStaffId,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId,
    metadata: input.metadata
  });
}
async function listAuditEvents(restaurantId, locationId, limit = 100) {
  return db.select().from(auditEvents).where(and3(eq3(auditEvents.restaurantId, restaurantId), eq3(auditEvents.locationId, locationId))).orderBy(desc2(auditEvents.createdAt)).limit(Math.min(200, Math.max(1, limit)));
}

// src/middleware/auth.ts
var rolePermissions = {
  restaurant_owner: ["orders.read", "orders.write", "orders.cancel", "discounts.apply", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  restaurant_admin: ["orders.read", "orders.write", "orders.cancel", "discounts.apply", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  general_manager: ["orders.read", "orders.write", "orders.cancel", "discounts.apply", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  accountant: ["orders.read", "reports.view"],
  shift_manager: ["orders.read", "orders.write", "orders.cancel", "discounts.apply", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "reports.view"],
  cashier: ["orders.read", "orders.write", "payments.process", "tables.manage"],
  server: ["orders.read", "orders.write", "tables.manage"],
  bartender: ["orders.read", "orders.write", "payments.process", "tables.manage"],
  host: ["orders.read", "tables.manage"],
  kitchen: ["orders.read", "kitchen.manage"]
};
var attachClerkAuth = async (req, _res, next) => {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      req.authUserId = auth.userId;
      req.clerkOrgId = auth.orgId;
      req.clerkOrgRole = auth.orgRole;
      const user = auth.orgId ? await getUserByClerkOrg(auth.userId, auth.orgId) : null;
      if (user) {
        req.userRole = user.role;
      }
    }
  } catch (err) {
  }
  next();
};
async function getPlatformRole(userId) {
  const owners = (process.env.PLATFORM_OWNER_CLERK_USER_IDS || "").split(",").map((value) => value.trim()).filter(Boolean);
  if (owners.includes(userId)) return "platform_owner";
  const user = await clerkClient.users.getUser(userId);
  const role = String(user.privateMetadata?.platformRole || user.publicMetadata?.platformRole || "");
  return ["platform_owner", "platform_support", "platform_billing"].includes(role) ? role : null;
}
var requirePlatformRole = (allowed) => async (req, res, next) => {
  if (!req.authUserId) return res.status(401).json({ error: "Clerk authentication required" });
  const role = await getPlatformRole(req.authUserId);
  if (!role || !allowed.includes(role)) return res.status(403).json({ error: "Platform access required" });
  req.platformRole = role;
  next();
};
var requireStrictAuth = (req, res, next) => {
  try {
    const { userId, orgId, orgRole } = getAuth(req);
    if (!userId) return res.status(401).json({ error: "Clerk authentication required" });
    req.authUserId = userId;
    req.clerkOrgId = orgId;
    req.clerkOrgRole = orgRole;
    next();
  } catch {
    return res.status(401).json({ error: "Clerk authentication required" });
  }
};
var requireTerminal = async (req, res, next) => {
  const terminal = await findTerminalByToken(readCookies(req.headers.cookie)[TERMINAL_COOKIE]);
  if (!terminal) return res.status(401).json({ error: "This device is not an authorized terminal", code: "TERMINAL_REQUIRED" });
  req.terminal = terminal;
  next();
};
var requireStaffSession = async (req, res, next) => {
  if (!req.terminal) return res.status(401).json({ error: "Terminal authentication required" });
  const result = await findStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE], req.terminal.id);
  if (!result) return res.status(401).json({ error: "Employee PIN session required", code: "STAFF_SESSION_REQUIRED" });
  req.staff = result.staff;
  req.staffSessionId = result.session.id;
  req.userRole = result.staff.role;
  next();
};
var requirePermission = (permission) => (req, res, next) => {
  const role = req.staff?.role;
  if (!role || !rolePermissions[role]?.includes(permission)) return res.status(403).json({ error: `Permission required: ${permission}` });
  next();
};
function permissionsForRole(role) {
  return rolePermissions[role] ?? [];
}

// src/server/app.ts
import { clerkMiddleware, clerkClient as clerkClient2, getAuth as getAuth2 } from "@clerk/express";

// src/types.ts
var BACK_OFFICE_ROLES = ["restaurant_owner", "restaurant_admin", "general_manager", "accountant"];
var OPERATIONAL_ROLES = ["shift_manager", "cashier", "server", "bartender", "host", "kitchen"];
var RESTAURANT_ROLES = [...BACK_OFFICE_ROLES, ...OPERATIONAL_ROLES];

// src/auth/organizationRoles.ts
var clerkRoleForAppRole = {
  restaurant_owner: "org:restaurant_owner",
  restaurant_admin: "org:restaurant_admin",
  general_manager: "org:general_manager",
  accountant: "org:accountant"
};
function appRoleForClerkRole(role) {
  const entry = Object.entries(clerkRoleForAppRole).find(([, clerkRole]) => clerkRole === role);
  if (entry) return entry[0];
  if (role === "org:admin") return "restaurant_owner";
  if (role === "org:member") return "restaurant_admin";
  return null;
}

// src/db/organizations.ts
import { and as and4, eq as eq4 } from "drizzle-orm";
async function createRestaurantRecord(input) {
  return withTransaction(async (transaction) => {
    const restaurant = (await transaction.insert(restaurants).values({ ...input, status: "active", receiptName: input.name }).returning())[0];
    const location = (await transaction.insert(locations).values({ restaurantId: restaurant.id, name: "Main Location" }).returning())[0];
    return { restaurant, location };
  });
}
async function getRestaurantByClerkOrgId(clerkOrganizationId) {
  return (await db.select().from(restaurants).where(eq4(restaurants.clerkOrganizationId, clerkOrganizationId)).limit(1))[0] ?? null;
}
async function getRestaurantWithDefaultLocation(clerkOrganizationId) {
  const restaurant = await getRestaurantByClerkOrgId(clerkOrganizationId);
  if (!restaurant) return null;
  const location = (await db.select().from(locations).where(eq4(locations.restaurantId, restaurant.id)).limit(1))[0] ?? null;
  return { restaurant, location };
}
async function listRestaurantClients() {
  return db.select().from(restaurants);
}
async function updateRestaurantStatus(restaurantId, status) {
  return (await db.update(restaurants).set({ status }).where(eq4(restaurants.id, restaurantId)).returning())[0] ?? null;
}
async function getRestaurantSettings(restaurantId, locationId) {
  const restaurant = (await db.select().from(restaurants).where(eq4(restaurants.id, restaurantId)).limit(1))[0];
  const location = (await db.select().from(locations).where(and4(eq4(locations.id, locationId), eq4(locations.restaurantId, restaurantId))).limit(1))[0];
  return restaurant && location ? { restaurant, location } : null;
}
async function updateRestaurantSettings(restaurantId, locationId, terminalId, input) {
  return withTransaction(async (transaction) => {
    const restaurant = (await transaction.update(restaurants).set({ receiptName: input.receiptName, currency: input.currency, taxRateBps: input.taxRateBps }).where(eq4(restaurants.id, restaurantId)).returning())[0];
    const location = (await transaction.update(locations).set({ timezone: input.timezone }).where(and4(eq4(locations.id, locationId), eq4(locations.restaurantId, restaurantId))).returning())[0];
    await transaction.update(terminals).set({ inactivityTimeoutMinutes: input.inactivityTimeoutMinutes }).where(and4(eq4(terminals.id, terminalId), eq4(terminals.locationId, locationId)));
    return { restaurant, location, inactivityTimeoutMinutes: input.inactivityTimeoutMinutes };
  });
}
async function attachBackOfficeUser(input) {
  const account = await getRestaurantWithDefaultLocation(input.orgId);
  if (!account?.location || account.restaurant.status !== "active") throw new Error("Restaurant organization is not active");
  const existing = (await db.select().from(users).where(and4(eq4(users.clerkUserId, input.clerkUserId), eq4(users.restaurantId, account.restaurant.id))).limit(1))[0];
  if (existing) {
    return (await db.update(users).set({
      restaurantId: account.restaurant.id,
      locationId: account.location.id,
      email: input.email,
      name: input.name,
      role: input.role,
      isActive: true,
      updatedAt: /* @__PURE__ */ new Date()
    }).where(eq4(users.id, existing.id)).returning())[0];
  }
  return (await db.insert(users).values({
    restaurantId: account.restaurant.id,
    locationId: account.location.id,
    clerkUserId: input.clerkUserId,
    email: input.email,
    name: input.name,
    role: input.role
  }).returning())[0];
}

// src/lib/cloudinary.ts
import { v2 as cloudinary } from "cloudinary";
function assertConfigured() {
  if (process.env.CLOUDINARY_URL) return;
  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    throw new Error("Cloudinary credentials are not configured");
  }
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
  });
}
async function uploadMenuImage(buffer, restaurantId) {
  assertConfigured();
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream({
      folder: `restaurant-pos/restaurants/${restaurantId}/menu`,
      resource_type: "image",
      overwrite: false,
      transformation: [{ width: 1600, height: 1600, crop: "limit" }, { quality: "auto", fetch_format: "auto" }]
    }, (error, result) => {
      if (error || !result) reject(error || new Error("Cloudinary did not return an upload result"));
      else resolve({ secureUrl: result.secure_url, publicId: result.public_id });
    });
    stream.end(buffer);
  });
}
async function deleteMenuImage(publicId) {
  if (!publicId) return;
  assertConfigured();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true });
}

// src/server/httpDiagnostics.ts
import { randomUUID } from "node:crypto";
var STATUS_CODES = {
  400: "BAD_REQUEST",
  401: "UNAUTHORIZED",
  403: "FORBIDDEN",
  404: "NOT_FOUND",
  409: "CONFLICT",
  413: "PAYLOAD_TOO_LARGE",
  422: "VALIDATION_FAILED",
  429: "RATE_LIMITED",
  500: "INTERNAL_ERROR",
  502: "UPSTREAM_ERROR",
  503: "SERVICE_UNAVAILABLE"
};
function errorCodeForStatus(status) {
  return STATUS_CODES[status] || (status >= 500 ? "INTERNAL_ERROR" : "REQUEST_FAILED");
}
function requestIdFromHeader(value) {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate && /^[A-Za-z0-9._:-]{8,128}$/.test(candidate) ? candidate : randomUUID();
}
function structuredErrorBody(body, status, requestId) {
  if (status < 400 || typeof body.error !== "string") return body;
  return {
    ...body,
    code: typeof body.code === "string" && body.code ? body.code : errorCodeForStatus(status),
    requestId
  };
}
function apiDiagnostics(req, res, next) {
  if (!req.path.startsWith("/api")) return next();
  const requestId = requestIdFromHeader(req.headers["x-request-id"]);
  const startedAt = Date.now();
  res.locals.requestId = requestId;
  res.setHeader("x-request-id", requestId);
  const sendJson = res.json.bind(res);
  res.json = ((body) => sendJson(structuredErrorBody(body, res.statusCode, requestId)));
  res.once("finish", () => {
    if (res.statusCode < 400) return;
    console.error(JSON.stringify({
      level: res.statusCode >= 500 ? "error" : "warn",
      event: "api_request_failed",
      requestId,
      method: req.method,
      path: req.path,
      status: res.statusCode,
      durationMs: Date.now() - startedAt
    }));
  });
  next();
}

// src/server/app.ts
var clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
var clerkSecretKey = process.env.CLERK_SECRET_KEY;
var app = express();
app.use(apiDiagnostics);
var menuImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ["image/jpeg", "image/png", "image/webp", "image/avif"].includes(file.mimetype))
});
function menuItemPayload(body) {
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const prepTimeMinutes = Number(body.prepTimeMinutes);
  const calories = body.calories === "" || body.calories == null ? void 0 : Number(body.calories);
  if (!String(body.name || "").trim() || !Number.isInteger(categoryId) || categoryId < 1 || !Number.isInteger(price) || price < 0) throw new Error("Name, category, and a valid price are required");
  if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 1 || prepTimeMinutes > 240) throw new Error("Preparation time must be between 1 and 240 minutes");
  if (calories !== void 0 && (!Number.isInteger(calories) || calories < 0 || calories > 1e5)) throw new Error("Calories must be a valid non-negative number");
  return {
    categoryId,
    price,
    prepTimeMinutes,
    calories,
    name: String(body.name).trim().slice(0, 120),
    description: String(body.description || "").trim().slice(0, 1e3),
    allergens: String(body.allergens || "").trim().slice(0, 500),
    isAvailable: body.isAvailable === true || body.isAvailable === "true"
  };
}
function publicStaff(staff) {
  return { id: staff.id, name: staff.name, role: staff.role, email: staff.email ?? null };
}
function publicTerminal(terminal) {
  return {
    id: terminal.id,
    name: terminal.name,
    type: terminal.type,
    locationId: terminal.locationId,
    inactivityTimeoutMinutes: terminal.inactivityTimeoutMinutes
  };
}
function platformSetupError(error) {
  const message = String(error?.errors?.[0]?.longMessage || error?.cause?.message || error?.message || "Unable to create restaurant client");
  const normalized = message.toLowerCase();
  if (normalized.includes("does not exist") || normalized.includes("unknown column")) return "The database has not been upgraded for client organizations. Run npm run db:migrate, then restart the application.";
  if (normalized.includes("role") && (normalized.includes("invalid") || normalized.includes("not found") || normalized.includes("does not exist"))) return "Clerk role org:restaurant_owner is missing. Create the custom Organization roles in the Clerk Dashboard, then try again.";
  if (normalized.includes("organization") && (normalized.includes("disabled") || normalized.includes("not enabled"))) return "Clerk Organizations are not enabled for this Clerk application.";
  return message;
}
function invitationRedirectUrl(req) {
  const configured = String(process.env.APP_URL || "").trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === "http:" || url.protocol === "https:") return new URL("/accept-invitation", url).toString();
    } catch {
      throw new Error("APP_URL must be an absolute http:// or https:// URL");
    }
  }
  const forwardedProtocol = String(req.headers["x-forwarded-proto"] || "").split(",")[0].trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = req.get("host");
  if (!host) throw new Error("Unable to determine the application URL");
  return `${protocol}://${host}/accept-invitation`;
}
async function getOrCreateUserFromRequest(req) {
  const { userId, orgId, orgRole } = getAuth2(req);
  if (!userId || !orgId) throw new Error("Select your restaurant organization before continuing");
  const appRole = appRoleForClerkRole(orgRole);
  if (!appRole) throw new Error("Your organization role is not configured for restaurant access");
  const clerkUser = await clerkClient2.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress || `${userId}@clerk.local`;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || email;
  return attachBackOfficeUser({ clerkUserId: userId, email, name, orgId, role: appRole });
}
app.use(express.json());
if (clerkPublishableKey && clerkSecretKey) {
  app.use(clerkMiddleware({ publishableKey: clerkPublishableKey, secretKey: clerkSecretKey }));
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", attachClerkAuth);
app.post("/api/auth/sync", requireStrictAuth, async (req, res) => {
  try {
    res.json(await getOrCreateUserFromRequest(req));
  } catch (error) {
    res.status(403).json({ error: error?.message || "Organization access could not be synchronized" });
  }
});
app.get("/api/platform/session", requireStrictAuth, async (req, res) => {
  const role = await getPlatformRole(req.authUserId);
  res.json({ role });
});
app.get("/api/platform/clients", requireStrictAuth, requirePlatformRole(["platform_owner", "platform_support", "platform_billing"]), async (_req, res) => {
  try {
    res.json(await listRestaurantClients());
  } catch (error) {
    res.status(500).json({ error: platformSetupError(error) });
  }
});
app.post("/api/platform/clients", requireStrictAuth, requirePlatformRole(["platform_owner"]), async (req, res) => {
  const name = String(req.body.name || "").trim();
  const ownerEmail = String(req.body.ownerEmail || "").trim().toLowerCase();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(ownerEmail)) return res.status(400).json({ error: "Restaurant name and valid owner email are required" });
  let organization = null;
  try {
    organization = await clerkClient2.organizations.createOrganization({ name, createdBy: req.authUserId, maxAllowedMemberships: 50 });
    const invitation = await clerkClient2.organizations.createOrganizationInvitation({
      organizationId: organization.id,
      inviterUserId: req.authUserId,
      emailAddress: ownerEmail,
      role: clerkRoleForAppRole.restaurant_owner,
      redirectUrl: invitationRedirectUrl(req)
    });
    const record = await createRestaurantRecord({ clerkOrganizationId: organization.id, name, slug: organization.slug || organization.id, createdByClerkUserId: req.authUserId });
    await clerkClient2.organizations.deleteOrganizationMembership({ organizationId: organization.id, userId: req.authUserId }).catch((error) => console.warn("Could not remove temporary platform membership", error));
    res.status(201).json({ restaurant: record.restaurant, invitation: { id: invitation.id, emailAddress: invitation.emailAddress, status: invitation.status } });
  } catch (error) {
    if (organization) await clerkClient2.organizations.deleteOrganization(organization.id).catch(() => void 0);
    res.status(400).json({ error: platformSetupError(error) });
  }
});
app.patch("/api/platform/clients/:id/status", requireStrictAuth, requirePlatformRole(["platform_owner"]), async (req, res) => {
  const status = String(req.body.status);
  if (!["active", "suspended"].includes(status)) return res.status(400).json({ error: "Invalid client status" });
  const client = await updateRestaurantStatus(Number(req.params.id), status);
  if (!client) return res.status(404).json({ error: "Restaurant client not found" });
  res.json(client);
});
app.post("/api/organization/invitations", requireStrictAuth, requireTerminal, requireStaffSession, async (req, res) => {
  try {
    const { userId, orgId, orgRole } = getAuth2(req);
    if (!userId || !orgId) return res.status(400).json({ error: "Select a restaurant organization first" });
    const actorRole = appRoleForClerkRole(orgRole);
    if (actorRole !== "restaurant_owner" || req.staff?.role !== "restaurant_owner") return res.status(403).json({ error: "Only the active restaurant owner can invite back-office administrators" });
    const restaurant = await getRestaurantByClerkOrgId(orgId);
    if (!restaurant || restaurant.status !== "active") return res.status(404).json({ error: "Restaurant organization not found" });
    if (restaurant.id !== req.terminal.restaurantId) return res.status(403).json({ error: "The active terminal does not belong to this organization" });
    const emailAddress = String(req.body.emailAddress || "").trim().toLowerCase();
    const role = String(req.body.role || "restaurant_admin");
    if (!BACK_OFFICE_ROLES.includes(role) || role === "restaurant_owner") return res.status(400).json({ error: "Invalid back-office role" });
    const invitation = await clerkClient2.organizations.createOrganizationInvitation({ organizationId: orgId, inviterUserId: userId, emailAddress, role: clerkRoleForAppRole[role], redirectUrl: invitationRedirectUrl(req) });
    res.status(201).json({ id: invitation.id, emailAddress: invitation.emailAddress, status: invitation.status, role });
  } catch (error) {
    res.status(400).json({ error: error?.errors?.[0]?.longMessage || error?.message || "Unable to send invitation" });
  }
});
app.post("/api/access/terminal/enroll", requireStrictAuth, async (req, res) => {
  try {
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (!["restaurant_owner", "restaurant_admin", "general_manager"].includes(String(clerkStaff.role))) return res.status(403).json({ error: "Your restaurant role cannot enroll terminals" });
    const name = String(req.body.name || "").trim();
    const pin = String(req.body.pin || "");
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: "Terminal name must contain 2 to 60 characters" });
    if (!validatePinFormat(pin)) return res.status(400).json({ error: "Administrator PIN must contain 4 to 6 digits" });
    const requestedTerminalId = req.body.terminalId == null ? void 0 : Number(req.body.terminalId);
    if (requestedTerminalId !== void 0 && (!Number.isInteger(requestedTerminalId) || requestedTerminalId < 1)) return res.status(400).json({ error: "Select a valid terminal" });
    const { terminal, rawToken } = await authorizeTerminal(clerkStaff.id, name, pin, String(req.body.type || "register"), requestedTerminalId);
    res.setHeader("Set-Cookie", sessionCookie(TERMINAL_COOKIE, rawToken, 60 * 60 * 24 * 90));
    res.status(201).json({ terminal: publicTerminal(terminal) });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to enroll terminal" });
  }
});
app.get("/api/access/terminal/options", requireStrictAuth, async (req, res) => {
  try {
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (!["restaurant_owner", "restaurant_admin", "general_manager"].includes(String(clerkStaff.role))) return res.status(403).json({ error: "Your restaurant role cannot authorize terminals" });
    res.json(await listLocationTerminals(clerkStaff.locationId));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to load existing terminals" });
  }
});
app.post("/api/access/owner-pin/recover", requireStrictAuth, async (req, res) => {
  try {
    const { orgRole } = getAuth2(req);
    if (appRoleForClerkRole(orgRole) !== "restaurant_owner") return res.status(403).json({ error: "Only the active Clerk restaurant owner can recover this PIN" });
    const pin = String(req.body.pin || "");
    if (!validatePinFormat(pin)) return res.status(400).json({ error: "New PIN must contain 4 to 6 digits" });
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (clerkStaff.role !== "restaurant_owner") return res.status(403).json({ error: "The owner membership is not synchronized" });
    await recoverRestaurantOwnerPin(clerkStaff.id, pin);
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to recover the owner PIN" });
  }
});
app.get("/api/access/terminal", requireTerminal, (req, res) => {
  res.json({ terminal: publicTerminal(req.terminal) });
});
app.get("/api/access/profiles", requireTerminal, async (req, res) => {
  res.json(await listTerminalStaff(req.terminal.id));
});
app.post("/api/access/login", requireTerminal, async (req, res) => {
  const staffId = Number(req.body.staffId);
  const pin = String(req.body.pin || "");
  if (!Number.isInteger(staffId) || !validatePinFormat(pin)) return res.status(400).json({ error: "Select a profile and enter a valid PIN" });
  const result = await authenticatePin(req.terminal.id, staffId, pin);
  if (!result.ok) {
    const status = result.reason === "locked" ? 429 : 401;
    return res.status(status).json({ error: result.reason === "locked" ? "Too many attempts. Try again in one minute." : "Incorrect PIN" });
  }
  res.setHeader("Set-Cookie", sessionCookie(STAFF_COOKIE, result.rawToken, 60 * 60 * 12));
  res.json({ staff: publicStaff(result.staff), permissions: permissionsForRole(result.staff.role) });
});
app.post("/api/access/lock", requireTerminal, async (req, res) => {
  await revokeStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE]);
  res.setHeader("Set-Cookie", clearCookie(STAFF_COOKIE));
  res.json({ success: true });
});
app.post("/api/access/signout", async (req, res) => {
  await revokeStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE]);
  res.setHeader("Set-Cookie", clearCookie(STAFF_COOKIE));
  res.json({ success: true });
});
app.get("/api/access/session", requireTerminal, requireStaffSession, (req, res) => {
  res.json({ staff: publicStaff(req.staff), permissions: permissionsForRole(req.staff.role) });
});
app.use("/api", requireTerminal, requireStaffSession);
app.use("/api/staff", requirePermission("staff.manage"));
app.use("/api/analytics", requirePermission("reports.view"));
app.get("/api/config", async (req, res) => {
  const settings = await getRestaurantSettings(req.terminal.restaurantId, req.terminal.locationId);
  if (!settings) return res.status(404).json({ error: "Restaurant configuration not found" });
  res.json({ receiptName: settings.restaurant.receiptName || settings.restaurant.name, currency: settings.restaurant.currency, taxRateBps: settings.restaurant.taxRateBps, timezone: settings.location.timezone });
});
app.get("/api/settings", requirePermission("staff.manage"), async (req, res) => {
  const settings = await getRestaurantSettings(req.terminal.restaurantId, req.terminal.locationId);
  if (!settings) return res.status(404).json({ error: "Restaurant settings not found" });
  res.json({ receiptName: settings.restaurant.receiptName || settings.restaurant.name, currency: settings.restaurant.currency, taxRateBps: settings.restaurant.taxRateBps, timezone: settings.location.timezone, inactivityTimeoutMinutes: req.terminal.inactivityTimeoutMinutes });
});
app.put("/api/settings", requirePermission("staff.manage"), async (req, res) => {
  const receiptName = String(req.body.receiptName || "").trim();
  const currency = String(req.body.currency || "").trim().toUpperCase();
  const timezone = String(req.body.timezone || "").trim();
  const taxRateBps = Number(req.body.taxRateBps);
  const inactivityTimeoutMinutes = Number(req.body.inactivityTimeoutMinutes);
  if (receiptName.length < 2 || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 1e4 || !Number.isInteger(inactivityTimeoutMinutes) || inactivityTimeoutMinutes < 1 || inactivityTimeoutMinutes > 240) return res.status(400).json({ error: "Invalid restaurant settings" });
  try {
    Intl.DateTimeFormat("en", { timeZone: timezone });
  } catch {
    return res.status(400).json({ error: "Invalid IANA timezone" });
  }
  const updated = await updateRestaurantSettings(req.terminal.restaurantId, req.terminal.locationId, req.terminal.id, { receiptName, currency, timezone, taxRateBps, inactivityTimeoutMinutes });
  await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "settings.updated", entityType: "restaurant", entityId: String(req.terminal.restaurantId) });
  res.json(updated);
});
app.get("/api/audit", requirePermission("reports.view"), async (req, res) => {
  res.json(await listAuditEvents(req.terminal.restaurantId, req.terminal.locationId, Number(req.query.limit) || 100));
});
app.delete("/api/access/terminal", requirePermission("terminals.manage"), async (req, res) => {
  await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "terminal.revoked", entityType: "terminal", entityId: String(req.terminal.id) });
  await revokeTerminal(req.terminal.id);
  res.setHeader("Set-Cookie", [clearCookie(STAFF_COOKIE), clearCookie(TERMINAL_COOKIE)]);
  res.json({ success: true });
});
app.get("/api/staff", async (req, res) => {
  try {
    const users2 = await getAllUsers(req.terminal.restaurantId, req.terminal.locationId);
    res.json(users2);
  } catch (error) {
    console.error("Failed to get staff:", error);
    const message = error?.cause?.message || error?.message || "Failed to get staff";
    res.status(500).json({ error: message });
  }
});
app.post("/api/staff", async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const role = String(req.body.role || "").toLowerCase();
    const pin = String(req.body.pin || "");
    if (name.length < 2 || !OPERATIONAL_ROLES.includes(role) || !validatePinFormat(pin)) {
      return res.status(400).json({ error: "Name, valid role, and a 4 to 6 digit PIN are required" });
    }
    const staff = await createPinStaff({
      restaurantId: req.terminal.restaurantId,
      locationId: req.terminal.locationId,
      name,
      role,
      pin
    });
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "staff.created", entityType: "staff", entityId: String(staff.id), metadata: { role } });
    res.status(201).json(publicStaff(staff));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to create staff profile" });
  }
});
app.patch("/api/staff/:id/pin", async (req, res) => {
  try {
    const pin = String(req.body.pin || "");
    if (!validatePinFormat(pin)) return res.status(400).json({ error: "PIN must contain 4 to 6 digits" });
    const target = await getUserById(Number(req.params.id));
    if (!target || target.restaurantId !== req.terminal.restaurantId) return res.status(404).json({ error: "Staff profile not found" });
    const staff = await setStaffPin(target.id, pin);
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "staff.pin_reset", entityType: "staff", entityId: String(staff.id) });
    res.json({ success: true });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to reset PIN" });
  }
});
app.patch("/api/staff/:id/access", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const isActive = req.body.isActive;
    if (typeof isActive !== "boolean") return res.status(400).json({ error: "An active access state is required" });
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal.restaurantId || target.locationId !== req.terminal.locationId) return res.status(404).json({ error: "Staff profile not found" });
    if (target.id === req.staff.id && !isActive) return res.status(400).json({ error: "You cannot revoke your own active session" });
    if (target.clerkUserId) {
      if (isActive) return res.status(400).json({ error: "Re-invite this back-office user through Clerk to restore access" });
      const { orgId } = getAuth2(req);
      if (!orgId) return res.status(400).json({ error: "Select the restaurant organization first" });
      await clerkClient2.organizations.deleteOrganizationMembership({ organizationId: orgId, userId: target.clerkUserId });
    }
    const updated = await setUserActive(id, isActive);
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: isActive ? "staff.access_restored" : "staff.access_revoked", entityType: "staff", entityId: String(id) });
    res.json(publicStaff(updated));
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to change staff access" });
  }
});
app.delete("/api/staff/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal.restaurantId || target.locationId !== req.terminal.locationId) return res.status(404).json({ error: "Staff profile not found" });
    if (target.id === req.staff.id) return res.status(400).json({ error: "You cannot delete your own active profile" });
    if (target.clerkUserId) return res.status(400).json({ error: "Back-office users must be removed from the Clerk organization; revoke their POS access here instead" });
    await permanentlyDeleteUser(id);
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "staff.deleted", entityType: "staff", entityId: String(id), metadata: { name: target.name, role: target.role } });
    res.json({ success: true });
  } catch (error) {
    const detail = String(error?.cause?.message || error?.message || "");
    const referenced = detail.includes("STAFF_HAS_BUSINESS_HISTORY") || detail.toLowerCase().includes("foreign key");
    res.status(400).json({ error: referenced ? "This staff profile has business history and cannot be deleted. Revoke access instead." : detail || "Unable to delete staff profile" });
  }
});
app.patch("/api/staff/:id/role", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!OPERATIONAL_ROLES.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    if (!["restaurant_owner", "restaurant_admin", "general_manager"].includes(String(req.staff?.role))) return res.status(403).json({ error: "Restaurant administrator permission required" });
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal.restaurantId) return res.status(404).json({ error: "User not found" });
    const updatedUser = await updateUserRole(id, role);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    res.json(updatedUser);
  } catch (error) {
    console.error("Failed to update staff role:", error);
    const message = error?.cause?.message || error?.message || "Failed to update staff role";
    res.status(500).json({ error: message });
  }
});
app.get("/api/categories", async (req, res) => {
  try {
    const categories2 = await getCategories(req.terminal.restaurantId);
    res.json(categories2);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch categories";
    res.status(500).json({ error: message });
  }
});
app.post("/api/categories", requirePermission("menu.manage"), async (req, res) => {
  try {
    const name = String(req.body.name || "").trim();
    const icon = String(req.body.icon || "Utensils").trim();
    const color = String(req.body.color || "amber").trim();
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: "Category name must contain 2 to 60 characters" });
    const category = await createCategory(req.terminal.restaurantId, name, icon, color);
    res.json(category);
  } catch (error) {
    console.error("Failed to create category:", error);
    const message = error?.cause?.message || error?.message || "Failed to create category";
    res.status(500).json({ error: message });
  }
});
app.get("/api/menu-items", async (req, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : void 0;
    const items = await getMenuItems(req.terminal.restaurantId, categoryId);
    res.json(items);
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch menu items";
    res.status(500).json({ error: message });
  }
});
app.post("/api/menu-items", requirePermission("menu.manage"), menuImageUpload.single("image"), async (req, res) => {
  let uploaded = null;
  try {
    const payload = menuItemPayload(req.body);
    if (req.file) uploaded = await uploadMenuImage(req.file.buffer, req.terminal.restaurantId);
    const item = await createMenuItem({ ...payload, restaurantId: req.terminal.restaurantId, imageUrl: uploaded?.secureUrl, imagePublicId: uploaded?.publicId });
    res.json(item);
  } catch (error) {
    if (uploaded) await deleteMenuImage(uploaded.publicId).catch(() => void 0);
    console.error("Failed to create menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to create menu item";
    res.status(500).json({ error: message });
  }
});
app.put("/api/menu-items/:id", requirePermission("menu.manage"), menuImageUpload.single("image"), async (req, res) => {
  let uploaded = null;
  try {
    const id = Number(req.params.id);
    const current = await getMenuItemById(req.terminal.restaurantId, id);
    if (!current) return res.status(404).json({ error: "Menu item not found" });
    const payload = menuItemPayload(req.body);
    if (req.file) uploaded = await uploadMenuImage(req.file.buffer, req.terminal.restaurantId);
    const removeImage = req.body.removeImage === true || req.body.removeImage === "true";
    const item = await updateMenuItem(req.terminal.restaurantId, id, {
      ...payload,
      ...uploaded ? { imageUrl: uploaded.secureUrl, imagePublicId: uploaded.publicId } : removeImage ? { imageUrl: "", imagePublicId: "" } : {}
    });
    if ((uploaded || removeImage) && current.imagePublicId) await deleteMenuImage(current.imagePublicId).catch((error) => console.warn("Menu record updated but old Cloudinary image cleanup failed", error));
    res.json(item);
  } catch (error) {
    if (uploaded) await deleteMenuImage(uploaded.publicId).catch(() => void 0);
    console.error("Failed to update menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to update menu item";
    res.status(500).json({ error: message });
  }
});
app.delete("/api/menu-items/:id", requirePermission("menu.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await deleteMenuItem(req.terminal.restaurantId, id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to delete menu item";
    res.status(500).json({ error: message });
  }
});
app.get("/api/tables", async (req, res) => {
  try {
    const tables = await getTables(req.terminal.locationId);
    res.json(tables);
  } catch (error) {
    console.error("Failed to fetch tables:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch tables";
    res.status(500).json({ error: message });
  }
});
app.post("/api/tables", requirePermission("tables.manage"), async (req, res) => {
  try {
    const { tableNumber, capacity, section, posX, posY } = req.body;
    const table = await createTable(req.terminal.locationId, tableNumber, Number(capacity), section, posX, posY);
    res.json(table);
  } catch (error) {
    console.error("Failed to create table:", error);
    const message = error?.cause?.message || error?.message || "Failed to create table";
    res.status(500).json({ error: message });
  }
});
app.put("/api/tables/:id", requirePermission("tables.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const tableNumber = String(req.body.tableNumber || "").trim();
    const capacity = Number(req.body.capacity);
    const section = String(req.body.section || "").trim();
    if (!Number.isInteger(id) || id < 1 || tableNumber.length < 1 || tableNumber.length > 30 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100 || section.length < 2 || section.length > 60) return res.status(400).json({ error: "Valid table number, capacity, and section are required" });
    const table = await updateTableDetails(req.terminal.locationId, id, { tableNumber, capacity, section });
    if (!table) return res.status(404).json({ error: "Table not found" });
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "table.updated", entityType: "table", entityId: String(id), metadata: { tableNumber, capacity, section } });
    res.json(table);
  } catch (error) {
    const detail = String(error?.cause?.message || error?.message || "Unable to update table");
    res.status(detail.toLowerCase().includes("unique") ? 409 : 400).json({ error: detail.toLowerCase().includes("unique") ? "A table with this number already exists at this location" : detail });
  }
});
app.patch("/api/tables/:id", requirePermission("tables.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!["available", "reserved", "billing"].includes(String(status))) return res.status(400).json({ error: "That table state is controlled by the order and payment workflow" });
    const table = await updateTableStatus(req.terminal.locationId, id, status);
    if (!table) return res.status(404).json({ error: "Table not found" });
    res.json(table);
  } catch (error) {
    console.error("Failed to update table:", error);
    const message = error?.cause?.message || error?.message || "Failed to update table";
    res.status(500).json({ error: message });
  }
});
app.get("/api/orders", async (req, res) => {
  try {
    const statusFilter = req.query.status;
    const ordersList = await getOrders(req.terminal.restaurantId, req.terminal.locationId, statusFilter);
    res.json(ordersList);
  } catch (error) {
    console.error("Failed to fetch orders:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch orders";
    res.status(500).json({ error: message });
  }
});
app.get("/api/orders/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const order = await getOrderById(req.terminal.restaurantId, req.terminal.locationId, id);
    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }
    res.json(order);
  } catch (error) {
    console.error("Failed to get order:", error);
    const message = error?.cause?.message || error?.message || "Failed to get order";
    res.status(500).json({ error: message });
  }
});
app.post("/api/orders", requirePermission("orders.write"), async (req, res) => {
  try {
    if (!["dine-in", "takeout", "delivery", "bar"].includes(String(req.body.orderType))) return res.status(400).json({ error: "Invalid order type" });
    if (Number(req.body.discountPercent || 0) > 0 && !permissionsForRole(req.staff.role).includes("discounts.apply")) return res.status(403).json({ error: "Manager approval is required to apply a discount" });
    const order = await createOrder({ orderType: req.body.orderType, tableId: req.body.tableId, customerName: req.body.customerName, customerPhone: req.body.customerPhone, notes: req.body.notes, guestCount: req.body.guestCount, discountPercent: req.body.discountPercent, tipAmount: req.body.tipAmount, items: req.body.items, restaurantId: req.terminal.restaurantId, locationId: req.terminal.locationId, serverName: req.staff?.name || "Staff Member", createdByStaffId: req.staff?.id });
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "order.created", entityType: "order", entityId: String(order.id), metadata: { total: order.total } });
    res.status(201).json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    const message = error?.cause?.message || error?.message || "Failed to create order";
    res.status(500).json({ error: message });
  }
});
app.put("/api/orders/:id", requirePermission("orders.write"), async (req, res) => {
  try {
    if (!["dine-in", "takeout", "delivery", "bar"].includes(String(req.body.orderType))) return res.status(400).json({ error: "Invalid order type" });
    if (Number(req.body.discountPercent || 0) > 0 && !permissionsForRole(req.staff.role).includes("discounts.apply")) return res.status(403).json({ error: "Manager approval is required to apply a discount" });
    const expectedVersion = Number(req.body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return res.status(400).json({ error: "A valid order version is required" });
    const order = await replaceOrder({ orderId: Number(req.params.id), expectedVersion, orderType: req.body.orderType, tableId: req.body.tableId, customerName: req.body.customerName, customerPhone: req.body.customerPhone, notes: req.body.notes, guestCount: req.body.guestCount, discountPercent: req.body.discountPercent, tipAmount: req.body.tipAmount, items: req.body.items, restaurantId: req.terminal.restaurantId, locationId: req.terminal.locationId, serverName: req.staff?.name || "Staff Member", createdByStaffId: req.staff?.id });
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "order.updated", entityType: "order", entityId: String(order.id), metadata: { version: order.version } });
    res.json(order);
  } catch (error) {
    const message = error?.cause?.message || error?.message || "Order update failed";
    if (message.includes("ORDER_CONFLICT")) {
      const latestOrder = await getOrderById(req.terminal.restaurantId, req.terminal.locationId, Number(req.params.id));
      return res.status(409).json({
        error: "This order was updated on another terminal. Your draft has been preserved.",
        code: "ORDER_CONFLICT",
        expectedVersion: Number(req.body.expectedVersion),
        actualVersion: latestOrder?.version ?? null,
        latestOrder
      });
    }
    res.status(400).json({ error: message });
  }
});
app.patch("/api/orders/:id/status", requirePermission("orders.write"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (status === "cancelled" && !["restaurant_owner", "restaurant_admin", "general_manager", "shift_manager"].includes(String(req.staff?.role))) {
      return res.status(403).json({ error: "Manager approval required to cancel an order" });
    }
    const order = await updateOrderStatus(req.terminal.restaurantId, req.terminal.locationId, id, status);
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: `order.${status}`, entityType: "order", entityId: String(id) });
    res.json(order);
  } catch (error) {
    console.error("Failed to update order status:", error);
    const message = error?.cause?.message || error?.message || "Failed to update order status";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/orders/items/:id/status", requirePermission("kitchen.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!["preparing", "ready", "served", "void"].includes(String(status))) return res.status(400).json({ error: "Invalid item status" });
    const item = await updateOrderItemStatus(req.terminal.restaurantId, req.terminal.locationId, id, status);
    res.json(item);
  } catch (error) {
    console.error("Failed to update item status:", error);
    const message = error?.cause?.message || error?.message || "Failed to update item status";
    res.status(500).json({ error: message });
  }
});
app.post("/api/orders/:id/pay", requirePermission("payments.process"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, tip, method, transactionRef, idempotencyKey, tenderedAmount } = req.body;
    const order = await processPayment(req.terminal.restaurantId, req.terminal.locationId, id, {
      amount,
      tip,
      method,
      processedBy: req.staff?.name || "Cashier",
      processedByStaffId: req.staff?.id,
      transactionRef,
      idempotencyKey: String(idempotencyKey || ""),
      tenderedAmount
    });
    await writeAudit({ terminal: req.terminal, actorStaffId: req.staff.id, action: "payment.recorded", entityType: "order", entityId: String(id), metadata: { amount, method, idempotencyKey } });
    res.json(order);
  } catch (error) {
    console.error("Failed to process payment:", error);
    const message = error?.cause?.message || error?.message || "Failed to process payment";
    res.status(500).json({ error: message });
  }
});
app.get("/api/analytics", async (req, res) => {
  try {
    const startAt = req.query.start ? new Date(String(req.query.start)) : void 0;
    if (startAt && Number.isNaN(startAt.getTime())) return res.status(400).json({ error: "Invalid report start date" });
    const analytics = await getAnalyticsSummary(req.terminal.restaurantId, req.terminal.locationId, startAt);
    res.json(analytics);
  } catch (error) {
    console.error("Failed to get analytics:", error);
    const message = error?.cause?.message || error?.message || "Failed to get analytics";
    res.status(500).json({ error: message });
  }
});
var app_default = app;
export {
  clerkPublishableKey,
  clerkSecretKey,
  app_default as default
};
