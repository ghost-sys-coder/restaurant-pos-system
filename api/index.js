var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// src/server/app.ts
import "dotenv/config";
import express from "express";

// src/db/queries.ts
import { desc, eq } from "drizzle-orm";

// src/db/index.ts
import "dotenv/config";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// src/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  categories: () => categories,
  categoriesRelations: () => categoriesRelations,
  menuItems: () => menuItems,
  menuItemsRelations: () => menuItemsRelations,
  orderItems: () => orderItems,
  orderItemsRelations: () => orderItemsRelations,
  orders: () => orders,
  ordersRelations: () => ordersRelations,
  payments: () => payments,
  paymentsRelations: () => paymentsRelations,
  restaurantTables: () => restaurantTables,
  users: () => users
});
import { relations } from "drizzle-orm";
import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";
var users = pgTable("users", {
  id: serial("id").primaryKey(),
  clerkUserId: text("uid").notNull().unique(),
  email: text("email").notNull(),
  name: text("name"),
  role: text("role").default("cashier"),
  // 'admin' | 'manager' | 'cashier' | 'waiter' | 'kitchen'
  createdAt: timestamp("created_at").defaultNow()
});
var categories = pgTable("categories", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  icon: text("icon").default("Utensils"),
  color: text("color").default("amber"),
  sortOrder: integer("sort_order").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var menuItems = pgTable("menu_items", {
  id: serial("id").primaryKey(),
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
  tableNumber: text("table_number").notNull().unique(),
  capacity: integer("capacity").default(4),
  section: text("section").default("Main Dining"),
  // Main Dining, Patio, Bar, VIP
  status: text("status").default("available"),
  // available, occupied, reserved, cleaning, billing
  currentOrderId: integer("current_order_id"),
  posX: integer("pos_x").default(0),
  posY: integer("pos_y").default(0),
  createdAt: timestamp("created_at").defaultNow()
});
var orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  orderNumber: text("order_number").notNull(),
  orderType: text("order_type").default("dine-in"),
  // dine-in, takeout, delivery, bar
  tableId: integer("table_id").references(() => restaurantTables.id),
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
async function getCategories() {
  try {
    return await db.select().from(categories).orderBy(categories.sortOrder, categories.name);
  } catch (error) {
    console.error("Failed to get categories:", error);
    throw new Error("Database query failed: categories", { cause: error });
  }
}
async function createCategory(name, icon = "Utensils", color = "amber") {
  try {
    const res = await db.insert(categories).values({ name, icon, color }).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to create category:", error);
    throw new Error("Database query failed: createCategory", { cause: error });
  }
}
async function getMenuItems(categoryId) {
  try {
    if (categoryId) {
      return await db.select().from(menuItems).where(eq(menuItems.categoryId, categoryId)).orderBy(menuItems.name);
    }
    return await db.select().from(menuItems).orderBy(menuItems.name);
  } catch (error) {
    console.error("Failed to get menu items:", error);
    throw new Error("Database query failed: menuItems", { cause: error });
  }
}
async function createMenuItem(data) {
  try {
    const res = await db.insert(menuItems).values(data).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to create menu item:", error);
    throw new Error("Database query failed: createMenuItem", { cause: error });
  }
}
async function updateMenuItem(id, data) {
  try {
    const res = await db.update(menuItems).set(data).where(eq(menuItems.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update menu item:", error);
    throw new Error("Database query failed: updateMenuItem", { cause: error });
  }
}
async function deleteMenuItem(id) {
  try {
    await db.delete(menuItems).where(eq(menuItems.id, id));
    return { success: true };
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    throw new Error("Database query failed: deleteMenuItem", { cause: error });
  }
}
async function getTables() {
  try {
    return await db.select().from(restaurantTables).orderBy(restaurantTables.tableNumber);
  } catch (error) {
    console.error("Failed to get tables:", error);
    throw new Error("Database query failed: tables", { cause: error });
  }
}
async function updateTableStatus(id, status, currentOrderId) {
  try {
    const res = await db.update(restaurantTables).set({
      status,
      ...currentOrderId !== void 0 ? { currentOrderId } : {}
    }).where(eq(restaurantTables.id, id)).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update table status:", error);
    throw new Error("Database query failed: updateTableStatus", { cause: error });
  }
}
async function createTable(tableNumber, capacity, section, posX = 0, posY = 0) {
  try {
    const res = await db.insert(restaurantTables).values({
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
async function getOrders(statusFilter) {
  try {
    const allOrders = await db.query.orders.findMany({
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
async function getOrderById(id) {
  try {
    return await db.query.orders.findFirst({
      where: eq(orders.id, id),
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
    const createdOrderArr = await db.insert(orders).values({
      orderNumber: data.orderNumber,
      orderType: data.orderType,
      tableId: data.tableId || null,
      serverName: data.serverName || "Staff Member",
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
      }).where(eq(restaurantTables.id, data.tableId));
    }
    return await getOrderById(createdOrder.id);
  } catch (error) {
    console.error("Failed to create order:", error);
    throw new Error("Database query failed: createOrder", { cause: error });
  }
}
async function updateOrderStatus(orderId, status) {
  try {
    const updateData = { status };
    if (status === "completed" || status === "cancelled") {
      updateData.completedAt = /* @__PURE__ */ new Date();
    }
    const res = await db.update(orders).set(updateData).where(eq(orders.id, orderId)).returning();
    const updated = res[0];
    if (updated && updated.tableId && (status === "completed" || status === "cancelled")) {
      await db.update(restaurantTables).set({
        status: "available",
        currentOrderId: null
      }).where(eq(restaurantTables.id, updated.tableId));
    }
    return await getOrderById(orderId);
  } catch (error) {
    console.error("Failed to update order status:", error);
    throw new Error("Database query failed: updateOrderStatus", { cause: error });
  }
}
async function updateOrderItemStatus(itemId, itemStatus) {
  try {
    const res = await db.update(orderItems).set({ itemStatus }).where(eq(orderItems.id, itemId)).returning();
    return res[0];
  } catch (error) {
    console.error("Failed to update order item status:", error);
    throw new Error("Database query failed: updateOrderItemStatus", { cause: error });
  }
}
async function processPayment(orderId, data) {
  try {
    await db.insert(payments).values({
      orderId,
      amount: data.amount,
      tip: data.tip || 0,
      method: data.method,
      processedBy: data.processedBy || "Cashier",
      transactionRef: data.transactionRef || `TXN-${Date.now()}`,
      status: "success"
    });
    const updatedOrder = await db.update(orders).set({
      paymentStatus: "paid",
      paymentMethod: data.method,
      status: "completed",
      tip: data.tip || 0,
      completedAt: /* @__PURE__ */ new Date()
    }).where(eq(orders.id, orderId)).returning();
    const order = updatedOrder[0];
    if (order && order.tableId) {
      await db.update(restaurantTables).set({
        status: "cleaning",
        currentOrderId: null
      }).where(eq(restaurantTables.id, order.tableId));
    }
    return await getOrderById(orderId);
  } catch (error) {
    console.error("Failed to process payment:", error);
    throw new Error("Database query failed: processPayment", { cause: error });
  }
}
async function getAnalyticsSummary() {
  try {
    const allOrders = await db.select().from(orders);
    const allItems = await db.select().from(orderItems);
    const allPayments = await db.select().from(payments);
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
    return {
      totalOrders: allOrders.length,
      paidOrdersCount: paidOrders.length,
      activeOrdersCount: allOrders.filter((o) => o.status === "active" || o.status === "preparing").length,
      totalRevenueCents,
      totalTipsCents,
      averageOrderValueCents,
      topSellingItems,
      paymentBreakdown
    };
  } catch (error) {
    console.error("Failed to get analytics summary:", error);
    throw new Error("Database query failed: analyticsSummary", { cause: error });
  }
}

// src/db/users.ts
import { eq as eq2 } from "drizzle-orm";
async function getOrCreateUser(clerkUserId, email, name, defaultRole = "cashier") {
  try {
    const existing = await getUserByClerkId(clerkUserId);
    if (existing) {
      const updated = await db.update(users).set({
        email,
        ...name ? { name } : {}
      }).where(eq2(users.clerkUserId, clerkUserId)).returning();
      return updated[0];
    }
    const result = await db.insert(users).values({
      clerkUserId,
      email,
      name: name || email.split("@")[0],
      role: defaultRole
    }).returning();
    return result[0];
  } catch (error) {
    console.error("Database query failed in getOrCreateUser:", error);
    throw new Error("Failed to retrieve or create user profile", { cause: error });
  }
}
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
async function getAllUsers() {
  try {
    return await db.select({
      id: users.id,
      clerkUserId: users.clerkUserId,
      email: users.email,
      name: users.name,
      role: users.role,
      createdAt: users.createdAt
    }).from(users);
  } catch (error) {
    console.error("Database query failed in getAllUsers:", error);
    throw new Error("Failed to fetch staff users", { cause: error });
  }
}

// src/middleware/auth.ts
import { getAuth } from "@clerk/express";
var requireAuth = async (req, res, next) => {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      req.authUserId = auth.userId;
      const user = await getUserByClerkId(auth.userId);
      if (user) {
        req.userRole = user.role;
      }
    }
  } catch (err) {
  }
  next();
};
var requireRole = (allowedRoles) => async (req, res, next) => {
  let userId = req.authUserId;
  if (!userId) {
    try {
      const auth = getAuth(req);
      userId = auth?.userId;
      req.authUserId = userId;
    } catch (e) {
    }
  }
  if (!userId) {
    if (process.env.NODE_ENV !== "production") {
      return next();
    }
    return res.status(401).json({ error: "Unauthorized" });
  }
  const user = await getUserByClerkId(userId);
  if (!user || !allowedRoles.includes(user.role)) {
    if (process.env.NODE_ENV !== "production") {
      return next();
    }
    return res.status(403).json({ error: "Forbidden" });
  }
  req.userRole = user.role;
  next();
};

// src/server/app.ts
import { clerkMiddleware, clerkClient, getAuth as getAuth2 } from "@clerk/express";
var clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
var clerkSecretKey = process.env.CLERK_SECRET_KEY;
var app = express();
app.use(express.json());
if (clerkPublishableKey && clerkSecretKey) {
  app.use(clerkMiddleware({ publishableKey: clerkPublishableKey, secretKey: clerkSecretKey }));
}
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", time: (/* @__PURE__ */ new Date()).toISOString() });
});
app.use("/api", requireAuth);
app.use("/api/staff", requireRole(["admin", "manager"]));
app.use("/api/analytics", requireRole(["admin", "manager"]));
app.post("/api/auth/sync", async (req, res) => {
  try {
    const { userId } = getAuth2(req);
    console.log("[sync] userId from getAuth:", userId);
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    console.log("[sync] fetching Clerk user for:", userId);
    const clerkUser = await clerkClient.users.getUser(userId);
    console.log("[sync] Clerk user fetched:", clerkUser.id);
    const email = clerkUser.primaryEmailAddress?.emailAddress || `${userId}@clerk.local`;
    const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(" ") || clerkUser.username || email;
    const allowedRoles = ["admin", "manager", "cashier", "waiter", "kitchen"];
    const rawRole = clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || clerkUser.privateMetadata?.role || "cashier";
    const normalizedRole = typeof rawRole === "string" ? rawRole.toLowerCase().trim() : "cashier";
    const defaultRole = allowedRoles.includes(normalizedRole) ? normalizedRole : "cashier";
    const user = await getOrCreateUser(userId, email, name, defaultRole);
    const dbRole = user.role;
    const clerkRole = clerkUser.publicMetadata?.role;
    if (dbRole && dbRole !== clerkRole) {
      console.log(`[sync] Updating Clerk user ${userId} metadata role from '${clerkRole}' to DB role '${dbRole}'`);
      try {
        await clerkClient.users.updateUserMetadata(userId, {
          publicMetadata: {
            ...typeof clerkUser.publicMetadata === "object" && clerkUser.publicMetadata !== null ? clerkUser.publicMetadata : {},
            role: dbRole
          }
        });
      } catch (clerkErr) {
        console.warn("[sync] Could not update Clerk user metadata:", clerkErr);
      }
    }
    console.log("[sync] success:", user);
    res.json(user);
  } catch (error) {
    console.error("[sync] FAILED:", error);
    const message = error?.cause?.message || error?.message || "Auth sync failed";
    res.status(500).json({ error: message });
  }
});
app.get("/api/staff", async (req, res) => {
  try {
    const users2 = await getAllUsers();
    res.json(users2);
  } catch (error) {
    console.error("Failed to get staff:", error);
    const message = error?.cause?.message || error?.message || "Failed to get staff";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/staff/:id/role", requireRole(["admin"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    const allowedRoles = ["admin", "manager", "cashier", "waiter", "kitchen"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({ error: "Invalid role" });
    }
    const updatedUser = await updateUserRole(id, role);
    if (!updatedUser) {
      return res.status(404).json({ error: "User not found" });
    }
    if (updatedUser.clerkUserId) {
      try {
        const clerkUser = await clerkClient.users.getUser(updatedUser.clerkUserId);
        await clerkClient.users.updateUserMetadata(updatedUser.clerkUserId, {
          publicMetadata: {
            ...typeof clerkUser.publicMetadata === "object" && clerkUser.publicMetadata !== null ? clerkUser.publicMetadata : {},
            role: updatedUser.role
          }
        });
      } catch (clerkErr) {
        console.warn("Could not update Clerk metadata on role change:", clerkErr);
      }
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
    const categories2 = await getCategories();
    res.json(categories2);
  } catch (error) {
    console.error("Failed to fetch categories:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch categories";
    res.status(500).json({ error: message });
  }
});
app.post("/api/categories", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const category = await createCategory(name, icon, color);
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
    const items = await getMenuItems(categoryId);
    res.json(items);
  } catch (error) {
    console.error("Failed to fetch menu items:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch menu items";
    res.status(500).json({ error: message });
  }
});
app.post("/api/menu-items", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const item = await createMenuItem(req.body);
    res.json(item);
  } catch (error) {
    console.error("Failed to create menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to create menu item";
    res.status(500).json({ error: message });
  }
});
app.put("/api/menu-items/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await updateMenuItem(id, req.body);
    res.json(item);
  } catch (error) {
    console.error("Failed to update menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to update menu item";
    res.status(500).json({ error: message });
  }
});
app.delete("/api/menu-items/:id", requireRole(["admin", "manager"]), async (req, res) => {
  try {
    const id = Number(req.params.id);
    await deleteMenuItem(id);
    res.json({ success: true });
  } catch (error) {
    console.error("Failed to delete menu item:", error);
    const message = error?.cause?.message || error?.message || "Failed to delete menu item";
    res.status(500).json({ error: message });
  }
});
app.get("/api/tables", async (req, res) => {
  try {
    const tables = await getTables();
    res.json(tables);
  } catch (error) {
    console.error("Failed to fetch tables:", error);
    const message = error?.cause?.message || error?.message || "Failed to fetch tables";
    res.status(500).json({ error: message });
  }
});
app.post("/api/tables", async (req, res) => {
  try {
    const { tableNumber, capacity, section, posX, posY } = req.body;
    const table = await createTable(tableNumber, Number(capacity), section, posX, posY);
    res.json(table);
  } catch (error) {
    console.error("Failed to create table:", error);
    const message = error?.cause?.message || error?.message || "Failed to create table";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/tables/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status, currentOrderId } = req.body;
    const table = await updateTableStatus(id, status, currentOrderId);
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
    const ordersList = await getOrders(statusFilter);
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
    const order = await getOrderById(id);
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
app.post("/api/orders", async (req, res) => {
  try {
    const order = await createOrder(req.body);
    res.json(order);
  } catch (error) {
    console.error("Failed to create order:", error);
    const message = error?.cause?.message || error?.message || "Failed to create order";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const order = await updateOrderStatus(id, status);
    res.json(order);
  } catch (error) {
    console.error("Failed to update order status:", error);
    const message = error?.cause?.message || error?.message || "Failed to update order status";
    res.status(500).json({ error: message });
  }
});
app.patch("/api/orders/items/:id/status", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    const item = await updateOrderItemStatus(id, status);
    res.json(item);
  } catch (error) {
    console.error("Failed to update item status:", error);
    const message = error?.cause?.message || error?.message || "Failed to update item status";
    res.status(500).json({ error: message });
  }
});
app.post("/api/orders/:id/pay", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, tip, method, processedBy, transactionRef } = req.body;
    const order = await processPayment(id, {
      amount,
      tip,
      method,
      processedBy,
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
    const analytics = await getAnalyticsSummary();
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
