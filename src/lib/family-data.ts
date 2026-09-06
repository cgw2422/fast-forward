import 'server-only';
import { prisma } from './prisma';
import { dayRange, todayKey, weekdayIndex } from './dates';
import { streakDays } from './poppact';
import { getLoadComparison, getPackStats } from './ruck';
import type { AccessScope } from './authz';

/**
 * Builds the family dashboard. Every section is gated on a module the owner
 * actually granted — an ungranted module returns null and renders nothing at
 * all, rather than a locked placeholder.
 */
export async function getFamilySnapshot(scope: AccessScope, timezone: string, now = new Date()) {
  const ownerId = scope.ownerId;
  const { start, end } = dayRange(now, timezone);
  const range = { gte: start, lt: end };
  const has = (m: Parameters<typeof scope.modules.has>[0]) => scope.modules.has(m);

  const [pact, walks, rucks, weights, habits, completions, achievements, packStats, load, photos] =
    await Promise.all([
      has('POP_PACT') ? prisma.popPact.findUnique({ where: { userId: ownerId } }) : null,
      has('WALKING')
        ? prisma.walkEntry.aggregate({
            where: { userId: ownerId, loggedAt: range },
            _sum: { minutes: true, distanceMeters: true },
          })
        : null,
      has('RUCKING')
        ? prisma.ruckSession.findFirst({ where: { userId: ownerId }, orderBy: { startedAt: 'desc' } })
        : null,
      has('WEIGHT')
        ? prisma.weightEntry.findMany({ where: { userId: ownerId }, orderBy: { loggedAt: 'asc' } })
        : null,
      has('TINY_WINS')
        ? prisma.habit.findMany({ where: { userId: ownerId, active: true }, orderBy: { sortOrder: 'asc' } })
        : null,
      has('TINY_WINS')
        ? prisma.habitCompletion.findMany({ where: { habit: { userId: ownerId }, date: todayKey(timezone) } })
        : null,
      has('MILESTONES')
        ? prisma.achievement.findMany({ where: { userId: ownerId }, orderBy: { unlockedAt: 'desc' }, take: 6 })
        : null,
      has('RUCKING') ? getPackStats(ownerId) : null,
      has('RUCKING') || has('WEIGHT') ? getLoadComparison(ownerId) : null,
      has('PROGRESS_PHOTOS')
        ? prisma.progressPhoto.findMany({
            where: { userId: ownerId, visibility: { in: Array.from(scope.visibilities) } },
            orderBy: { capturedAt: 'desc' },
            take: 6,
            select: { id: true, capturedAt: true, angle: true },
          })
        : null,
    ]);

  // Weight is deliberately coarse for family: total progress, not today's number.
  let weightProgress: { lostKg: number; startKg: number; currentKg: number } | null = null;
  if (weights && weights.length >= 2) {
    const startKg = weights[0].weightKg;
    const currentKg = weights[weights.length - 1].weightKg;
    weightProgress = { lostKg: startKg - currentKg, startKg, currentKg };
  }

  const dow = weekdayIndex(now, timezone);
  const scheduled = (habits ?? []).filter((h) => h.scheduleDays.includes(dow));
  const doneIds = new Set((completions ?? []).filter((c) => c.status !== 'SKIPPED').map((c) => c.habitId));

  return {
    popStreak: pact ? streakDays(pact, timezone) : null,
    promiseKeptToday: pact ? streakDays(pact, timezone) > 0 : null,
    walkMinutes: walks ? (walks._sum.minutes ?? 0) : null,
    walkMeters: walks ? (walks._sum.distanceMeters ?? 0) : null,
    latestRuck: rucks
      ? {
          packWeightKg: rucks.packWeightKg,
          distanceMeters: rucks.distanceMeters,
          durationMinutes: rucks.durationMinutes,
          startedAt: rucks.startedAt,
        }
      : null,
    packStats,
    load,
    weightProgress,
    habits: scheduled.map((h) => ({ id: h.id, name: h.name, done: doneIds.has(h.id) })),
    votesCast: scheduled.filter((h) => doneIds.has(h.id)).length,
    votesTotal: scheduled.length,
    achievements: (achievements ?? []).map((a) => ({ id: a.id, label: a.label, unlockedAt: a.unlockedAt })),
    photos: (photos ?? []).map((p) => ({ id: p.id, capturedAt: p.capturedAt, angle: p.angle })),
  };
}
