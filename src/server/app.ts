import 'dotenv/config';
import express from 'express';
import multer from 'multer';
import {
  getCategories,
  createCategory,
  getMenuItems,
  getMenuItemById,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  getTables,
  createTable,
  updateTableStatus,
  updateTableDetails,
  getOrders,
  getOrderById,
  createOrder,
  replaceOrder,
  updateOrderStatus,
  updateOrderItemStatus,
  processPayment,
  getAnalyticsSummary,
} from '../db/queries.ts';
import { getAllUsers, getUserById, permanentlyDeleteUser, setUserActive, updateUserRole } from '../db/users.ts';
import { AuthRequest, attachClerkAuth, getPlatformRole, permissionsForRole, requirePermission, requirePlatformRole, requireStaffSession, requireStrictAuth, requireTerminal } from '../middleware/auth.ts';
import { clerkMiddleware, clerkClient, getAuth } from '@clerk/express';
import { verifyWebhook } from '@clerk/express/webhooks';
import { authenticatePin, authorizeTerminal, createPinStaff, listAuditEvents, listLocationTerminals, listTerminalStaff, recoverRestaurantOwnerPin, revokeStaffSession, revokeTerminal, setStaffPin, writeAudit } from '../db/access.ts';
import { clearCookie, readCookies, sessionCookie, STAFF_COOKIE, TERMINAL_COOKIE, validatePinFormat } from '../auth/security.ts';
import { BACK_OFFICE_ROLES, BackOfficeRole, OPERATIONAL_ROLES, Role } from '../types.ts';
import { appRoleForClerkRole, clerkRoleForAppRole } from '../auth/organizationRoles.ts';
import { attachBackOfficeUser, createRestaurantLocation, createRestaurantRecord, deactivateBackOfficeMembership, getRestaurantByClerkOrgId, getRestaurantById, getRestaurantSettings, listRestaurantClients, listRestaurantLocations, reconcileClerkAccessEvent, selectBackOfficeLocation, updateRestaurantSettings, updateRestaurantStatus } from '../db/organizations.ts';
import { deleteMenuImage, uploadMenuImage } from '../lib/cloudinary.ts';
import { apiDiagnostics } from './httpDiagnostics.ts';
import { ClerkAccessEvent, publicClerkName } from '../auth/clerkWebhook.ts';
import { membershipRemovalError } from '../auth/clientLifecycle.ts';

export const clerkPublishableKey = process.env.CLERK_PUBLISHABLE_KEY ?? process.env.VITE_CLERK_PUBLISHABLE_KEY;
export const clerkSecretKey = process.env.CLERK_SECRET_KEY;

const app = express();
app.use(apiDiagnostics);
const menuImageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => callback(null, ['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.mimetype)),
});

function menuItemPayload(body: Record<string, any>) {
  const categoryId = Number(body.categoryId);
  const price = Number(body.price);
  const prepTimeMinutes = Number(body.prepTimeMinutes);
  const calories = body.calories === '' || body.calories == null ? undefined : Number(body.calories);
  if (!String(body.name || '').trim() || !Number.isInteger(categoryId) || categoryId < 1 || !Number.isInteger(price) || price < 0) throw new Error('Name, category, and a valid price are required');
  if (!Number.isInteger(prepTimeMinutes) || prepTimeMinutes < 1 || prepTimeMinutes > 240) throw new Error('Preparation time must be between 1 and 240 minutes');
  if (calories !== undefined && (!Number.isInteger(calories) || calories < 0 || calories > 100_000)) throw new Error('Calories must be a valid non-negative number');
  return {
    categoryId, price, prepTimeMinutes, calories,
    name: String(body.name).trim().slice(0, 120),
    description: String(body.description || '').trim().slice(0, 1_000),
    allergens: String(body.allergens || '').trim().slice(0, 500), optionsJson: String(body.optionsJson || '[]'),
    isAvailable: body.isAvailable === true || body.isAvailable === 'true',
  };
}

function publicStaff(staff: { id: number; name: string | null; role: string | null; email?: string | null }) {
  return { id: staff.id, name: staff.name, role: staff.role, email: staff.email ?? null };
}

function publicTerminal(terminal: { id: number; name: string; type: string; locationId: number; inactivityTimeoutMinutes: number }) {
  return {
    id: terminal.id,
    name: terminal.name,
    type: terminal.type,
    locationId: terminal.locationId,
    inactivityTimeoutMinutes: terminal.inactivityTimeoutMinutes,
  };
}

function platformSetupError(error: any): string {
  const message = String(error?.errors?.[0]?.longMessage || error?.cause?.message || error?.message || 'Unable to create restaurant client');
  const normalized = message.toLowerCase();
  if (normalized.includes('does not exist') || normalized.includes('unknown column')) return 'The database has not been upgraded for client organizations. Run npm run db:migrate, then restart the application.';
  if (normalized.includes('role') && (normalized.includes('invalid') || normalized.includes('not found') || normalized.includes('does not exist'))) return 'Clerk role org:restaurant_owner is missing. Create the custom Organization roles in the Clerk Dashboard, then try again.';
  if (normalized.includes('organization') && (normalized.includes('disabled') || normalized.includes('not enabled'))) return 'Clerk Organizations are not enabled for this Clerk application.';
  return message;
}

function invitationRedirectUrl(req: express.Request): string {
  const configured = String(process.env.APP_URL || '').trim();
  if (configured) {
    try {
      const url = new URL(configured);
      if (url.protocol === 'http:' || url.protocol === 'https:') return new URL('/accept-invitation', url).toString();
    } catch {
      throw new Error('APP_URL must be an absolute http:// or https:// URL');
    }
  }
  const forwardedProtocol = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim();
  const protocol = forwardedProtocol || req.protocol;
  const host = req.get('host');
  if (!host) throw new Error('Unable to determine the application URL');
  return `${protocol}://${host}/accept-invitation`;
}

