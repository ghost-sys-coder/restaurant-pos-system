export interface OrganizationMemberSummary { userId?: string | null; role: string; }

export function membershipRemovalError(members: OrganizationMemberSummary[], targetUserId: string, ownerRole: string): string | null {
  const target = members.find(member => member.userId === targetUserId);
  if (!target) return 'Organization member not found';
  if (target.role === ownerRole && members.filter(member => member.role === ownerRole).length <= 1) {
    return 'Add another restaurant owner before removing the last owner';
  }
  return null;
}
