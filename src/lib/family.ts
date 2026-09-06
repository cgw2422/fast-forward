import 'server-only';
import { prisma } from './prisma';
import { ALL_FAMILY_MODULES, DEFAULT_PERMISSIONS } from './authz';
import type { FamilyRole } from '@prisma/client';

/** Creates the full permission grid for a new relationship using role defaults. */
export async function seedRelationshipPermissions(
  relationshipId: string,
  role: 'ADULT_VIEWER' | 'FAMILY_VIEWER'
) {
  const granted = new Set(DEFAULT_PERMISSIONS[role]);
  await prisma.viewerModulePermission.createMany({
    data: ALL_FAMILY_MODULES.map((module) => ({
      relationshipId,
      module,
      enabled: granted.has(module),
    })),
    skipDuplicates: true,
  });
}

export type InviteRedemption = { ownerId: string; role: FamilyRole; name: string };

/**
 * Validates an invite code without consuming it, so signup can show who invited
 * you before you commit to creating an account.
 */
export async function peekInvite(code: string): Promise<{ ownerName: string; name: string; role: FamilyRole } | null> {
  const invite = await prisma.familyInvite.findUnique({
    where: { code: code.trim().toUpperCase() },
    include: { owner: { select: { name: true } } },
  });
  if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) return null;
  return { ownerName: invite.owner.name, name: invite.name, role: invite.role };
}

/**
 * Consumes an invite and wires up the relationship. Runs in a transaction so a
 * code can never be redeemed twice.
 */
export async function redeemInvite(code: string, viewerId: string): Promise<InviteRedemption | null> {
  const normalized = code.trim().toUpperCase();

  return prisma.$transaction(async (tx) => {
    const invite = await tx.familyInvite.findUnique({ where: { code: normalized } });
    if (!invite || invite.acceptedAt || invite.expiresAt.getTime() < Date.now()) return null;
    if (invite.ownerId === viewerId) return null;
    if (invite.role === 'OWNER') return null;

    await tx.familyInvite.update({
      where: { id: invite.id },
      data: { acceptedAt: new Date(), acceptedById: viewerId },
    });

    const relationship = await tx.familyRelationship.upsert({
      where: { ownerId_viewerId: { ownerId: invite.ownerId, viewerId } },
      update: { role: invite.role, enabled: true },
      create: { ownerId: invite.ownerId, viewerId, role: invite.role, enabled: true },
    });

    const granted = new Set(DEFAULT_PERMISSIONS[invite.role as 'ADULT_VIEWER' | 'FAMILY_VIEWER']);
    await tx.viewerModulePermission.createMany({
      data: ALL_FAMILY_MODULES.map((module) => ({
        relationshipId: relationship.id,
        module,
        enabled: granted.has(module),
      })),
      skipDuplicates: true,
    });

    return { ownerId: invite.ownerId, role: invite.role, name: invite.name };
  });
}