async function getOrCreateUserFromRequest(req: AuthRequest) {
  const { userId, orgId, orgRole } = getAuth(req);
  if (!userId || !orgId) throw new Error('Select your restaurant organization before continuing');
  const appRole = appRoleForClerkRole(orgRole);
  if (!appRole) throw new Error('Your organization role is not configured for restaurant access');
  const clerkUser = await clerkClient.users.getUser(userId);
  const email = clerkUser.primaryEmailAddress?.emailAddress || `${userId}@clerk.local`;
  const name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUser.username || email;
  return attachBackOfficeUser({ clerkUserId: userId, email, name, orgId, role: appRole });
}

app.post('/api/webhooks/clerk', express.raw({ type: 'application/json' }), async (req, res) => {
  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(req);
  } catch {
    return res.status(400).json({ error: 'Webhook signature verification failed', code: 'WEBHOOK_VERIFICATION_FAILED' });
  }

  try {
    let accessEvent: ClerkAccessEvent | null = null;
    const eventId = req.get('svix-id');
    if (!eventId) return res.status(400).json({ error: 'Webhook event ID is missing', code: 'WEBHOOK_EVENT_ID_MISSING' });
    if (event.type === 'organizationMembership.created' || event.type === 'organizationMembership.updated' || event.type === 'organizationMembership.deleted') {
      accessEvent = {
        eventId,
        eventType: event.type,
        organizationId: event.data.organization.id,
        clerkUserId: event.data.public_user_data.user_id,
        clerkRole: event.data.role,
        email: event.data.public_user_data.identifier,
        name: publicClerkName(event.data.public_user_data),
      };
    } else if (event.type === 'organization.updated') {
      accessEvent = { eventId, eventType: event.type, organizationId: event.data.id, name: event.data.name, slug: event.data.slug };
    } else if (event.type === 'organization.deleted') {
      accessEvent = { eventId, eventType: event.type, organizationId: event.data.id };
    } else if (event.type === 'user.deleted' && event.data.id) {
      accessEvent = { eventId, eventType: event.type, clerkUserId: event.data.id };
    }
    if (accessEvent) await reconcileClerkAccessEvent(accessEvent);
    return res.json({ received: true });
  } catch (error) {
    console.error('Clerk webhook reconciliation failed', error);
    return res.status(500).json({ error: 'Webhook reconciliation failed', code: 'WEBHOOK_RECONCILIATION_FAILED' });
  }
});

app.use(express.json());

if (clerkPublishableKey && clerkSecretKey) {
  app.use(clerkMiddleware({ publishableKey: clerkPublishableKey, secretKey: clerkSecretKey }));
}

// API Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

app.use('/api', attachClerkAuth);

// Auth sync
app.post('/api/auth/sync', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    res.json(await getOrCreateUserFromRequest(req));
  } catch (error: any) {
    res.status(403).json({ error: error?.message || 'Organization access could not be synchronized' });
  }
});

app.get('/api/organization/locations', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    const staff = await getOrCreateUserFromRequest(req);
    const result = await listRestaurantLocations(req.clerkOrgId!);
    if (!result) return res.status(404).json({ error: 'Restaurant organization not found' });
    res.json({ currentLocationId: staff.locationId, locations: result.locations });
  } catch (error: any) { res.status(403).json({ error: error?.message || 'Unable to load restaurant locations' }); }
});

app.post('/api/organization/locations', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    const staff = await getOrCreateUserFromRequest(req);
    if (!['restaurant_owner', 'restaurant_admin'].includes(String(staff.role))) return res.status(403).json({ error: 'Only restaurant owners and administrators can create locations' });
    const name = String(req.body.name || '').trim();
    const timezone = String(req.body.timezone || 'Africa/Kampala').trim();
    if (name.length < 2 || name.length > 80 || timezone.length < 3 || timezone.length > 80) return res.status(400).json({ error: 'A valid location name and timezone are required' });
    res.status(201).json(await createRestaurantLocation(req.clerkOrgId!, name, timezone));
  } catch (error: any) { res.status(400).json({ error: String(error?.message || '').toLowerCase().includes('unique') ? 'A location with this name already exists' : error?.message || 'Unable to create location' }); }
});

app.post('/api/organization/locations/select', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    await getOrCreateUserFromRequest(req);
    const locationId = Number(req.body.locationId);
    if (!Number.isInteger(locationId) || locationId < 1) return res.status(400).json({ error: 'Select a valid restaurant location' });
    const result = await selectBackOfficeLocation(req.clerkOrgId!, req.authUserId!, locationId);
    res.setHeader('Set-Cookie', [clearCookie(TERMINAL_COOKIE), clearCookie(STAFF_COOKIE)]);
    res.json({ location: result.location });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to select location' }); }
});

app.get('/api/platform/session', requireStrictAuth, async (req: AuthRequest, res) => {
  const role = await getPlatformRole(req.authUserId!);
  res.json({ role });
});

app.get('/api/platform/clients', requireStrictAuth, requirePlatformRole(['platform_owner', 'platform_support', 'platform_billing']), async (_req, res) => {
  try {
    res.json(await listRestaurantClients());
  } catch (error: any) {
    res.status(500).json({ error: platformSetupError(error) });
  }
});

