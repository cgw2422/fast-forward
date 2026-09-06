import 'server-only';
import { prisma } from './prisma';
import { dayRange, todayKey, weekdayIndex } from './dates';
import { streakDays } from './poppact';
import type { AppContext } from './context';

export type TodaySnapshot = Awaited<ReturnType<typeof getTodaySnapshot>>;

export async function getTodaySnapshot(ctx: AppContext, now = new Date()) {
  const { user, prefs, timezone } = ctx;
  const { start, end } = dayRange(now, timezone);
  const range = { gte: start, lt: end };
  const today = todayKey(timezone);
  const dow = weekdayIndex(now, timezone);

  const [activeFast, pact, water, lastWater, walks, weights, electrolytes, habits, completions, checkIn, steps] =
    await Promise.all([
      prisma.fast.findFirst({ where: { userId: user.id, status: 'ACTIVE' }, orderBy: { startAt: 'desc' } }),
      prisma.popPact.findUnique({ where: { userId: user.id } }),
      prisma.waterEntry.aggregate({ where: { userId: user.id, loggedAt: range }, _sum: { volumeMl: true } }),
      prisma.waterEntry.findFirst({ where: { userId: user.id }, orderBy: { loggedAt: 'desc' } }),
      prisma.walkEntry.aggregate({
        where: { userId: user.id, loggedAt: range },
        _sum: { minutes: true, distanceMeters: true, steps: true },
      }),
      prisma.weightEntry.findMany({
        where: { userId: user.id },
        orderBy: { loggedAt: 'desc' },
        take: 60,
      }),
      prisma.electrolyteEntry.count({ where: { userId: user.id, loggedAt: range } }),
      prisma.habit.findMany({ where: { userId: user.id, active: true }, orderBy: { sortOrder: 'asc' } }),
      prisma.habitCompletion.findMany({ where: { habit: { userId: user.id }, date: today } }),
      prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
      prisma.stepEntry.findUnique({ where: { userId_date: { userId: user.id, date: today } } }),
    ]);

  const totalWaterMl = water._sum.volumeMl ?? 0;
  const walkMinutes = walks._sum.minutes ?? 0;
  const walkMeters = walks._sum.distanceMeters ?? 0;
  const walkSteps = (walks._sum.steps ?? 0) + (steps?.steps ?? 0);

  // Only habits scheduled for today count toward "votes cast".
  const scheduledHabits = habits.filter((h) => h.scheduleDays.includes(dow));
  const completionByHabit = new Map(completions.map((c) => [c.habitId, c]));
  const votesCast = scheduledHabits.filter((h) => {
    const c = completionByHabit.get(h.id);
    return c && c.status !== 'SKIPPED';
  }).length;

  return {
    now,
    activeFast,
    fastElapsedMs: activeFast ? now.getTime() - activeFast.startAt.getTime() : 0,
    popPact: pact,
    popStreakDays: pact ? streakDays(pact, timezone) : 0,
    water: {
      totalMl: totalWaterMl,
      goalMl: prefs.dailyWaterMl,
      progress: prefs.dailyWaterMl > 0 ? totalWaterMl / prefs.dailyWaterMl : 0,
      lastAt: lastWater?.loggedAt ?? null,
    },
    walk: {
      minutes: walkMinutes,
      goalMinutes: prefs.dailyWalkMinutes,
      tinyMinutes: prefs.tinyWalkMinutes,
      meters: walkMeters,
      steps: walkSteps,
      stepGoal: prefs.dailyStepGoal,
      progress: prefs.dailyWalkMinutes > 0 ? walkMinutes / prefs.dailyWalkMinutes : 0,
    },
    weight: buildWeightSummary(weights, prefs.weightTrendDays, prefs.weightComparePeriodDays),
    electrolyteCount: electrolytes,
    habits: scheduledHabits.map((h) => ({
      id: h.id,
      name: h.name,
      identityStatement: h.identityStatement,
      goalLabel: h.goalLabel,
      tinyGoalLabel: h.tinyGoalLabel,
      status: completionByHabit.get(h.id)?.status ?? null,
    })),
    votesCast,
    votesTotal: scheduledHabits.length,
    checkIn,
  };
}

/**
 * Trend uses an exponentially-weighted average so a salty dinner doesn't look
 * like a setback — the number the user should actually watch.
 */
export function buildWeightSummary(
  entries: { weightKg: number; loggedAt: Date }[],
  trendDays: number,
  compareDays: number
) {
  if (entries.length === 0) {
    return { current: null, trend: null, change: null, compareDays, latestAt: null };
  }

  const ascending = [...entries].sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime());
  const alpha = 2 / (Math.max(1, trendDays) + 1);
  let trend = ascending[0].weightKg;
  for (const entry of ascending) {
    trend = alpha * entry.weightKg + (1 - alpha) * trend;
  }

  const latest = ascending[ascending.length - 1];
  const cutoff = new Date(latest.loggedAt.getTime() - compareDays * 86_400_000);
  const past = ascending.filter((e) => e.loggedAt.getTime() <= cutoff.getTime()).pop() ?? ascending[0];

  return {
    current: latest.weightKg,
    trend,
    change: latest.weightKg - past.weightKg,
    compareDays,
    latestAt: latest.loggedAt,
  };
}
