import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { unlockAchievement } from '@/lib/achievements';
import { displayToMeters, formatDistance } from '@/lib/units';
import { dayRange, todayKey } from '@/lib/dates';
import { MOVE_ACHIEVEMENTS } from '@/lib/copy';

const schema = z.object({
  minutes: z.number().int().positive().max(1440),
  distance: z.number().nonnegative().optional(),
  steps: z.number().int().nonnegative().optional(),
  loggedAt: z.string().datetime().optional(),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const when = parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date();
    const meters = parsed.data.distance ? displayToMeters(parsed.data.distance, ctx.prefs.distanceUnit) : null;

    const entry = await prisma.walkEntry.create({
      data: {
        userId: ctx.user.id,
        minutes: parsed.data.minutes,
        distanceMeters: meters,
        steps: parsed.data.steps ?? null,
        loggedAt: when,
        note: parsed.data.note ?? null,
      },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'WALK',
      occurredAt: when,
      title: 'Walk',
      detail: `${parsed.data.minutes} min${meters ? ` / ${formatDistance(meters, ctx.prefs.distanceUnit)}` : ''}`,
      refId: entry.id,
    });

    // Achievements key off the day's total, not this single entry.
    const { start, end } = dayRange(when, ctx.timezone);
    const totals = await prisma.walkEntry.aggregate({
      where: { userId: ctx.user.id, loggedAt: { gte: start, lt: end } },
      _sum: { minutes: true },
    });
    const dayMinutes = totals._sum.minutes ?? 0;
    const dayStamp = start.toISOString().slice(0, 10);

    let achievement: string | null = null;
    for (const milestone of MOVE_ACHIEVEMENTS) {
      if (dayMinutes < milestone.minutes) continue;
      const unlocked = await unlockAchievement({
        userId: ctx.user.id,
        key: `${milestone.key}_${dayStamp}`,
        category: 'movement',
        label: milestone.label,
      });
      if (unlocked) achievement = unlocked;
    }

    return { ok: true, dayMinutes, goalMinutes: ctx.prefs.dailyWalkMinutes, achievement };
  });
}

const stepSchema = z.object({ steps: z.number().int().nonnegative().max(500000) });

/** Steps are a daily total, not per-entry — upsert on the calendar day. */
export async function PUT(request: Request) {
  const parsed = stepSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const date = todayKey(ctx.timezone);
    await prisma.stepEntry.upsert({
      where: { userId_date: { userId: ctx.user.id, date } },
      update: { steps: parsed.data.steps },
      create: { userId: ctx.user.id, date, steps: parsed.data.steps, source: 'manual' },
    });
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.walkEntry.deleteMany({ where: { id, userId: ctx.user.id } });
    await removeTimelineFor('WALK', id);
    return { ok: true };
  });
}