app.post('/api/platform/clients', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  const name = String(req.body.name || '').trim();
  const ownerEmail = String(req.body.ownerEmail || '').trim().toLowerCase();
  if (name.length < 2 || !/^\S+@\S+\.\S+$/.test(ownerEmail)) return res.status(400).json({ error: 'Restaurant name and valid owner email are required' });
  let organization: Awaited<ReturnType<typeof clerkClient.organizations.createOrganization>> | null = null;
  try {
    organization = await clerkClient.organizations.createOrganization({ name, createdBy: req.authUserId, maxAllowedMemberships: 50 });
    const invitation = await clerkClient.organizations.createOrganizationInvitation({
      organizationId: organization.id,
      inviterUserId: req.authUserId,
      emailAddress: ownerEmail,
      role: clerkRoleForAppRole.restaurant_owner,
      redirectUrl: invitationRedirectUrl(req),
    });
    const record = await createRestaurantRecord({ clerkOrganizationId: organization.id, name, slug: organization.slug || organization.id, createdByClerkUserId: req.authUserId! });
    await clerkClient.organizations.deleteOrganizationMembership({ organizationId: organization.id, userId: req.authUserId! }).catch(error => console.warn('Could not remove temporary platform membership', error));
    res.status(201).json({ restaurant: record.restaurant, invitation: { id: invitation.id, emailAddress: invitation.emailAddress, status: invitation.status } });
  } catch (error: any) {
    if (organization) await clerkClient.organizations.deleteOrganization(organization.id).catch(() => undefined);
    res.status(400).json({ error: platformSetupError(error) });
  }
});

app.patch('/api/platform/clients/:id/status', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  const status = String(req.body.status);
  if (!['active', 'suspended'].includes(status)) return res.status(400).json({ error: 'Invalid client status' });
  const client = await updateRestaurantStatus(Number(req.params.id), status as 'active' | 'suspended');
  if (!client) return res.status(404).json({ error: 'Restaurant client not found' });
  res.json(client);
});

function publicOrganizationInvitation(invitation: any) {
  return { id: invitation.id, emailAddress: invitation.emailAddress, role: invitation.role, roleName: invitation.roleName, status: invitation.status, createdAt: invitation.createdAt, expiresAt: invitation.expiresAt };
}

function publicOrganizationMembership(membership: any) {
  const user = membership.publicUserData;
  return { id: membership.id, userId: user?.userId, emailAddress: user?.identifier, name: [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.identifier || 'Member', role: membership.role, createdAt: membership.createdAt };
}

async function platformClientOrganization(clientId: number) {
  const client = await getRestaurantById(clientId);
  if (!client?.clerkOrganizationId) throw new Error('Restaurant client does not have a Clerk organization');
  return client;
}

app.get('/api/platform/clients/:id/access', requireStrictAuth, requirePlatformRole(['platform_owner', 'platform_support']), async (req: AuthRequest, res) => {
  try {
    const client = await platformClientOrganization(Number(req.params.id));
    const [invitations, memberships] = await Promise.all([
      clerkClient.organizations.getOrganizationInvitationList({ organizationId: client.clerkOrganizationId!, limit: 100 }),
      clerkClient.organizations.getOrganizationMembershipList({ organizationId: client.clerkOrganizationId!, limit: 100 }),
    ]);
    res.json({ invitations: invitations.data.map(publicOrganizationInvitation), members: memberships.data.map(publicOrganizationMembership) });
  } catch (error: any) {
    res.status(String(error?.message).includes('does not have') ? 404 : 400).json({ error: platformSetupError(error) });
  }
});

app.post('/api/platform/clients/:id/invitations', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  try {
    const client = await platformClientOrganization(Number(req.params.id));
    const emailAddress = String(req.body.emailAddress || '').trim().toLowerCase();
    const role = String(req.body.role || 'restaurant_owner') as BackOfficeRole;
    if (!/^\S+@\S+\.\S+$/.test(emailAddress) || !BACK_OFFICE_ROLES.includes(role)) return res.status(400).json({ error: 'A valid email and restaurant role are required' });
    const invitation = await clerkClient.organizations.createOrganizationInvitation({ organizationId: client.clerkOrganizationId!, inviterUserId: req.authUserId!, emailAddress, role: clerkRoleForAppRole[role], redirectUrl: invitationRedirectUrl(req) });
    res.status(201).json(publicOrganizationInvitation(invitation));
  } catch (error: any) { res.status(400).json({ error: platformSetupError(error) }); }
});

app.post('/api/platform/clients/:id/invitations/:invitationId/resend', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  try {
    const client = await platformClientOrganization(Number(req.params.id));
    const invitation = await clerkClient.organizations.getOrganizationInvitation({ organizationId: client.clerkOrganizationId!, invitationId: req.params.invitationId });
    if (invitation.status === 'accepted') return res.status(409).json({ error: 'Accepted invitations cannot be resent' });
    if (invitation.status === 'pending') await clerkClient.organizations.revokeOrganizationInvitation({ organizationId: client.clerkOrganizationId!, invitationId: invitation.id, requestingUserId: req.authUserId! });
    const replacement = await clerkClient.organizations.createOrganizationInvitation({ organizationId: client.clerkOrganizationId!, inviterUserId: req.authUserId!, emailAddress: invitation.emailAddress, role: invitation.role, redirectUrl: invitationRedirectUrl(req) });
    res.status(201).json(publicOrganizationInvitation(replacement));
  } catch (error: any) { res.status(400).json({ error: platformSetupError(error) }); }
});

app.delete('/api/platform/clients/:id/invitations/:invitationId', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  try {
    const client = await platformClientOrganization(Number(req.params.id));
    const invitation = await clerkClient.organizations.revokeOrganizationInvitation({ organizationId: client.clerkOrganizationId!, invitationId: req.params.invitationId, requestingUserId: req.authUserId! });
    res.json(publicOrganizationInvitation(invitation));
  } catch (error: any) { res.status(400).json({ error: platformSetupError(error) }); }
});

