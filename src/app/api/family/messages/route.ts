import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { requireOwnerUser, resolveAccess, NotFoundError } from '@/lib/authz';
import { handler, fail } from '@/lib/api';

const MAX_LENGTH = 500;

const sendSchema = z.object({
  ownerId: z.string(),
  body: z.string().min(1).max(MAX_LENGTH),
});

/**
 * The one write a viewer may perform. Scoped hard: a sender can only address an
 * owner they have a live relationship with, so this can't become general chat.
 */
export async function POST(request: Request) {
  const parsed = sendSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const sender = await requireUser();
    const { ownerId, body } = parsed.data;

    if (sender.id === ownerId) throw new NotFoundError();

    const scope = await resolveAccess(sender.id, ownerId);
    if (!scope || scope.role === 'OWNER') throw new NotFoundError();

    const message = await prisma.familyMessage.create({
      data: { ownerId, senderId: sender.id, body: body.trim() },
    });
    return { ok: true, messageId: message.id };
  });
}

const ownerActionSchema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('mark_read'), messageId: z.string() }),
  z.object({ action: z.literal('mark_all_read') }),
  z.object({ action: z.literal('set_pinned'), messageId: z.string(), pinned: z.boolean() }),
  z.object({ action: z.literal('delete'), messageId: z.string() }),
]);

/** Owner-side inbox management. Scoped to messages addressed to this owner. */
export async function PATCH(request: Request) {
  const parsed = ownerActionSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const owner = await requireOwnerUser();
    const input = parsed.data;

    if (input.action === 'mark_all_read') {
      await prisma.familyMessage.updateMany({
        where: { ownerId: owner.id, readAt: null },
        data: { readAt: new Date() },
      });
      return { ok: true };
    }

    const message = await prisma.familyMessage.findFirst({
      where: { id: input.messageId, ownerId: owner.id },
    });
    if (!message) throw new NotFoundError();

    if (input.action === 'mark_read') {
      await prisma.familyMessage.update({
        where: { id: message.id },
        data: { readAt: message.readAt ?? new Date() },
      });
    } else if (input.action === 'set_pinned') {
      await prisma.familyMessage.update({ where: { id: message.id }, data: { pinned: input.pinned } });
    } else {
      await prisma.familyMessage.delete({ where: { id: message.id } });
    }

    return { ok: true };
  });
}
