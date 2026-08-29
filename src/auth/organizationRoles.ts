import type { BackOfficeRole } from '../types.ts';

export const clerkRoleForAppRole: Record<BackOfficeRole, string> = {
  restaurant_owner: 'org:restaurant_owner',
  restaurant_admin: 'org:restaurant_admin',
  general_manager: 'org:general_manager',
  accountant: 'org:accountant',
};

export function appRoleForClerkRole(role?: string | null): BackOfficeRole | null {
  const entry = Object.entries(clerkRoleForAppRole).find(([, clerkRole]) => clerkRole === role);
  if (entry) return entry[0] as BackOfficeRole;
  // Compatibility during rollout, before custom Clerk roles are configured.
  if (role === 'org:admin') return 'restaurant_owner';
  if (role === 'org:member') return 'restaurant_admin';
  return null;
}
