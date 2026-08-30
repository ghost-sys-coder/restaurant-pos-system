import type { Role } from '../types.ts';

export type Permission =
  | 'orders.read' | 'orders.write' | 'orders.cancel'
  | 'discounts.apply'
  | 'payments.process' | 'payments.refund'
  | 'tables.manage' | 'kitchen.manage'
  | 'menu.manage' | 'inventory.manage' | 'reports.view'
  | 'staff.manage' | 'terminals.manage';

const rolePermissions: Record<Role, readonly Permission[]> = {
  restaurant_owner: ['orders.read', 'orders.write', 'orders.cancel', 'discounts.apply', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'inventory.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  restaurant_admin: ['orders.read', 'orders.write', 'orders.cancel', 'discounts.apply', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'inventory.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  general_manager: ['orders.read', 'orders.write', 'orders.cancel', 'discounts.apply', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'menu.manage', 'inventory.manage', 'reports.view', 'staff.manage', 'terminals.manage'],
  accountant: ['orders.read', 'reports.view'],
  shift_manager: ['orders.read', 'orders.write', 'orders.cancel', 'discounts.apply', 'payments.process', 'payments.refund', 'tables.manage', 'kitchen.manage', 'inventory.manage', 'reports.view'],
  cashier: ['orders.read', 'orders.write', 'payments.process', 'tables.manage'],
  server: ['orders.read', 'orders.write', 'tables.manage'],
  bartender: ['orders.read', 'orders.write', 'payments.process', 'tables.manage'],
  host: ['orders.read', 'tables.manage'],
  kitchen: ['orders.read', 'kitchen.manage'],
};

export function permissionsForRole(role: Role): Permission[] {
  return [...(rolePermissions[role] ?? [])];
}

export function roleHasPermission(role: Role | null | undefined, permission: Permission): boolean {
  return Boolean(role && rolePermissions[role]?.includes(permission));
}