app.delete('/api/platform/clients/:id/members/:userId', requireStrictAuth, requirePlatformRole(['platform_owner']), async (req: AuthRequest, res) => {
  try {
    const client = await platformClientOrganization(Number(req.params.id));
    const memberships = await clerkClient.organizations.getOrganizationMembershipList({ organizationId: client.clerkOrganizationId!, limit: 100 });
    const ownerRole = clerkRoleForAppRole.restaurant_owner;
    const removalError = membershipRemovalError(memberships.data.map(membership => ({ userId: membership.publicUserData?.userId, role: membership.role })), req.params.userId, ownerRole);
    if (removalError) return res.status(removalError === 'Organization member not found' ? 404 : 409).json({ error: removalError });
    await clerkClient.organizations.deleteOrganizationMembership({ organizationId: client.clerkOrganizationId!, userId: req.params.userId });
    await deactivateBackOfficeMembership(client.id, req.params.userId);
    res.json({ removed: true });
  } catch (error: any) { res.status(400).json({ error: platformSetupError(error) }); }
});

app.post('/api/organization/invitations', requireStrictAuth, requireTerminal, requireStaffSession, async (req: AuthRequest, res) => {
  try {
    const { userId, orgId, orgRole } = getAuth(req);
    if (!userId || !orgId) return res.status(400).json({ error: 'Select a restaurant organization first' });
    const actorRole = appRoleForClerkRole(orgRole);
    if (actorRole !== 'restaurant_owner' || req.staff?.role !== 'restaurant_owner') return res.status(403).json({ error: 'Only the active restaurant owner can invite back-office administrators' });
    const restaurant = await getRestaurantByClerkOrgId(orgId);
    if (!restaurant || restaurant.status !== 'active') return res.status(404).json({ error: 'Restaurant organization not found' });
    if (restaurant.id !== req.terminal!.restaurantId) return res.status(403).json({ error: 'The active terminal does not belong to this organization' });
    const emailAddress = String(req.body.emailAddress || '').trim().toLowerCase();
    const role = String(req.body.role || 'restaurant_admin') as BackOfficeRole;
    if (!BACK_OFFICE_ROLES.includes(role) || role === 'restaurant_owner') return res.status(400).json({ error: 'Invalid back-office role' });
    const invitation = await clerkClient.organizations.createOrganizationInvitation({ organizationId: orgId, inviterUserId: userId, emailAddress, role: clerkRoleForAppRole[role], redirectUrl: invitationRedirectUrl(req) });
    res.status(201).json({ id: invitation.id, emailAddress: invitation.emailAddress, status: invitation.status, role });
  } catch (error: any) {
    res.status(400).json({ error: error?.errors?.[0]?.longMessage || error?.message || 'Unable to send invitation' });
  }
});

// Terminal enrollment is the only device operation that requires the stronger
// Clerk identity. Daily staff access uses the terminal plus an employee PIN.
app.post('/api/access/terminal/enroll', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (!['restaurant_owner', 'restaurant_admin', 'general_manager'].includes(String(clerkStaff.role))) return res.status(403).json({ error: 'Your restaurant role cannot enroll terminals' });
    const name = String(req.body.name || '').trim();
    const pin = String(req.body.pin || '');
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Terminal name must contain 2 to 60 characters' });
    if (!validatePinFormat(pin)) return res.status(400).json({ error: 'Administrator PIN must contain 4 to 6 digits' });
    const requestedTerminalId = req.body.terminalId == null ? undefined : Number(req.body.terminalId);
    if (requestedTerminalId !== undefined && (!Number.isInteger(requestedTerminalId) || requestedTerminalId < 1)) return res.status(400).json({ error: 'Select a valid terminal' });
    const { terminal, rawToken } = await authorizeTerminal(clerkStaff.id, name, pin, String(req.body.type || 'register'), requestedTerminalId);
    res.setHeader('Set-Cookie', sessionCookie(TERMINAL_COOKIE, rawToken, 60 * 60 * 24 * 90));
    res.status(201).json({ terminal: publicTerminal(terminal) });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to enroll terminal' });
  }
});

app.get('/api/access/terminal/options', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (!['restaurant_owner', 'restaurant_admin', 'general_manager'].includes(String(clerkStaff.role))) return res.status(403).json({ error: 'Your restaurant role cannot authorize terminals' });
    res.json(await listLocationTerminals(clerkStaff.locationId));
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to load existing terminals' }); }
});

app.post('/api/access/owner-pin/recover', requireStrictAuth, async (req: AuthRequest, res) => {
  try {
    const { orgRole } = getAuth(req);
    if (appRoleForClerkRole(orgRole) !== 'restaurant_owner') return res.status(403).json({ error: 'Only the active Clerk restaurant owner can recover this PIN' });
    const pin = String(req.body.pin || '');
    if (!validatePinFormat(pin)) return res.status(400).json({ error: 'New PIN must contain 4 to 6 digits' });
    const clerkStaff = await getOrCreateUserFromRequest(req);
    if (clerkStaff.role !== 'restaurant_owner') return res.status(403).json({ error: 'The owner membership is not synchronized' });
    await recoverRestaurantOwnerPin(clerkStaff.id, pin);
    res.json({ success: true });
  } catch (error: any) { res.status(400).json({ error: error?.message || 'Unable to recover the owner PIN' }); }
});

app.get('/api/access/terminal', requireTerminal, (req: AuthRequest, res) => {
  res.json({ terminal: publicTerminal(req.terminal!) });
});

app.get('/api/access/profiles', requireTerminal, async (req: AuthRequest, res) => {
  res.json(await listTerminalStaff(req.terminal!.id));
});

