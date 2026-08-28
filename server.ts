import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import {
  getCategories,
  createCategory,
  getMenuItems,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getTables,
  createTable,
  updateTableStatus,
  getOrders,
  getOrderById,
  createOrder,
  updateOrderStatus,
  updateOrderItemStatus,
  processPayment,
  getAnalyticsSummary,
} from './src/db/queries.ts';
import { getOrCreateUser, getAllUsers } from './src/db/users.ts';
import { AuthRequest, requireAuth, requireRole } from './src/middleware/auth.ts';
import { clerkMiddleware, clerkClient, getAuth } from '@clerk/express';

const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
const clerkSecretKey = process.env.CLERK_SECRET_KEY;

if (!clerkPublishableKey) {
  throw new Error('Missing Clerk publishable key. Set VITE_CLERK_PUBLISHABLE_KEY in .env.');
}

if (!clerkSecretKey) {
  throw new Error('Missing CLERK_SECRET_KEY. This Express API verifies Clerk sessions and requires the secret key in .env.');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(clerkMiddleware({ publishableKey: clerkPublishableKey, secretKey: clerkSecretKey }));

  // API Routes
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  app.use('/api', requireAuth);
  app.use('/api/staff', requireRole(['admin', 'manager']));
  app.use('/api/analytics', requireRole(['admin', 'manager']));

  // Auth sync
  app.post('/api/auth/sync', async (req: AuthRequest, res) => {
    try {
      const { userId } = getAuth(req);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      const clerkUser = await clerkClient.users.getUser(userId);
      const email = clerkUser.primaryEmailAddress?.emailAddress || `${userId}@clerk.local`;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || email;
      const allowedRoles = ['admin', 'manager', 'cashier', 'waiter', 'kitchen'];
      const requestedRole = clerkUser.publicMetadata.role;
      const role = typeof requestedRole === 'string' && allowedRoles.includes(requestedRole) ? requestedRole : 'cashier';
      const user = await getOrCreateUser(userId, email, name, role);
      res.json(user);
    } catch (error: any) {
      console.error('Auth sync failed:', error);
      res.status(500).json({ error: error.message || 'Auth sync failed' });
    }
  });

  // Staff users
  app.get('/api/staff', async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Failed to get staff:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await getCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/categories', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, icon, color } = req.body;
      const category = await createCategory(name, icon, color);
      res.json(category);
    } catch (error: any) {
      console.error('Failed to create category:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Menu items
  app.get('/api/menu-items', async (req, res) => {
    try {
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const items = await getMenuItems(categoryId);
      res.json(items);
    } catch (error: any) {
      console.error('Failed to fetch menu items:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/menu-items', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const item = await createMenuItem(req.body);
      res.json(item);
    } catch (error: any) {
      console.error('Failed to create menu item:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/menu-items/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const item = await updateMenuItem(id, req.body);
      res.json(item);
    } catch (error: any) {
      console.error('Failed to update menu item:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/menu-items/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await deleteMenuItem(id);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete menu item:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Tables
  app.get('/api/tables', async (req, res) => {
    try {
      const tables = await getTables();
      res.json(tables);
    } catch (error: any) {
      console.error('Failed to fetch tables:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/tables', async (req, res) => {
    try {
      const { tableNumber, capacity, section, posX, posY } = req.body;
      const table = await createTable(tableNumber, Number(capacity), section, posX, posY);
      res.json(table);
    } catch (error: any) {
      console.error('Failed to create table:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/tables/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status, currentOrderId } = req.body;
      const table = await updateTableStatus(id, status, currentOrderId);
      res.json(table);
    } catch (error: any) {
      console.error('Failed to update table:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Orders
  app.get('/api/orders', async (req, res) => {
    try {
      const statusFilter = req.query.status as string | undefined;
      const ordersList = await getOrders(statusFilter);
      res.json(ordersList);
    } catch (error: any) {
      console.error('Failed to fetch orders:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/orders/:id', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const order = await getOrderById(id);
      if (!order) {
        return res.status(404).json({ error: 'Order not found' });
      }
      res.json(order);
    } catch (error: any) {
      console.error('Failed to get order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = await createOrder(req.body);
      res.json(order);
    } catch (error: any) {
      console.error('Failed to create order:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/orders/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      const order = await updateOrderStatus(id, status);
      res.json(order);
    } catch (error: any) {
      console.error('Failed to update order status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.patch('/api/orders/items/:id/status', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { status } = req.body;
      const item = await updateOrderItemStatus(id, status);
      res.json(item);
    } catch (error: any) {
      console.error('Failed to update item status:', error);
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/orders/:id/pay', async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { amount, tip, method, processedBy, transactionRef } = req.body;
      const order = await processPayment(id, {
        amount,
        tip,
        method,
        processedBy,
        transactionRef,
      });
      res.json(order);
    } catch (error: any) {
      console.error('Failed to process payment:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Analytics
  app.get('/api/analytics', async (req, res) => {
    try {
      const analytics = await getAnalyticsSummary();
      res.json(analytics);
    } catch (error: any) {
      console.error('Failed to get analytics:', error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite integration
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
      define: {
        // The key is public by design. Map the server-compatible Clerk variable
        // into Vite's required VITE_ namespace for the browser bundle.
        'import.meta.env.VITE_CLERK_PUBLISHABLE_KEY': JSON.stringify(clerkPublishableKey),
      },
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Restaurant POS Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
