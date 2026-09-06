import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { unlockAchievement } from '@/lib/achievements';
import { displayToKg, displayToMeters, formatDistance, kgToDisplay } from '@/lib/units';
import { RUCK_ACHIEVEMENTS } from '@/lib/copy';

const schema = z.object({
  startedAt: z.string().datetime().optional(),
  packWeight: z.number().nonnegative().max(500),
  durationMinutes: z.number().int().positive().max(1440),
  distance: z.number().nonnegative().optional(),
  steps: z.number().int().nonnegative().optional(),
  terrain: z.enum(['FLAT', 'HILLS', 'TRAIL', 'TREADMILL', 'MIXED', 'OTHER']).optional(),
  difficulty: z.number().int().min(1).max(5).optional(),
  notes: z.string().max(1000).optional(),
  /** Record the pack in its own history as well as on the session. */
  savePackWeight: z.boolean().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const input = parsed.data;
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();
    const packWeightKg = displayToKg(input.packWeight, ctx.prefs.weightUnit);
    const distanceMeters = input.distance ? displayToMeters(input.distance, ctx.prefs.distanceUnit) : null;

    // Snapshot body weight so Total Load stays accurate as weight changes later.
    const latestWeight = await prisma.weightEntry.findFirst({
      where: { userId: ctx.user.id },
      orderBy: { loggedAt: 'desc' },
    });

    const session = await prisma.ruckSession.create({
      data: {
        userId: ctx.user.id,
        startedAt,
        packWeightKg,
        durationMinutes: input.durationMinutes,
        distanceMeters,
        steps: input.steps ?? null,
        terrain: input.terrain ?? null,
        difficulty: input.difficulty ?? null,
        bodyWeightKg: latestWeight?.weightKg ?? null,
        notes: input.notes ?? null,
      },
    });

    if (input.savePackWeight) {
      await prisma.packWeightEntry.create({
        data: { userId: ctx.user.id, weightKg: packWeightKg, effectiveFrom: startedAt },
      });
    }

    const packLabel = `${kgToDisplay(packWeightKg, ctx.prefs.weightUnit).toFixed(0)} ${
      ctx.prefs.weightUnit === 'LB' ? 'lb' : 'kg'
    }`;
    await logTimeline({
      userId: ctx.user.id,
      type: 'RUCK',
      occurredAt: startedAt,
      title: 'Ruck',
      detail: [
        distanceMeters ? formatDistance(distanceMeters, ctx.prefs.distanceUnit) : null,
        `${input.durationMinutes} minutes`,
        `${packLabel} pack`,
      ]
        .filter(Boolean)
        .join(' · '),
      refId: session.id,
    });

    // Achievements read in pounds regardless of the user's display unit.
    const packLb = kgToDisplay(packWeightKg, 'LB');
    let achievement: string | null = null;
    for (const milestone of RUCK_ACHIEVEMENTS) {
      if (packLb + 0.001 < milestone.lb) continue;
      const unlocked = await unlockAchievement({
        userId: ctx.user.id,
        key: milestone.key,
        category: 'rucking',
        label: milestone.label,
      });
      if (unlocked) achievement = unlocked;
    }

    return { ok: true, sessionId: session.id, achievement };
  });
}

const packSchema = z.object({ weight: z.number().nonnegative().max(500), note: z.string().max(200).optional() });

/** Log a pack weight change on its own, without a session. */
export async function PUT(request: Request) {
  const parsed = packSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    await prisma.packWeightEntry.create({
      data: {
        userId: ctx.user.id,
        weightKg: displayToKg(parsed.data.weight, ctx.prefs.weightUnit),
        note: parsed.data.note ?? null,
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
    const deleted = await prisma.ruckSession.deleteMany({ where: { id, userId: ctx.user.id } });
    if (deleted.count === 0) throw new Error('Ruck not found');
    await removeTimelineFor('RUCK', id);
    return { ok: true };
  });
}
