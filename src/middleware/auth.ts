import { Request, Response, NextFunction } from 'express';
import { clerkClient, getAuth } from '@clerk/express';
import { findStaffSession, findTerminalByToken } from '../db/access.ts';
import { getUserByClerkId } from '../db/users.ts';
import { STAFF_COOKIE, TERMINAL_COOKIE, readCookies } from '../auth/security.ts';
import { PlatformRole, Role } from '../types.ts';
import type { terminals, users } from '../db/schema.ts';

export type Permission =
  | 'orders.read' | 'orders.write' | 'orders.cancel'
  | 'payments.process' | 'payments.refund'
  | 'tables.manage' | 'kitchen.manage'
  | 'menu.manage' | 'reports.view'
  | 'staff.manage' | 'terminals.manage';

const rolePermissions: Record<Role, Permission[]> = {
  restaurant_owner: ['orders.read', 'orders.write', 'orders.cancel', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  restaurant_admin: ['orders.read', 'orders.write', 'orders.cancel', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  general_manager: ['orders.read', 'orders.write', 'orders.cancel', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  accountant: ['orders.read', 'reports.view'],
  shift_manager: ['orders.read', 'orders.write', 'orders.cancel', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'reports.view'],
  cashier: ['orders.read', 'orders.write', 'payments.process', 'tables.manage'],
  server: ['orders.read', 'orders.write', 'tables.manage'],
  bartender: ['orders.read', 'orders.write', 'payments.process', 'tables.manage'],
  host: ['orders.read', 'tables.manage'],
  kitchen: ['orders.read', 'kitchen.manage'],
};

export interface AuthRequest extends Request {
  authUserId?: string;
  userRole?: Role;
  terminal?: typeof terminals.$inferSelect;
  staff?: typeof users.$inferSelect;
  staffSessionId?: number;
  clerkOrgId?: string;
  clerkOrgRole?: string;
  platformRole?: PlatformRole;
}

export const attachClerkAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    if (auth?.userId) {
      req.authUserId = auth.userId;
      req.clerkOrgId = auth.orgId;
      req.clerkOrgRole = auth.orgRole;
      const user = await getUserByClerkId(auth.userId);
      if (user) {
        req.userRole = user.role as Role;
      }
    }
  } catch (err) {
    // continue
  }
  next();
};

export async function getPlatformRole(userId: string): Promise<PlatformRole | null> {
  const owners = (process.env.PLATFORM_OWNER_CLERK_USER_IDS || '').split(',').map(value => value.trim()).filter(Boolean);
  if (owners.includes(userId)) return 'platform_owner';
  const user = await clerkClient.users.getUser(userId);
  const role = String(user.privateMetadata?.platformRole || user.publicMetadata?.platformRole || '');
  return ['platform_owner', 'platform_support', 'platform_billing'].includes(role) ? role as PlatformRole : null;
}

export const requirePlatformRole = (allowed: PlatformRole[]) => async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.authUserId) return res.status(401).json({ error: 'Clerk authentication required' });
  const role = await getPlatformRole(req.authUserId);
  if (!role || !allowed.includes(role)) return res.status(403).json({ error: 'Platform access required' });
  req.platformRole = role;
  next();
};

export const requireStrictAuth = (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const { userId, orgId, orgRole } = getAuth(req);
    if (!userId) return res.status(401).json({ error: 'Clerk authentication required' });
    req.authUserId = userId;
    req.clerkOrgId = orgId;
    req.clerkOrgRole = orgRole;
    next();
  } catch {
    return res.status(401).json({ error: 'Clerk authentication required' });
  }
};

export const requireTerminal = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const terminal = await findTerminalByToken(readCookies(req.headers.cookie)[TERMINAL_COOKIE]);
  if (!terminal) return res.status(401).json({ error: 'This device is not an authorized terminal', code: 'TERMINAL_REQUIRED' });
  req.terminal = terminal;
  next();
};

export const requireStaffSession = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.terminal) return res.status(401).json({ error: 'Terminal authentication required' });
  const result = await findStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE], req.terminal.id);
  if (!result) return res.status(401).json({ error: 'Employee PIN session required', code: 'STAFF_SESSION_REQUIRED' });
  req.staff = result.staff;
  req.staffSessionId = result.session.id;
  req.userRole = result.staff.role as Role;
  next();
};

export const requirePermission = (permission: Permission) => (
  req: AuthRequest,
  res: Response,
  next: NextFunction,
) => {
  const role = req.staff?.role as Role | undefined;
  if (!role || !rolePermissions[role]?.includes(permission)) return res.status(403).json({ error: `Permission required: ${permission}` });
  next();
};

export const requireRole = (allowedRoles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction) => {
  const role = req.staff?.role as Role | undefined;
  if (!role || !allowedRoles.includes(role)) return res.status(403).json({ error: 'Forbidden' });
  next();
};

export function permissionsForRole(role: Role): Permission[] {
  return rolePermissions[role] ?? [];
}
