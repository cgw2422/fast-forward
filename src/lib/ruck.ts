import 'server-only';
import { prisma } from './prisma';
import { RUCK_ACHIEVEMENTS } from './copy';

export { RUCK_ACHIEVEMENTS };

export type PackStats = {
  currentKg: number | null;
  previousKg: number | null;
  highestKg: number | null;
  averageKg: number | null;
};

/**
 * Pack weight is its own history because it moves in both directions — a lighter
 * pack on a tired week is not a regression, so nothing here assumes an upward trend.
 */
export async function getPackStats(userId: string): Promise<PackStats> {
  const entries = await prisma.packWeightEntry.findMany({
    where: { userId },
    orderBy: { effectiveFrom: 'desc' },
    take: 200,
  });

  if (entries.length === 0) {
    // Fall back to what was actually carried, if the pack was never logged separately.
    const lastSession = await prisma.ruckSession.findFirst({
      where: { userId },
      orderBy: { startedAt: 'desc' },
    });
    if (!lastSession) return { currentKg: null, previousKg: null, highestKg: null, averageKg: null };
    return {
      currentKg: lastSession.packWeightKg,
      previousKg: null,
      highestKg: lastSession.packWeightKg,
      averageKg: lastSession.packWeightKg,
    };
  }

  const weights = entries.map((e) => e.weightKg);
  return {
    currentKg: weights[0],
    previousKg: weights[1] ?? null,
    highestKg: Math.max(...weights),
    averageKg: weights.reduce((sum, w) => sum + w, 0) / weights.length,
  };
}

export type LoadComparison = {
  startingKg: number | null;
  currentKg: number | null;
  lostKg: number | null;
  packKg: number | null;
  /** Pack weight as a share of body weight lost, clamped for display sanity. */
  percentOfLoss: number | null;
};

/**
 * The motivational centrepiece: weight you no longer carry by default, next to
 * weight you now choose to pick up. Motivational only — never framed as advice.
 */
export async function getLoadComparison(userId: string): Promise<LoadComparison> {
  const [first, latest, pack] = await Promise.all([
    prisma.weightEntry.findFirst({ where: { userId }, orderBy: { loggedAt: 'asc' } }),
    prisma.weightEntry.findFirst({ where: { userId }, orderBy: { loggedAt: 'desc' } }),
    getPackStats(userId),
  ]);

  if (!first || !latest) {
    return { startingKg: null, currentKg: null, lostKg: null, packKg: pack.currentKg, percentOfLoss: null };
  }

  const lostKg = first.weightKg - latest.weightKg;
  const percentOfLoss =
    pack.currentKg && lostKg > 0 ? Math.min(999, Math.round((pack.currentKg / lostKg) * 100)) : null;

  return {
    startingKg: first.weightKg,
    currentKg: latest.weightKg,
    lostKg,
    packKg: pack.currentKg,
    percentOfLoss,
  };
}