app.post('/api/access/login', requireTerminal, async (req: AuthRequest, res) => {
  const staffId = Number(req.body.staffId);
  const pin = String(req.body.pin || '');
  if (!Number.isInteger(staffId) || !validatePinFormat(pin)) return res.status(400).json({ error: 'Select a profile and enter a valid PIN' });
  const result = await authenticatePin(req.terminal!.id, staffId, pin);
  if (!result.ok) {
    const status = result.reason === 'locked' ? 429 : 401;
    return res.status(status).json({ error: result.reason === 'locked' ? 'Too many attempts. Try again in one minute.' : 'Incorrect PIN' });
  }
  res.setHeader('Set-Cookie', sessionCookie(STAFF_COOKIE, result.rawToken, 60 * 60 * 12));
  res.json({ staff: publicStaff(result.staff), permissions: permissionsForRole(result.staff.role as Role) });
});

app.post('/api/access/lock', requireTerminal, async (req: AuthRequest, res) => {
  await revokeStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE]);
  res.setHeader('Set-Cookie', clearCookie(STAFF_COOKIE));
  res.json({ success: true });
});

// Account sign-out ends the staff session but deliberately retains this
// device's terminal credential. The UI still requires Clerk sign-in before it
// exposes PIN profiles again.
app.post('/api/access/signout', async (req: AuthRequest, res) => {
  await revokeStaffSession(readCookies(req.headers.cookie)[STAFF_COOKIE]);
  res.setHeader('Set-Cookie', clearCookie(STAFF_COOKIE));
  res.json({ success: true });
});

app.get('/api/access/session', requireTerminal, requireStaffSession, (req: AuthRequest, res) => {
  res.json({ staff: publicStaff(req.staff!), permissions: permissionsForRole(req.staff!.role as Role) });
});

// Every route declared below requires both an enrolled terminal and an active
// employee PIN session. This deliberately replaces the old permissive guard.
app.use('/api', requireTerminal, requireStaffSession);
app.use('/api/staff', requirePermission('staff.manage'));
app.use('/api/analytics', requirePermission('reports.view'));

app.get('/api/config', async (req: AuthRequest, res) => {
  const settings = await getRestaurantSettings(req.terminal!.restaurantId, req.terminal!.locationId);
  if (!settings) return res.status(404).json({ error: 'Restaurant configuration not found' });
  res.json({ receiptName: settings.restaurant.receiptName || settings.restaurant.name, currency: settings.restaurant.currency, taxRateBps: settings.restaurant.taxRateBps, timezone: settings.location.timezone });
});

app.get('/api/settings', requirePermission('staff.manage'), async (req: AuthRequest, res) => {
  const settings = await getRestaurantSettings(req.terminal!.restaurantId, req.terminal!.locationId);
  if (!settings) return res.status(404).json({ error: 'Restaurant settings not found' });
  res.json({ receiptName: settings.restaurant.receiptName || settings.restaurant.name, currency: settings.restaurant.currency, taxRateBps: settings.restaurant.taxRateBps, timezone: settings.location.timezone, inactivityTimeoutMinutes: req.terminal!.inactivityTimeoutMinutes });
});

app.put('/api/settings', requirePermission('staff.manage'), async (req: AuthRequest, res) => {
  const receiptName = String(req.body.receiptName || '').trim();
  const currency = String(req.body.currency || '').trim().toUpperCase();
  const timezone = String(req.body.timezone || '').trim();
  const taxRateBps = Number(req.body.taxRateBps);
  const inactivityTimeoutMinutes = Number(req.body.inactivityTimeoutMinutes);
  if (receiptName.length < 2 || !/^[A-Z]{3}$/.test(currency) || !Number.isInteger(taxRateBps) || taxRateBps < 0 || taxRateBps > 10_000 || !Number.isInteger(inactivityTimeoutMinutes) || inactivityTimeoutMinutes < 1 || inactivityTimeoutMinutes > 240) return res.status(400).json({ error: 'Invalid restaurant settings' });
  try { Intl.DateTimeFormat('en', { timeZone: timezone }); } catch { return res.status(400).json({ error: 'Invalid IANA timezone' }); }
  const updated = await updateRestaurantSettings(req.terminal!.restaurantId, req.terminal!.locationId, req.terminal!.id, { receiptName, currency, timezone, taxRateBps, inactivityTimeoutMinutes });
  await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'settings.updated', entityType: 'restaurant', entityId: String(req.terminal!.restaurantId) });
  res.json(updated);
});

app.get('/api/audit', requirePermission('reports.view'), async (req: AuthRequest, res) => {
  res.json(await listAuditEvents(req.terminal!.restaurantId, req.terminal!.locationId, Number(req.query.limit) || 100));
});

app.delete('/api/access/terminal', requirePermission('terminals.manage'), async (req: AuthRequest, res) => {
  await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'terminal.revoked', entityType: 'terminal', entityId: String(req.terminal!.id) });
  await revokeTerminal(req.terminal!.id);
  res.setHeader('Set-Cookie', [clearCookie(STAFF_COOKIE), clearCookie(TERMINAL_COOKIE)]);
  res.json({ success: true });
});

// Staff users
app.get('/api/staff', async (req: AuthRequest, res) => {
  try {
    const users = await getAllUsers(req.terminal!.restaurantId, req.terminal!.locationId);
    res.json(users);
  } catch (error: any) {
    console.error('Failed to get staff:', error);
    const message = error?.cause?.message || error?.message || 'Failed to get staff';
    res.status(500).json({ error: message });
  }
});

app.post('/api/staff', async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const role = String(req.body.role || '').toLowerCase();
    const pin = String(req.body.pin || '');
    if (name.length < 2 || !OPERATIONAL_ROLES.includes(role as any) || !validatePinFormat(pin)) {
      return res.status(400).json({ error: 'Name, valid role, and a 4 to 6 digit PIN are required' });
    }
    const staff = await createPinStaff({
      restaurantId: req.terminal!.restaurantId,
      locationId: req.terminal!.locationId,
      name,
      role,
      pin,
    });
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'staff.created', entityType: 'staff', entityId: String(staff.id), metadata: { role } });
    res.status(201).json(publicStaff(staff));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to create staff profile' });
  }
});

