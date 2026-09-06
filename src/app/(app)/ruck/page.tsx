import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { getLoadComparison, getPackStats } from '@/lib/ruck';
import { dayRange, formatDate, localDateTimeInputValue, formatInTimeZone } from '@/lib/dates';
import { kgToDisplay, metersToDisplay } from '@/lib/units';
import { PageHeader } from '@/components/PageHeader';
import { RuckView } from '@/components/ruck/RuckView';

export const dynamic = 'force-dynamic';

export default async function RuckPage() {
  const ctx = await getContext();
  const now = new Date();
  const { end } = dayRange(now, ctx.timezone);
  const weekStart = new Date(end.getTime() - 7 * 86_400_000);

  const [sessions, packStats, load, weights] = await Promise.all([
    prisma.ruckSession.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: 'desc' },
      take: 120,
    }),
    getPackStats(ctx.user.id),
    getLoadComparison(ctx.user.id),
    prisma.weightEntry.findMany({
      where: { userId: ctx.user.id },
      orderBy: { loggedAt: 'asc' },
      take: 400,
    }),
  ]);

  const week = sessions.filter((s) => s.startedAt >= weekStart);
  const weekMeters = week.reduce((sum, s) => sum + (s.distanceMeters ?? 0), 0);
  const weekMinutes = week.reduce((sum, s) => sum + s.durationMinutes, 0);
  const longest = sessions.reduce((max, s) => Math.max(max, s.distanceMeters ?? 0), 0);

  const toWeight = (kg: number) => Number(kgToDisplay(kg, ctx.prefs.weightUnit).toFixed(1));

  // Ascending series for the charts.
  const chart = [...sessions]
    .sort((a, b) => a.startedAt.getTime() - b.startedAt.getTime())
    .map((s) => ({
      label: formatInTimeZone(s.startedAt, ctx.timezone, 'MMM d'),
      pack: toWeight(s.packWeightKg),
      totalLoad: s.bodyWeightKg !== null ? toWeight(s.bodyWeightKg + s.packWeightKg) : null,
      body: s.bodyWeightKg !== null ? toWeight(s.bodyWeightKg) : null,
      distance: s.distanceMeters ? Number(metersToDisplay(s.distanceMeters, ctx.prefs.distanceUnit).toFixed(2)) : 0,
      minutes: s.durationMinutes,
    }));

  return (
    <>
      <PageHeader title="Pack It Forward" subtitle="Weight you choose to carry." backHref="/move" />
      <RuckView
        weightUnit={ctx.prefs.weightUnit}
        distanceUnit={ctx.prefs.distanceUnit}
        nowInput={localDateTimeInputValue(now, ctx.timezone)}
        pack={{
          current: packStats.currentKg !== null ? toWeight(packStats.currentKg) : null,
          previous: packStats.previousKg !== null ? toWeight(packStats.previousKg) : null,
          highest: packStats.highestKg !== null ? toWeight(packStats.highestKg) : null,
          average: packStats.averageKg !== null ? toWeight(packStats.averageKg) : null,
        }}
        load={{
          starting: load.startingKg !== null ? toWeight(load.startingKg) : null,
          current: load.currentKg !== null ? toWeight(load.currentKg) : null,
          lost: load.lostKg !== null ? toWeight(load.lostKg) : null,
          pack: load.packKg !== null ? toWeight(load.packKg) : null,
          percentOfLoss: load.percentOfLoss,
        }}
        totals={{
          weekDistance: Number(metersToDisplay(weekMeters, ctx.prefs.distanceUnit).toFixed(2)),
          weekMinutes,
          longestDistance: Number(metersToDisplay(longest, ctx.prefs.distanceUnit).toFixed(2)),
          sessionCount: sessions.length,
        }}
        chart={chart}
        hasWeightHistory={weights.length >= 2}
        sessions={sessions.slice(0, 25).map((s) => ({
          id: s.id,
          when: formatDate(s.startedAt, ctx.timezone, 'MMM d · h:mm a'),
          pack: toWeight(s.packWeightKg),
          minutes: s.durationMinutes,
          distance: s.distanceMeters
            ? Number(metersToDisplay(s.distanceMeters, ctx.prefs.distanceUnit).toFixed(2))
            : null,
          terrain: s.terrain,
          difficulty: s.difficulty,
          notes: s.notes,
        }))}
      />
    </>
  );
}
