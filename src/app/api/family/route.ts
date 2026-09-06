import { z } from 'zod';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { requireOwnerUser, ALL_FAMILY_MODULES, NotFoundError } from '@/lib/authz';
import { handler, fail } from '@/lib/api';
import type { FamilyModule } from '@prisma/client';

const viewerRole = z.enum(['ADULT_VIEWER', 'FAMILY_VIEWER']);

const schema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('invite'),
    name: z.string().min(1).max(80),
    email: z.string().email().optional(),
    role: viewerRole,
  }),
  z.object({ action: z.literal('revoke_invite'), inviteId: z.string() }),
  z.object({ action: z.literal('set_role'), relationshipId: z.string(), role: viewerRole }),
  z.object({ action: z.literal('set_enabled'), relationshipId: z.string(), enabled: z.boolean() }),
  z.object({
    action: z.literal('set_permissions'),
    relationshipId: z.string(),
    permissions: z.array(z.object({ module: z.enum(ALL_FAMILY_MODULES as [string, ...string[]]), enabled: z.boolean() })),
  }),
  z.object({ action: z.literal('remove'), relationshipId: z.string() }),
]);

/** Every branch scopes by ownerId, so an owner can only ever touch their own family. */
export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const owner = await requireOwnerUser();
    const input = parsed.data;

    switch (input.action) {
      case 'invite': {
        const code = randomBytes(9).toString('base64url').toUpperCase();
        const invite = await prisma.familyInvite.create({
          data: {
            ownerId: owner.id,
            code,
            name: input.name.trim(),
            email: input.email?.toLowerCase() ?? null,
            role: input.role,
            expiresAt: new Date(Date.now() + 14 * 86_400_000),
          },
        });
        return { ok: true, code: invite.code, inviteId: invite.id };
      }

      case 'revoke_invite': {
        const deleted = await prisma.familyInvite.deleteMany({
          where: { id: input.inviteId, ownerId: owner.id, acceptedAt: null },
        });
        if (deleted.count === 0) throw new NotFoundError();
        return { ok: true };
      }

      case 'set_role': {
        const relationship = await prisma.familyRelationship.findFirst({
          where: { id: input.relationshipId, ownerId: owner.id },
        });
        if (!relationship) throw new NotFoundError();
        await prisma.familyRelationship.update({
          where: { id: relationship.id },
          data: { role: input.role },
        });
        return { ok: true };
      }

      case 'set_enabled': {
        const relationship = await prisma.familyRelationship.findFirst({
          where: { id: input.relationshipId, ownerId: owner.id },
        });
        if (!relationship) throw new NotFoundError();
        await prisma.familyRelationship.update({
          where: { id: relationship.id },
          data: { enabled: input.enabled },
        });
        return { ok: true };
      }

      case 'set_permissions': {
        const relationship = await prisma.familyRelationship.findFirst({
          where: { id: input.relationshipId, ownerId: owner.id },
        });
        if (!relationship) throw new NotFoundError();

        await prisma.$transaction(
          input.permissions.map((p) =>
            prisma.viewerModulePermission.upsert({
              where: {
                relationshipId_module: {
                  relationshipId: relationship.id,
                  module: p.module as FamilyModule,
                },
              },
              update: { enabled: p.enabled },
              create: {
                relationshipId: relationship.id,
                module: p.module as FamilyModule,
                enabled: p.enabled,
              },
            })
          )
        );
        return { ok: true };
      }

      case 'remove': {
        const deleted = await prisma.familyRelationship.deleteMany({
          where: { id: input.relationshipId, ownerId: owner.id },
        });
        if (deleted.count === 0) throw new NotFoundError();
        return { ok: true };
      }
    }
  });
}