app.patch('/api/staff/:id/pin', async (req: AuthRequest, res) => {
  try {
    const pin = String(req.body.pin || '');
    if (!validatePinFormat(pin)) return res.status(400).json({ error: 'PIN must contain 4 to 6 digits' });
    const target = await getUserById(Number(req.params.id));
    if (!target || target.restaurantId !== req.terminal!.restaurantId) return res.status(404).json({ error: 'Staff profile not found' });
    const staff = await setStaffPin(target.id, pin);
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'staff.pin_reset', entityType: 'staff', entityId: String(staff.id) });
    res.json({ success: true });
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to reset PIN' });
  }
});

app.patch('/api/staff/:id/access', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const isActive = req.body.isActive;
    if (typeof isActive !== 'boolean') return res.status(400).json({ error: 'An active access state is required' });
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal!.restaurantId || target.locationId !== req.terminal!.locationId) return res.status(404).json({ error: 'Staff profile not found' });
    if (target.id === req.staff!.id && !isActive) return res.status(400).json({ error: 'You cannot revoke your own active session' });
    if (target.clerkUserId) {
      if (isActive) return res.status(400).json({ error: 'Re-invite this back-office user through Clerk to restore access' });
      const { orgId } = getAuth(req);
      if (!orgId) return res.status(400).json({ error: 'Select the restaurant organization first' });
      await clerkClient.organizations.deleteOrganizationMembership({ organizationId: orgId, userId: target.clerkUserId });
    }
    const updated = await setUserActive(id, isActive);
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: isActive ? 'staff.access_restored' : 'staff.access_revoked', entityType: 'staff', entityId: String(id) });
    res.json(publicStaff(updated!));
  } catch (error: any) {
    res.status(400).json({ error: error?.message || 'Unable to change staff access' });
  }
});

app.delete('/api/staff/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal!.restaurantId || target.locationId !== req.terminal!.locationId) return res.status(404).json({ error: 'Staff profile not found' });
    if (target.id === req.staff!.id) return res.status(400).json({ error: 'You cannot delete your own active profile' });
    if (target.clerkUserId) return res.status(400).json({ error: 'Back-office users must be removed from the Clerk organization; revoke their POS access here instead' });
    await permanentlyDeleteUser(id);
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'staff.deleted', entityType: 'staff', entityId: String(id), metadata: { name: target.name, role: target.role } });
    res.json({ success: true });
  } catch (error: any) {
    const detail = String(error?.cause?.message || error?.message || '');
    const referenced = detail.includes('STAFF_HAS_BUSINESS_HISTORY') || detail.toLowerCase().includes('foreign key');
    res.status(400).json({ error: referenced ? 'This staff profile has business history and cannot be deleted. Revoke access instead.' : detail || 'Unable to delete staff profile' });
  }
});

// Update staff role
app.patch('/api/staff/:id/role', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { role } = req.body;
    if (!OPERATIONAL_ROLES.includes(role as any)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    if (!['restaurant_owner', 'restaurant_admin', 'general_manager'].includes(String(req.staff?.role))) return res.status(403).json({ error: 'Restaurant administrator permission required' });
    const target = await getUserById(id);
    if (!target || target.restaurantId !== req.terminal!.restaurantId) return res.status(404).json({ error: 'User not found' });
    const updatedUser = await updateUserRole(id, role);
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(updatedUser);
  } catch (error: any) {
    console.error('Failed to update staff role:', error);
    const message = error?.cause?.message || error?.message || 'Failed to update staff role';
    res.status(500).json({ error: message });
  }
});

// Categories
app.get('/api/categories', async (req: AuthRequest, res) => {
  try {
    const categories = await getCategories(req.terminal!.restaurantId);
    res.json(categories);
  } catch (error: any) {
    console.error('Failed to fetch categories:', error);
    const message = error?.cause?.message || error?.message || 'Failed to fetch categories';
    res.status(500).json({ error: message });
  }
});

app.post('/api/categories', requirePermission('menu.manage'), async (req: AuthRequest, res) => {
  try {
    const name = String(req.body.name || '').trim();
    const icon = String(req.body.icon || 'Utensils').trim();
    const color = String(req.body.color || 'amber').trim();
    if (name.length < 2 || name.length > 60) return res.status(400).json({ error: 'Category name must contain 2 to 60 characters' });
    const category = await createCategory(req.terminal!.restaurantId, name, icon, color);
    res.json(category);
  } catch (error: any) {
    console.error('Failed to create category:', error);
    const message = error?.cause?.message || error?.message || 'Failed to create category';
    res.status(500).json({ error: message });
  }
});

// Menu items
app.get('/api/menu-items', async (req: AuthRequest, res) => {
  try {
    const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
    const items = await getMenuItems(req.terminal!.restaurantId, categoryId);
    res.json(items);
  } catch (error: any) {
    console.error('Failed to fetch menu items:', error);
    const message = error?.cause?.message || error?.message || 'Failed to fetch menu items';
    res.status(500).json({ error: message });
  }
});

app.post('/api/menu-items', requirePermission('menu.manage'), menuImageUpload.single('image'), async (req: AuthRequest, res) => {
  let uploaded: Awaited<ReturnType<typeof uploadMenuImage>> | null = null;
  try {
    const payload = menuItemPayload(req.body);
    if (req.file) uploaded = await uploadMenuImage(req.file.buffer, req.terminal!.restaurantId);
    const item = await createMenuItem({ ...payload, restaurantId: req.terminal!.restaurantId, imageUrl: uploaded?.secureUrl, imagePublicId: uploaded?.publicId });
    res.json(item);
  } catch (error: any) {
    if (uploaded) await deleteMenuImage(uploaded.publicId).catch(() => undefined);
    console.error('Failed to create menu item:', error);
    const message = error?.cause?.message || error?.message || 'Failed to create menu item';
    res.status(500).json({ error: message });
  }
});

