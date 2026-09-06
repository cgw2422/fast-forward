import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { displayToKg } from '@/lib/units';
import { formatDurationShort } from '@/lib/units';
import { FAST_COPY } from '@/lib/copy';

const startSchema = z.object({
  action: z.literal('start'),
  startAt: z.string().datetime().optional(),
  targetHours: z.number().positive().max(24 * 60).nullable().optional(),
  presetLabel: z.string().max(60).nullable().optional(),
  startWeight: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

const endSchema = z.object({
  action: z.literal('end'),
  fastId: z.string(),
  endAt: z.string().datetime().optional(),
  endWeight: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

const updateSchema = z.object({
  action: z.literal('update'),
  fastId: z.string(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().nullable().optional(),
  targetHours: z.number().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
});

const schema = z.discriminatedUnion('action', [startSchema, endSchema, updateSchema]);

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const input = parsed.data;

    if (input.action === 'start') {
      const existing = await prisma.fast.findFirst({ where: { userId: ctx.user.id, status: 'ACTIVE' } });
      if (existing) throw new Error('A fast is already running. End it first.');

      const startAt = input.startAt ? new Date(input.startAt) : new Date();
      if (startAt.getTime() > Date.now() + 60_000) throw new Error('Start time cannot be in the future');

      const fast = await prisma.fast.create({
        data: {
          userId: ctx.user.id,
          startAt,
          targetHours: input.targetHours ?? null,
          presetLabel: input.presetLabel ?? null,
          startWeightKg: input.startWeight ? displayToKg(input.startWeight, ctx.prefs.weightUnit) : null,
          notes: input.notes ?? null,
        },
      });

      await logTimeline({
        userId: ctx.user.id,
        type: 'FAST_START',
        occurredAt: startAt,
        title: 'Fast started',
        detail: input.targetHours ? `Target ${input.targetHours}h` : 'No target',
        refId: fast.id,
      });

      return { ok: true, fastId: fast.id, message: FAST_COPY.active };
    }

    if (input.action === 'end') {
      const fast = await prisma.fast.findFirst({ where: { id: input.fastId, userId: ctx.user.id } });
      if (!fast) throw new Error('Fast not found');

      const endAt = input.endAt ? new Date(input.endAt) : new Date();
      if (endAt.getTime() < fast.startAt.getTime()) throw new Error('End time cannot be before the start');

      const durationMs = endAt.getTime() - fast.startAt.getTime();
      await prisma.fast.update({
        where: { id: fast.id },
        data: {
          endAt,
          status: 'COMPLETED',
          endWeightKg: input.endWeight ? displayToKg(input.endWeight, ctx.prefs.weightUnit) : undefined,
          notes: input.notes ?? fast.notes,
        },
      });

      // Never "failed" — a fast that ends is simply a completed fast.
      await logTimeline({
        userId: ctx.user.id,
        type: 'FAST_END',
        occurredAt: endAt,
        title: FAST_COPY.completed(formatDurationShort(durationMs)),
        detail: fast.targetHours ? `Target was ${fast.targetHours}h` : null,
        refId: fast.id,
      });

      const extended = durationMs >= 24 * 3_600_000;
      return {
        ok: true,
        durationMs,
        message: FAST_COPY.completed(formatDurationShort(durationMs)),
        offerRefeed: extended,
      };
    }

    // update
    const fast = await prisma.fast.findFirst({ where: { id: input.fastId, userId: ctx.user.id } });
    if (!fast) throw new Error('Fast not found');

    await prisma.fast.update({
      where: { id: fast.id },
      data: {
        startAt: input.startAt ? new Date(input.startAt) : undefined,
        endAt: input.endAt === undefined ? undefined : input.endAt ? new Date(input.endAt) : null,
        targetHours: input.targetHours === undefined ? undefined : input.targetHours,
        notes: input.notes === undefined ? undefined : input.notes,
      },
    });
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');

  return handler(async () => {
    const ctx = await getContext();
    const deleted = await prisma.fast.deleteMany({ where: { id, userId: ctx.user.id } });
    if (deleted.count === 0) throw new Error('Fast not found');
    await removeTimelineFor('FAST_START', id);
    await removeTimelineFor('FAST_END', id);
    await removeTimelineFor('FAST_MILESTONE', id);
    return { ok: true };
  });
}
