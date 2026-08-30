import type { BackOfficeRole } from '../types.ts';
import { appRoleForClerkRole } from './organizationRoles.ts';

export type ClerkMembershipEvent = {
  eventId: string;
  eventType: 'organizationMembership.created' | 'organizationMembership.updated' | 'organizationMembership.deleted';
  organizationId: string;
  clerkUserId: string;
  clerkRole?: string | null;
  email?: string | null;
  name?: string | null;
};

export type ClerkOrganizationEvent = {
  eventId: string;
  eventType: 'organization.updated' | 'organization.deleted';
  organizationId: string;
  name?: string | null;
  slug?: string | null;
};

export type ClerkUserDeletedEvent = {
  eventId: string;
  eventType: 'user.deleted';
  clerkUserId: string;
};

export type ClerkAccessEvent = ClerkMembershipEvent | ClerkOrganizationEvent | ClerkUserDeletedEvent;

export function membershipRole(event: ClerkMembershipEvent): BackOfficeRole | null {
  if (event.eventType === 'organizationMembership.deleted') return null;
  return appRoleForClerkRole(event.clerkRole);
}

export function publicClerkName(data: { first_name?: string | null; last_name?: string | null; identifier?: string | null }) {
  return [data.first_name, data.last_name].filter(Boolean).join(' ').trim() || data.identifier || 'Back-office user';
}

export function isBootstrapPlatformMembership(createdByClerkUserId: string | null | undefined, membershipClerkUserId: string) {
  return Boolean(createdByClerkUserId && createdByClerkUserId === membershipClerkUserId);
}