app.put('/api/menu-items/:id', requirePermission('menu.manage'), menuImageUpload.single('image'), async (req: AuthRequest, res) => {
  let uploaded: Awaited<ReturnType<typeof uploadMenuImage>> | null = null;
  try {
    const id = Number(req.params.id);
    const current = await getMenuItemById(req.terminal!.restaurantId, id);
    if (!current) return res.status(404).json({ error: 'Menu item not found' });
    const payload = menuItemPayload(req.body);
    if (req.file) uploaded = await uploadMenuImage(req.file.buffer, req.terminal!.restaurantId);
    const removeImage = req.body.removeImage === true || req.body.removeImage === 'true';
    const item = await updateMenuItem(req.terminal!.restaurantId, id, {
      ...payload,
      ...(uploaded ? { imageUrl: uploaded.secureUrl, imagePublicId: uploaded.publicId } : removeImage ? { imageUrl: '', imagePublicId: '' } : {}),
    });
    if ((uploaded || removeImage) && current.imagePublicId) await deleteMenuImage(current.imagePublicId).catch(error => console.warn('Menu record updated but old Cloudinary image cleanup failed', error));
    res.json(item);
  } catch (error: any) {
    if (uploaded) await deleteMenuImage(uploaded.publicId).catch(() => undefined);
    console.error('Failed to update menu item:', error);
    const message = error?.cause?.message || error?.message || 'Failed to update menu item';
    res.status(500).json({ error: message });
  }
});

app.delete('/api/menu-items/:id', requirePermission('menu.manage'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    await deleteMenuItem(req.terminal!.restaurantId, id);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete menu item:', error);
    const message = error?.cause?.message || error?.message || 'Failed to delete menu item';
    res.status(500).json({ error: message });
  }
});

// Tables
app.get('/api/tables', async (req: AuthRequest, res) => {
  try {
    const tables = await getTables(req.terminal!.locationId);
    res.json(tables);
  } catch (error: any) {
    console.error('Failed to fetch tables:', error);
    const message = error?.cause?.message || error?.message || 'Failed to fetch tables';
    res.status(500).json({ error: message });
  }
});

app.post('/api/tables', requirePermission('tables.manage'), async (req: AuthRequest, res) => {
  try {
    const { tableNumber, capacity, section, posX, posY } = req.body;
    const table = await createTable(req.terminal!.locationId, tableNumber, Number(capacity), section, posX, posY);
    res.json(table);
  } catch (error: any) {
    console.error('Failed to create table:', error);
    const message = error?.cause?.message || error?.message || 'Failed to create table';
    res.status(500).json({ error: message });
  }
});

app.put('/api/tables/:id', requirePermission('tables.manage'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const tableNumber = String(req.body.tableNumber || '').trim();
    const capacity = Number(req.body.capacity);
    const section = String(req.body.section || '').trim();
    if (!Number.isInteger(id) || id < 1 || tableNumber.length < 1 || tableNumber.length > 30 || !Number.isInteger(capacity) || capacity < 1 || capacity > 100 || section.length < 2 || section.length > 60) return res.status(400).json({ error: 'Valid table number, capacity, and section are required' });
    const table = await updateTableDetails(req.terminal!.locationId, id, { tableNumber, capacity, section });
    if (!table) return res.status(404).json({ error: 'Table not found' });
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'table.updated', entityType: 'table', entityId: String(id), metadata: { tableNumber, capacity, section } });
    res.json(table);
  } catch (error: any) {
    const detail = String(error?.cause?.message || error?.message || 'Unable to update table');
    res.status(detail.toLowerCase().includes('unique') ? 409 : 400).json({ error: detail.toLowerCase().includes('unique') ? 'A table with this number already exists at this location' : detail });
  }
});

app.patch('/api/tables/:id', requirePermission('tables.manage'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['available', 'reserved', 'billing'].includes(String(status))) return res.status(400).json({ error: 'That table state is controlled by the order and payment workflow' });
    const table = await updateTableStatus(req.terminal!.locationId, id, status);
    if (!table) return res.status(404).json({ error: 'Table not found' });
    res.json(table);
  } catch (error: any) {
    console.error('Failed to update table:', error);
    const message = error?.cause?.message || error?.message || 'Failed to update table';
    res.status(500).json({ error: message });
  }
});

// Orders
app.get('/api/orders', async (req: AuthRequest, res) => {
  try {
    const statusFilter = req.query.status as string | undefined;
    const ordersList = await getOrders(req.terminal!.restaurantId, req.terminal!.locationId, statusFilter);
    res.json(ordersList);
  } catch (error: any) {
    console.error('Failed to fetch orders:', error);
    const message = error?.cause?.message || error?.message || 'Failed to fetch orders';
    res.status(500).json({ error: message });
  }
});

