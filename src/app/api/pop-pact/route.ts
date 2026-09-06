import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { getOrCreatePact, recordSlip, streakDays, earnedMilestones } from '@/lib/poppact';
import { logTimeline } from '@/lib/timeline';
import { unlockAchievement } from '@/lib/achievements';
import { POP_COPY } from '@/lib/copy';

const schema = z.discriminatedUnion('action', [
  z.object({ action: z.literal('craving_resisted'), note: z.string().max(500).optional() }),
  z.object({ action: z.literal('distraction_used'), note: z.string().max(500).optional() }),
  z.object({ action: z.literal('slip'), note: z.string().max(500).optional() }),
  z.object({ action: z.literal('update_reason'), reason: z.string().min(1).max(1000) }),
  z.object({ action: z.literal('set_start'), startDate: z.string() }),
  z.object({ action: z.literal('add_reason'), text: z.string().min(1).max(300) }),
  z.object({ action: z.literal('remove_reason'), reasonId: z.string() }),
]);

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const pact = await getOrCreatePact(ctx.user.id);
    const input = parsed.data;

    switch (input.action) {
      case 'craving_resisted': {
        await prisma.popPactEvent.create({
          data: { pactId: pact.id, type: 'CRAVING_RESISTED', note: input.note ?? null },
        });
        await logTimeline({
          userId: ctx.user.id,
          type: 'POP_PACT',
          occurredAt: new Date(),
          title: 'Craving resisted',
          detail: POP_COPY.notToday,
          refId: pact.id,
        });
        return { ok: true, message: POP_COPY.notToday };
      }

      case 'distraction_used': {
        await prisma.popPactEvent.create({
          data: { pactId: pact.id, type: 'DISTRACTION_USED', note: input.note ?? null },
        });
        return { ok: true };
      }

      case 'slip': {
        // Recorded factually. No shame copy anywhere in this branch.
        await recordSlip(pact.id, ctx.timezone, input.note);
        await logTimeline({
          userId: ctx.user.id,
          type: 'POP_PACT',
          occurredAt: new Date(),
          title: 'Pop logged',
          detail: 'Streak restarts today.',
          refId: pact.id,
        });
        return { ok: true, message: POP_COPY.slipRecorded };
      }

      case 'update_reason': {
        await prisma.popPact.update({ where: { id: pact.id }, data: { reason: input.reason } });
        return { ok: true };
      }

      case 'set_start': {
        const start = new Date(`${input.startDate}T00:00:00.000Z`);
        if (Number.isNaN(start.getTime())) throw new Error('Invalid date');
        await prisma.popPact.update({
          where: { id: pact.id },
          data: { startDate: start, streakStart: start },
        });
        return { ok: true };
      }

      case 'add_reason': {
        const count = await prisma.popPactReason.count({ where: { pactId: pact.id } });
        await prisma.popPactReason.create({
          data: { pactId: pact.id, text: input.text, sortOrder: count },
        });
        return { ok: true };
      }

      case 'remove_reason': {
        await prisma.popPactReason.deleteMany({ where: { id: input.reasonId, pactId: pact.id } });
        return { ok: true };
      }
    }
  });
}

/** Unlocks any milestone the current streak has earned. Safe to call often. */
export async function PUT() {
  return handler(async () => {
    const ctx = await getContext();
    const pact = await getOrCreatePact(ctx.user.id);
    const days = streakDays(pact, ctx.timezone);

    const unlocked: string[] = [];
    for (const milestone of earnedMilestones(days)) {
      const label = await unlockAchievement({
        userId: ctx.user.id,
        key: milestone.key,
        category: 'pop_pact',
        label: milestone.label,
      });
      if (label) unlocked.push(label);
    }
    return { ok: true, unlocked, days };
  });
}
