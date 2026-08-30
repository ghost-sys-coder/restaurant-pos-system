import { and, eq, gt, isNull } from 'drizzle-orm';
import { db, withTransaction } from './index.ts';
import { auditEvents, managerApprovals, terminals, users } from './schema.ts';
import { hashToken, newOpaqueToken, validatePinFormat, verifyPin } from '../auth/security.ts';

const APPROVER_ROLES = new Set(['restaurant_owner', 'restaurant_admin', 'general_manager', 'shift_manager']);
export const APPROVAL_ACTIONS = ['order.discount', 'order.cancel', 'order.item_void', 'order.open_modifier', 'payment.process', 'payment.refund', 'cash.drawer_open', 'shift.exception', 'settings.sensitive'] as const;
export type ApprovalAction = typeof APPROVAL_ACTIONS[number];

export async function createManagerApproval(input: { terminalId: number; requesterStaffId: number; approverStaffId: number; pin: string; action: ApprovalAction; entityId?: string; reason: string }) {
  if (!validatePinFormat(input.pin)) throw new Error('Manager PIN must contain 4 to 6 digits');
  const terminal = (await db.select().from(terminals).where(and(eq(terminals.id, input.terminalId), eq(terminals.isActive, true))).limit(1))[0];
  if (!terminal) throw new Error('Terminal is not active');
  const approver = (await db.select().from(users).where(and(eq(users.id, input.approverStaffId), eq(users.restaurantId, terminal.restaurantId), eq(users.locationId, terminal.locationId), eq(users.isActive, true))).limit(1))[0];
  if (!approver || !APPROVER_ROLES.has(String(approver.role)) || !approver.pinHash) throw new Error('Select an active manager at this location');
  if (approver.pinLockedUntil && approver.pinLockedUntil > new Date()) throw new Error('This manager PIN is temporarily locked');
  if (!await verifyPin(input.pin, approver.pinHash)) {
    const attempts = approver.failedPinAttempts + 1;
    await db.update(users).set({ failedPinAttempts: attempts >= 5 ? 0 : attempts, pinLockedUntil: attempts >= 5 ? new Date(Date.now() + 60_000) : null }).where(eq(users.id, approver.id));
    throw new Error(attempts >= 5 ? 'Manager PIN temporarily locked' : 'Incorrect manager PIN');
  }
  await db.update(users).set({ failedPinAttempts: 0, pinLockedUntil: null }).where(eq(users.id, approver.id));
  const rawToken = newOpaqueToken(); const expiresAt = new Date(Date.now() + 2 * 60_000);
  const approval = (await db.insert(managerApprovals).values({ restaurantId: terminal.restaurantId, locationId: terminal.locationId, terminalId: terminal.id, requesterStaffId: input.requesterStaffId, approverStaffId: approver.id, action: input.action, entityId: input.entityId || null, reason: input.reason, tokenHash: hashToken(rawToken), expiresAt }).returning())[0];
  return { rawToken, expiresAt, approvalId: approval.id, approver: { id: approver.id, name: approver.name, role: approver.role } };
}

export async function consumeManagerApproval(input: { rawToken?: string; terminalId: number; requesterStaffId: number; action: ApprovalAction; entityId?: string }) {
  if (!input.rawToken) return null;
  return withTransaction(async tx => {
    const approval = (await tx.update(managerApprovals).set({ consumedAt: new Date() }).where(and(eq(managerApprovals.tokenHash, hashToken(input.rawToken!)), eq(managerApprovals.terminalId, input.terminalId), eq(managerApprovals.requesterStaffId, input.requesterStaffId), eq(managerApprovals.action, input.action), input.entityId ? eq(managerApprovals.entityId, input.entityId) : isNull(managerApprovals.entityId), isNull(managerApprovals.consumedAt), gt(managerApprovals.expiresAt, new Date()))).returning())[0];
    if (!approval) return null;
    await tx.insert(auditEvents).values({ restaurantId: approval.restaurantId, locationId: approval.locationId, terminalId: approval.terminalId, actorStaffId: approval.requesterStaffId, approverStaffId: approval.approverStaffId, action: `${approval.action}.approved`, entityType: approval.action.split('.')[0], entityId: approval.entityId, metadata: { reason: approval.reason, approvalId: approval.id } });
    return approval;
  });
}
