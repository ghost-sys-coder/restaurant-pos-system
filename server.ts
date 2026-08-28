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
import { getOrCreateUser, getAllUsers, updateUserRole } from './src/db/users.ts';
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
      console.log('[sync] userId from getAuth:', userId);
      if (!userId) return res.status(401).json({ error: 'Unauthorized' });
      console.log('[sync] fetching Clerk user for:', userId);
      const clerkUser = await clerkClient.users.getUser(userId);
      console.log('[sync] Clerk user fetched:', clerkUser.id);
      const email = clerkUser.primaryEmailAddress?.emailAddress || `${userId}@clerk.local`;
      const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || email;
      const allowedRoles = ['admin', 'manager', 'cashier', 'waiter', 'kitchen'];
      const rawRole = (clerkUser.publicMetadata?.role || clerkUser.unsafeMetadata?.role || clerkUser.privateMetadata?.role || 'cashier') as string;
      const normalizedRole = typeof rawRole === 'string' ? rawRole.toLowerCase().trim() : 'cashier';
      const defaultRole = allowedRoles.includes(normalizedRole) ? normalizedRole : 'cashier';

      // Preserves existing database role if already stored in PostgreSQL
      const user = await getOrCreateUser(userId, email, name, defaultRole);

      // Keep Clerk publicMetadata synchronized with the database role
      const dbRole = user.role;
      const clerkRole = clerkUser.publicMetadata?.role;
      if (dbRole && dbRole !== clerkRole) {
        console.log(`[sync] Updating Clerk user ${userId} metadata role from '${clerkRole}' to DB role '${dbRole}'`);
        try {
          await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
              ...(typeof clerkUser.publicMetadata === 'object' && clerkUser.publicMetadata !== null ? clerkUser.publicMetadata : {}),
              role: dbRole,
            },
          });
        } catch (clerkErr) {
          console.warn('[sync] Could not update Clerk user metadata:', clerkErr);
        }
      }

      console.log('[sync] success:', user);
      res.json(user);
    } catch (error: any) {
      console.error('[sync] FAILED:', error);
      const message = error?.cause?.message || error?.message || 'Auth sync failed';
      res.status(500).json({ error: message });
    }
  });


  // Staff users
  app.get('/api/staff', async (req, res) => {
    try {
      const users = await getAllUsers();
      res.json(users);
    } catch (error: any) {
      console.error('Failed to get staff:', error);
      const message = error?.cause?.message || error?.message || 'Failed to get staff';
      res.status(500).json({ error: message });
    }
  });

  // Update staff role
  app.patch('/api/staff/:id/role', requireRole(['admin']), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { role } = req.body;
      const allowedRoles = ['admin', 'manager', 'cashier', 'waiter', 'kitchen'];
      if (!allowedRoles.includes(role)) {
        return res.status(400).json({ error: 'Invalid role' });
      }

      const updatedUser = await updateUserRole(id, role);
      if (!updatedUser) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Sync role back to Clerk metadata
      if (updatedUser.clerkUserId) {
        try {
          const clerkUser = await clerkClient.users.getUser(updatedUser.clerkUserId);
          await clerkClient.users.updateUserMetadata(updatedUser.clerkUserId, {
            publicMetadata: {
              ...(typeof clerkUser.publicMetadata === 'object' && clerkUser.publicMetadata !== null ? clerkUser.publicMetadata : {}),
              role: updatedUser.role,
            },
          });
        } catch (clerkErr) {
          console.warn('Could not update Clerk metadata on role change:', clerkErr);
        }
      }

      res.json(updatedUser);
    } catch (error: any) {
      console.error('Failed to update staff role:', error);
      const message = error?.cause?.message || error?.message || 'Failed to update staff role';
      res.status(500).json({ error: message });
    }
  });

  // Categories
  app.get('/api/categories', async (req, res) => {
    try {
      const categories = await getCategories();
      res.json(categories);
    } catch (error: any) {
      console.error('Failed to fetch categories:', error);
      const message = error?.cause?.message || error?.message || 'Failed to fetch categories';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/categories', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const { name, icon, color } = req.body;
      const category = await createCategory(name, icon, color);
      res.json(category);
    } catch (error: any) {
      console.error('Failed to create category:', error);
      const message = error?.cause?.message || error?.message || 'Failed to create category';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to fetch menu items';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/menu-items', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const item = await createMenuItem(req.body);
      res.json(item);
    } catch (error: any) {
      console.error('Failed to create menu item:', error);
      const message = error?.cause?.message || error?.message || 'Failed to create menu item';
      res.status(500).json({ error: message });
    }
  });

  app.put('/api/menu-items/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const item = await updateMenuItem(id, req.body);
      res.json(item);
    } catch (error: any) {
      console.error('Failed to update menu item:', error);
      const message = error?.cause?.message || error?.message || 'Failed to update menu item';
      res.status(500).json({ error: message });
    }
  });

  app.delete('/api/menu-items/:id', requireRole(['admin', 'manager']), async (req, res) => {
    try {
      const id = Number(req.params.id);
      const result = await deleteMenuItem(id);
      res.json(result);
    } catch (error: any) {
      console.error('Failed to delete menu item:', error);
      const message = error?.cause?.message || error?.message || 'Failed to delete menu item';
      res.status(500).json({ error: message });
    }
  });

  // Tables
  app.get('/api/tables', async (req, res) => {
    try {
      const tables = await getTables();
      res.json(tables);
    } catch (error: any) {
      console.error('Failed to fetch tables:', error);
      const message = error?.cause?.message || error?.message || 'Failed to fetch tables';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/tables', async (req, res) => {
    try {
      const { tableNumber, capacity, section, posX, posY } = req.body;
      const table = await createTable(tableNumber, Number(capacity), section, posX, posY);
      res.json(table);
    } catch (error: any) {
      console.error('Failed to create table:', error);
      const message = error?.cause?.message || error?.message || 'Failed to create table';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to update table';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to fetch orders';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to get order';
      res.status(500).json({ error: message });
    }
  });

  app.post('/api/orders', async (req, res) => {
    try {
      const order = await createOrder(req.body);
      res.json(order);
    } catch (error: any) {
      console.error('Failed to create order:', error);
      const message = error?.cause?.message || error?.message || 'Failed to create order';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to update order status';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to update item status';
      res.status(500).json({ error: message });
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
      const message = error?.cause?.message || error?.message || 'Failed to process payment';
      res.status(500).json({ error: message });
    }
  });

  // Analytics
  app.get('/api/analytics', async (req, res) => {
    try {
      const analytics = await getAnalyticsSummary();
      res.json(analytics);
    } catch (error: any) {
      console.error('Failed to get analytics:', error);
      const message = error?.cause?.message || error?.message || 'Failed to get analytics';
      res.status(500).json({ error: message });
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
