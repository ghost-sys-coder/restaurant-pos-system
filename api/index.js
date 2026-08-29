var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/app.ts
import "dotenv/config";
import express from "express";

// src/db/queries.ts
import { desc, eq, and } from "drizzle-orm";

// src/db/index.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

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
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  locationId: integer("location_id").references(() => locations.id),
  clerkUserId: text("uid").unique(),
  email: text("email"),
  name: text("name"),
  role: text("role").default("cashier"),
  // 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
  pinHash: text("pin_hash"),
  pinVersion: integer("pin_version").default(1).notNull(),
  isActive: boolean("is_active").default(true).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull()
}, (table) => [
  index("users_restaurant_location_idx").on(table.restaurantId, table.locationId)
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
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  name: text("name").notNull(),
  icon: text("icon").default("Utensils"),
  color: text("color").default("amber"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  categoryId: integer("category_id").references(() => categories.id),
  name: text("name").notNull(),
  description: text("description"),
  price: integer("price").notNull(),
  // in cents (e.g. 1499 = $14.99)
  imageUrl: text("image_url"),
  isAvailable: boolean("is_available").default(true),
  calories: integer("calories"),
  prepTimeMinutes: integer("prep_time_minutes").default(10),
  allergens: text("allergens"),
  optionsJson: text("options_json"),
  // Customization options
  createdAt: timestamp("created_at").defaultNow()
});
var restaurantTables = pgTable("restaurant_tables", {
  id: serial("id").primaryKey(),
  locationId: integer("location_id").references(() => locations.id),
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
  restaurantId: integer("restaurant_id").references(() => restaurants.id),
  locationId: integer("location_id").references(() => locations.id),
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
      return await db.select().from(menuItems).where(and(eq(menuItems.restaurantId, restaurantId), eq(menuItems.categoryId, categoryId))).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).where(eq(menuItems.restaurantId, restaurantId)).orderBy(menuItems.name);
  } catch (error) {
    console.error("Failed to get menu items:", error);
    throw new Error("Database query failed: menuItems", { cause: error });
  }
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
    await db.delete(menuItems).where(and(eq(menuItems.id, id), eq(menuItems.restaurantId, restaurantId)));
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
    const res = await db.update(restaurantTables).set({
      status,
      ...currentOrderId !== void 0 ? { currentOrderId } : {}
    }).where(and(eq(restaurantTables.id, id), eq(restaurantTables.locationId, locationId))).returning();
    return res[0];
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
async function getOrders(restaurantId, statusFilter) {
  try {
    const allOrders = await db.query.orders.findMany({
      where: eq(orders.restaurantId, restaurantId),
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
async function getOrderById(restaurantId, id) {
  try {
    return await db.query.orders.findFirst({
      where: and(eq(orders.id, id), eq(orders.restaurantId, restaurantId)),
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
    if (data.tableId) {
      const table = await db.select({ id: restaurantTables.id }).from(restaurantTables).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId))).limit(1);
      if (!table[0]) throw new Error("Table not found in this location");
    }
    const createdOrderArr = await db.insert(orders).values({
      orderNumber: data.orderNumber,
      restaurantId: data.restaurantId,
      locationId: data.locationId,
      orderType: data.orderType,
      tableId: data.tableId || null,
      serverName: data.serverName || "Staff Member",
      createdByStaffId: data.createdByStaffId,
      customerName: data.customerName || null,
      customerPhone: data.customerPhone || null,
      status: "active",
      subtotal: data.subtotal,
      tax: data.tax,
      discount: data.discount,
      tip: data.tip,
      total: data.total,
      paymentStatus: "unpaid",
      notes: data.notes || null,
      guestCount: data.guestCount || 1
    }).returning();
    const createdOrder = createdOrderArr[0];
    if (data.items && data.items.length > 0) {
      await db.insert(orderItems).values(
        data.items.map((item) => ({
          orderId: createdOrder.id,
          menuItemId: item.menuItemId || null,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          selectedOptions: item.selectedOptions || null,
          notes: item.notes || null,
          itemStatus: "sent"
        }))
      );
    }
    if (data.tableId) {
      await db.update(restaurantTables).set({
        status: "occupied",
        currentOrderId: createdOrder.id
      }).where(and(eq(restaurantTables.id, data.tableId), eq(restaurantTables.locationId, data.locationId)));
    }
    return await getOrderById(data.restaurantId, createdOrder.id);
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error("Database query failed: createOrder", { cause: error });
  }
}
async function updateOrderStatus(restaurantId, orderId, status) {
  try {
    const updateData = { status };
    if (status === "completed" || status === "cancelled") {
      updateData.completedAt = /* @__PURE__ */ new Date();
    }
    const res = await db.update(orders).set(updateData).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId))).returning();
    const updated = res[0];
    if (updated && updated.tableId && (status === "completed" || status === "cancelled")) {
      await db.update(restaurantTables).set({
        status: "available",
        currentOrderId: null
      }).where(eq(restaurantTables.id, updated.tableId));
    }
    return await getOrderById(restaurantId, orderId);
  } catch (error) {
    console.error("Failed to update order status:", error);
    throw new Error("Database query failed: updateOrderStatus", { cause: error });
  }
}
async function updateOrderItemStatus(restaurantId, itemId, itemStatus) {
  try {
    const owned = await db.select({ id: orderItems.id }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(and(eq(orderItems.id, itemId), eq(orders.restaurantId, restaurantId))).limit(1);
    if (!owned[0]) return void 0;
    const res = await db.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update order item status:", error);
    throw new Error("Database query failed: updateOrderItemStatus", { cause: error });
  }
}
async function processPayment(restaurantId, orderId, data) {
  try {
    const ownedOrder = await getOrderById(restaurantId, orderId);
    if (!ownedOrder) throw new Error("Order not found");
    await db.insert(payments).values({
      orderId,
      amount: data.amount,
      tip: data.tip || 0,
      method: data.method,
      processedBy: data.processedBy || "Cashier",
      processedByStaffId: data.processedByStaffId,
      transactionRef: data.transactionRef || `TXN-${Date.now()}`,
      status: "success"
    });
    const updatedOrder = await db.update(orders).set({
      paymentStatus: "paid",
      paymentMethod: data.method,
      status: "completed",
      tip: data.tip || 0,
      completedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(orders.id, orderId), eq(orders.restaurantId, restaurantId))).returning();
    const order = updatedOrder[0];
    if (order && order.tableId) {
      await db.update(restaurantTables).set({
        status: "cleaning",
        currentOrderId: null
      }).where(eq(restaurantTables.id, order.tableId));
    }
    return await getOrderById(restaurantId, orderId);
  } catch (error) {
    console.error("Failed to process payment:", error);
    throw new Error("Database query failed: processPayment", { cause: error });
  }
}
async function getAnalyticsSummary(restaurantId) {
  try {
    const allOrders = await db.select().from(orders).where(eq(orders.restaurantId, restaurantId));
    const allItems = await db.select({ name: orderItems.name, quantity: orderItems.quantity, price: orderItems.price }).from(orderItems).innerJoin(orders, eq(orders.id, orderItems.orderId)).where(eq(orders.restaurantId, restaurantId));
    const allPayments = await db.select({ method: payments.method, amount: payments.amount }).from(payments).innerJoin(orders, eq(orders.id, payments.orderId)).where(eq(orders.restaurantId, restaurantId));
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
async function getUserByClerkId(clerkUserId) {
  const result = await db.select().from(users).where(eq2(users.clerkUserId, clerkUserId)).limit(1);
  return result[0] ?? null;
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
  const updated = (await db.update(users).set({ isActive, updatedAt: /* @__PURE__ */ new Date() }).where(eq2(users.id, id)).returning())[0] ?? null;
  if (updated && !isActive) {
    await db.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq2(staffSessions.staffId, id));
  }
  return updated;
}
async function permanentlyDeleteUser(id) {
  await db.delete(staffSessions).where(eq2(staffSessions.staffId, id));
  return (await db.delete(users).where(eq2(users.id, id)).returning())[0] ?? null;
}

// src/middleware/auth.ts
import { clerkClient, getAuth } from "@clerk/express";

// src/db/access.ts
import { and as and3, eq as eq3, gt, isNotNull, isNull, ne, sql as sql3 } from "drizzle-orm";

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
async function enrollTerminal(staffId, name, type = "register") {
  const staff = await ensureAccountForStaff(staffId);
  if (!staff.restaurantId || !staff.locationId) throw new Error("Restaurant account is incomplete");
  const rawToken = newOpaqueToken();
  const terminal = (await db.insert(terminals).values({
    restaurantId: staff.restaurantId,
    locationId: staff.locationId,
    name,
    type,
    credentialHash: hashToken(rawToken),
    enrolledByStaffId: staff.id
  }).returning())[0];
  await writeAudit({ terminal, actorStaffId: staff.id, action: "terminal.enrolled", entityType: "terminal", entityId: String(terminal.id) });
  return { terminal, rawToken };
}
async function findTerminalByToken(rawToken) {
  if (!rawToken) return null;
  const result = await db.select({ terminal: terminals }).from(terminals).innerJoin(restaurants, eq3(restaurants.id, terminals.restaurantId)).where(and3(
    eq3(terminals.credentialHash, hashToken(rawToken)),
    eq3(terminals.isActive, true),
    isNull(terminals.revokedAt),
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
  if (terminal.lockedUntil && terminal.lockedUntil > /* @__PURE__ */ new Date()) return { ok: false, reason: "locked" };
  const staff = (await db.select().from(users).where(and3(
    eq3(users.id, staffId),
    eq3(users.restaurantId, terminal.restaurantId),
    eq3(users.locationId, terminal.locationId),
    eq3(users.isActive, true)
  )).limit(1))[0];
  const valid = Boolean(staff?.pinHash) && await verifyPin(pin, staff.pinHash);
  if (!valid) {
    const attempts = terminal.failedPinAttempts + 1;
    await db.update(terminals).set({
      failedPinAttempts: attempts >= 5 ? 0 : attempts,
      lockedUntil: attempts >= 5 ? new Date(Date.now() + 6e4) : null
    }).where(eq3(terminals.id, terminal.id));
    return { ok: false, reason: attempts >= 5 ? "locked" : "invalid" };
  }
  await db.update(terminals).set({ failedPinAttempts: 0, lockedUntil: null, lastSeenAt: /* @__PURE__ */ new Date() }).where(eq3(terminals.id, terminal.id));
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
    isNull(staffSessions.revokedAt),
    gt(staffSessions.expiresAt, /* @__PURE__ */ new Date()),
    eq3(users.isActive, true)
  )).limit(1);
  if (!rows[0]) return null;
  const expiresAt = new Date(Date.now() + 15 * 6e4);
  await db.update(staffSessions).set({ lastActivityAt: /* @__PURE__ */ new Date(), expiresAt }).where(eq3(staffSessions.id, rows[0].session.id));
  return { ...rows[0], expiresAt };
}
async function revokeStaffSession(rawToken) {
  if (!rawToken) return;
  await db.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(eq3(staffSessions.tokenHash, hashToken(rawToken)));
}
async function revokeTerminal(terminalId) {
  await db.update(staffSessions).set({ revokedAt: /* @__PURE__ */ new Date() }).where(and3(eq3(staffSessions.terminalId, terminalId), isNull(staffSessions.revokedAt)));
  return (await db.update(terminals).set({ isActive: false, revokedAt: /* @__PURE__ */ new Date() }).where(eq3(terminals.id, terminalId)).returning())[0] ?? null;
}
async function setStaffPin(staffId, pin) {
  const target = (await db.select().from(users).where(eq3(users.id, staffId)).limit(1))[0];
  if (!target) return null;
  await assertUniqueLocationPin(target.locationId, pin, staffId);
  const pinHash = await hashPin(pin);
  const updated = await db.update(users).set({
    pinHash,
    pinVersion: sql3`${users.pinVersion} + 1`,
    updatedAt: /* @__PURE__ */ new Date()
  }).where(eq3(users.id, staffId)).returning();
  return updated[0] ?? null;
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

// src/middleware/auth.ts
var rolePermissions = {
  restaurant_owner: ["orders.read", "orders.write", "orders.cancel", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  restaurant_admin: ["orders.read", "orders.write", "orders.cancel", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  general_manager: ["orders.read", "orders.write", "orders.cancel", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "menu.manage", "reports.view", "staff.manage", "terminals.manage"],
  accountant: ["orders.read", "reports.view"],
  shift_manager: ["orders.read", "orders.write", "orders.cancel", "payments.process", "payments.refund", "tables.manage", "kitchen.manage", "reports.view"],
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
      const user = await getUserByClerkId(auth.userId);
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
import { eq as eq4 } from "drizzle-orm";
async function createRestaurantRecord(input) {
  const restaurant = (await db.insert(restaurants).values({ ...input, status: "active" }).returning())[0];
  const location = (await db.insert(locations).values({ restaurantId: restaurant.id, name: "Main Location" }).returning())[0];
  return { restaurant, location };
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
async function attachBackOfficeUser(input) {
  const account = await getRestaurantWithDefaultLocation(input.orgId);
  if (!account?.location || account.restaurant.status !== "active") throw new Error("Restaurant organization is not active");
  const existing = (await db.select().from(users).where(eq4(users.clerkUserId, input.clerkUserId)).limit(1))[0];
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

// src/server/app.ts
var clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
var clerkSecretKey = process.env.CLERK_SECRET_KEY;
var app = express();
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
    await setStaffPin(clerkStaff.id, pin);
    const { terminal, rawToken } = await enrollTerminal(clerkStaff.id, name, String(req.body.type || "register"));
    res.setHeader("Set-Cookie", sessionCookie(TERMINAL_COOKIE, rawToken, 60 * 60 * 24 * 90));
    res.status(201).json({ terminal: publicTerminal(terminal) });
  } catch (error) {
    res.status(400).json({ error: error?.message || "Unable to enroll terminal" });
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
app.get("/api/access/session", requireTerminal, requireStaffSession, (req, res) => {
  res.json({ staff: publicStaff(req.staff), permissions: permissionsForRole(req.staff.role) });
});
app.use("/api", requireTerminal, requireStaffSession);
app.use("/api/staff", requirePermission("staff.manage"));
app.use("/api/analytics", requirePermission("reports.view"));
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
    const referenced = detail.toLowerCase().includes("foreign key");
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
    const { name, icon, color } = req.body;
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
app.post("/api/menu-items", requirePermission("menu.manage"), async (req, res) => {
  try {
    const item = await createMenuItem({ ...req.body, restaurantId: req.terminal.restaurantId });
    res.json(item);
  } catch (error) {
    console.error("Failed to create menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to create menu item";
    res.status(500).json({ error: message });
  }
});
app.put("/api/menu-items/:id", requirePermission("menu.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await updateMenuItem(req.terminal.restaurantId, id, req.body);
    res.json(item);
  } catch (error) {
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
app.patch("/api/tables/:id", requirePermission("tables.manage"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, currentOrderId } = req.body;
    const table = await updateTableStatus(req.terminal.locationId, id, status, currentOrderId);
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
    const ordersList = await getOrders(req.terminal.restaurantId, statusFilter);
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
    const order = await getOrderById(req.terminal.restaurantId, id);
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
    const order = await createOrder({ ...req.body, restaurantId: req.terminal.restaurantId, locationId: req.terminal.locationId, serverName: req.staff?.name || "Staff Member", createdByStaffId: req.staff?.id });
    res.json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    const message = error?.cause?.message || error?.message || "Failed to create order";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/orders/:id/status", requirePermission("orders.write"), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (status === "cancelled" && !["restaurant_owner", "restaurant_admin", "general_manager", "shift_manager"].includes(String(req.staff?.role))) {
      return res.status(403).json({ error: "Manager approval required to cancel an order" });
    }
    const order = await updateOrderStatus(req.terminal.restaurantId, id, status);
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
    const item = await updateOrderItemStatus(req.terminal.restaurantId, id, status);
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
    const { amount, tip, method, transactionRef } = req.body;
    const order = await processPayment(req.terminal.restaurantId, id, {
      amount,
      tip,
      method,
      processedBy: req.staff?.name || "Cashier",
      processedByStaffId: req.staff?.id,
      transactionRef
    });
    res.json(order);
  } catch (error) {
    console.error("Failed to process payment:", error);
    const message = error?.cause?.message || error?.message || "Failed to process payment";
    res.status(500).json({ error: message });
  }
});
app.get("/api/analytics", async (req, res) => {
  try {
    const analytics = await getAnalyticsSummary(req.terminal.restaurantId);
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
