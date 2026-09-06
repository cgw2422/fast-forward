import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { unlockAchievement } from '@/lib/achievements';
import { displayToMl, formatVolume } from '@/lib/units';
import { dayRange } from '@/lib/dates';
import { SMART_WATER } from '@/lib/copy';

const createSchema = z.object({
  presetId: z.string().optional(),
  amount: z.number().positive().optional(),
  unit: z.enum(['OZ', 'ML', 'L']).optional(),
  loggedAt: z.string().datetime().optional(),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const { presetId, amount, unit, loggedAt, note } = parsed.data;

    let volumeMl: number;
    let label: string;

    if (presetId) {
      const preset = await prisma.waterPreset.findFirst({ where: { id: presetId, userId: ctx.user.id } });
      if (!preset) throw new Error('That container no longer exists');
      volumeMl = preset.volumeMl;
      label = preset.label;
    } else if (amount) {
      volumeMl = displayToMl(amount, unit ?? ctx.prefs.volumeUnit);
      label = formatVolume(volumeMl, ctx.prefs.volumeUnit);
    } else {
      throw new Error('Pick a container or enter an amount');
    }

    const when = loggedAt ? new Date(loggedAt) : new Date();
    const entry = await prisma.waterEntry.create({
      data: { userId: ctx.user.id, volumeMl, loggedAt: when, presetId: presetId ?? null, note: note ?? null },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'WATER',
      occurredAt: when,
      title: 'Water',
      detail: `${formatVolume(volumeMl, ctx.prefs.volumeUnit)}${presetId ? ` · ${label}` : ''}`,
      refId: entry.id,
    });

    // Goal celebration fires once per day, and never suggests drinking past it.
    const { start, end } = dayRange(when, ctx.timezone);
    const total = await prisma.waterEntry.aggregate({
      where: { userId: ctx.user.id, loggedAt: { gte: start, lt: end } },
      _sum: { volumeMl: true },
    });
    const totalMl = total._sum.volumeMl ?? 0;

    let achievement: string | null = null;
    if (totalMl >= ctx.prefs.dailyWaterMl) {
      achievement = await unlockAchievement({
        userId: ctx.user.id,
        key: `water_goal_${start.toISOString().slice(0, 10)}`,
        category: 'hydration',
        label: 'ABSOLUTELY DRENCHED',
      });
    }

    return {
      ok: true,
      entryId: entry.id,
      totalMl,
      goalReached: totalMl >= ctx.prefs.dailyWaterMl,
      achievement,
      message: achievement ? SMART_WATER.goalReached : `+${formatVolume(volumeMl, ctx.prefs.volumeUnit)}`,
    };
  });
}

export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get('id');
  if (!id) return fail('Missing id');

  return handler(async () => {
    const ctx = await getContext();
    const deleted = await prisma.waterEntry.deleteMany({ where: { id, userId: ctx.user.id } });
    if (deleted.count === 0) throw new Error('Entry not found');
    await removeTimelineFor('WATER', id);
    return { ok: true };
  });
}