app.get('/api/orders/:id', async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const order = await getOrderById(req.terminal!.restaurantId, req.terminal!.locationId, id);
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

app.post('/api/orders', requirePermission('orders.write'), async (req: AuthRequest, res) => {
  try {
    if (!['dine-in', 'takeout', 'delivery', 'bar'].includes(String(req.body.orderType))) return res.status(400).json({ error: 'Invalid order type' });
    if (Number(req.body.discountPercent || 0) > 0 && !permissionsForRole(req.staff!.role as Role).includes('discounts.apply')) return res.status(403).json({ error: 'Manager approval is required to apply a discount' });
    const order = await createOrder({ orderType: req.body.orderType, tableId: req.body.tableId, customerName: req.body.customerName, customerPhone: req.body.customerPhone, notes: req.body.notes, guestCount: req.body.guestCount, discountPercent: req.body.discountPercent, tipAmount: req.body.tipAmount, items: req.body.items, restaurantId: req.terminal!.restaurantId, locationId: req.terminal!.locationId, serverName: req.staff?.name || 'Staff Member', createdByStaffId: req.staff?.id });
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'order.created', entityType: 'order', entityId: String(order!.id), metadata: { total: order!.total } });
    res.status(201).json(order);
  } catch (error: any) {
    console.error('Failed to create order:', error);
    const message = error?.cause?.message || error?.message || 'Failed to create order';
    res.status(500).json({ error: message });
  }
});

app.put('/api/orders/:id', requirePermission('orders.write'), async (req: AuthRequest, res) => {
  try {
    if (!['dine-in', 'takeout', 'delivery', 'bar'].includes(String(req.body.orderType))) return res.status(400).json({ error: 'Invalid order type' });
    if (Number(req.body.discountPercent || 0) > 0 && !permissionsForRole(req.staff!.role as Role).includes('discounts.apply')) return res.status(403).json({ error: 'Manager approval is required to apply a discount' });
    const expectedVersion = Number(req.body.expectedVersion);
    if (!Number.isInteger(expectedVersion) || expectedVersion < 1) return res.status(400).json({ error: 'A valid order version is required' });
    const order = await replaceOrder({ orderId: Number(req.params.id), expectedVersion, orderType: req.body.orderType, tableId: req.body.tableId, customerName: req.body.customerName, customerPhone: req.body.customerPhone, notes: req.body.notes, guestCount: req.body.guestCount, discountPercent: req.body.discountPercent, tipAmount: req.body.tipAmount, items: req.body.items, restaurantId: req.terminal!.restaurantId, locationId: req.terminal!.locationId, serverName: req.staff?.name || 'Staff Member', createdByStaffId: req.staff?.id });
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'order.updated', entityType: 'order', entityId: String(order!.id), metadata: { version: order!.version } });
    res.json(order);
  } catch (error: any) {
    const message = error?.cause?.message || error?.message || 'Order update failed';
    if (message.includes('ORDER_CONFLICT')) {
      const latestOrder = await getOrderById(req.terminal!.restaurantId, req.terminal!.locationId, Number(req.params.id));
      return res.status(409).json({
        error: 'This order was updated on another terminal. Your draft has been preserved.',
        code: 'ORDER_CONFLICT',
        expectedVersion: Number(req.body.expectedVersion),
        actualVersion: latestOrder?.version ?? null,
        latestOrder,
      });
    }
    res.status(400).json({ error: message });
  }
});

app.patch('/api/orders/:id/status', requirePermission('orders.write'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (status === 'cancelled' && !['restaurant_owner', 'restaurant_admin', 'general_manager', 'shift_manager'].includes(String((req as AuthRequest).staff?.role))) {
      return res.status(403).json({ error: 'Manager approval required to cancel an order' });
    }
    const order = await updateOrderStatus(req.terminal!.restaurantId, req.terminal!.locationId, id, status);
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: `order.${status}`, entityType: 'order', entityId: String(id) });
    res.json(order);
  } catch (error: any) {
    console.error('Failed to update order status:', error);
    const message = error?.cause?.message || error?.message || 'Failed to update order status';
    res.status(500).json({ error: message });
  }
});

app.patch('/api/orders/items/:id/status', requirePermission('kitchen.manage'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { status } = req.body;
    if (!['preparing', 'ready', 'served', 'void'].includes(String(status))) return res.status(400).json({ error: 'Invalid item status' });
    const item = await updateOrderItemStatus(req.terminal!.restaurantId, req.terminal!.locationId, id, status);
    res.json(item);
  } catch (error: any) {
    console.error('Failed to update item status:', error);
    const message = error?.cause?.message || error?.message || 'Failed to update item status';
    res.status(500).json({ error: message });
  }
});

app.post('/api/orders/:id/pay', requirePermission('payments.process'), async (req: AuthRequest, res) => {
  try {
    const id = Number(req.params.id);
    const { amount, tip, method, transactionRef, idempotencyKey, tenderedAmount } = req.body;
    const order = await processPayment(req.terminal!.restaurantId, req.terminal!.locationId, id, {
      amount,
      tip,
      method,
      processedBy: req.staff?.name || 'Cashier',
      processedByStaffId: req.staff?.id,
      transactionRef,
      idempotencyKey: String(idempotencyKey || ''),
      tenderedAmount,
    });
    await writeAudit({ terminal: req.terminal!, actorStaffId: req.staff!.id, action: 'payment.recorded', entityType: 'order', entityId: String(id), metadata: { amount, method, idempotencyKey } });
    res.json(order);
  } catch (error: any) {
    console.error('Failed to process payment:', error);
    const message = error?.cause?.message || error?.message || 'Failed to process payment';
    res.status(500).json({ error: message });
  }
});

// Analytics
app.get('/api/analytics', async (req: AuthRequest, res) => {
  try {
    const startAt = req.query.start ? new Date(String(req.query.start)) : undefined;
    if (startAt && Number.isNaN(startAt.getTime())) return res.status(400).json({ error: 'Invalid report start date' });
    const analytics = await getAnalyticsSummary(req.terminal!.restaurantId, req.terminal!.locationId, startAt);
    res.json(analytics);
  } catch (error: any) {
    console.error('Failed to get analytics:', error);
    const message = error?.cause?.message || error?.message || 'Failed to get analytics';
    res.status(500).json({ error: message });
  }
});

export default app;
