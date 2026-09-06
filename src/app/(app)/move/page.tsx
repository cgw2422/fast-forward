import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getContext, moduleOn } from '@/lib/context';
import { dayRange, formatTime, formatInTimeZone } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { MoveView } from '@/components/move/MoveView';
import { metersToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function MovePage() {
  const ctx = await getContext();
  const now = new Date();
  const { start, end } = dayRange(now, ctx.timezone);
  const weekStart = new Date(start.getTime() - 6 * 86_400_000);

  const [todayWalks, weekWalks, steps] = await Promise.all([
    prisma.walkEntry.findMany({
      where: { userId: ctx.user.id, loggedAt: { gte: start, lt: end } },
      orderBy: { loggedAt: 'desc' },
    }),
    prisma.walkEntry.findMany({
      where: { userId: ctx.user.id, loggedAt: { gte: weekStart, lt: end } },
      select: { minutes: true, distanceMeters: true, loggedAt: true },
    }),
    prisma.stepEntry.findFirst({ where: { userId: ctx.user.id }, orderBy: { date: 'desc' } }),
  ]);

  const minutes = todayWalks.reduce((sum, w) => sum + w.minutes, 0);
  const meters = todayWalks.reduce((sum, w) => sum + (w.distanceMeters ?? 0), 0);

  // Seven buckets, oldest first, keyed by weekday letter.
  const buckets = Array.from({ length: 7 }, (_, i) => {
    const dayStart = new Date(weekStart.getTime() + i * 86_400_000);
    const dayEnd = new Date(dayStart.getTime() + 86_400_000);
    const dayWalks = weekWalks.filter(
      (w) => w.loggedAt >= dayStart && w.loggedAt < dayEnd
    );
    return {
      label: formatInTimeZone(dayStart, ctx.timezone, 'EEEEE'),
      minutes: dayWalks.reduce((sum, w) => sum + w.minutes, 0),
      meters: dayWalks.reduce((sum, w) => sum + (w.distanceMeters ?? 0), 0),
      isToday: i === 6,
    };
  });

  const weekMeters = buckets.reduce((sum, b) => sum + b.meters, 0);

  return (
    <>
      <PageHeader
        title="Walk This Weigh"
        subtitle="Steps today. A stronger tomorrow."
        backHref="/today"
        action={
          <Link href="/workouts" className="text-xs font-bold text-lime">
            Lifts
          </Link>
        }
      />
      <MoveView
        minutes={minutes}
        goalMinutes={ctx.prefs.dailyWalkMinutes}
        tinyMinutes={ctx.prefs.tinyWalkMinutes}
        meters={meters}
        weekMiles={metersToDisplay(weekMeters, ctx.prefs.distanceUnit)}
        week={buckets}
        distanceUnit={ctx.prefs.distanceUnit}
        stepsEnabled={moduleOn(ctx, 'STEPS')}
        stepsToday={steps && steps.date.getTime() === new Date(formatInTimeZone(now, ctx.timezone, 'yyyy-MM-dd') + 'T00:00:00.000Z').getTime() ? steps.steps : 0}
        stepGoal={ctx.prefs.dailyStepGoal}
        entries={todayWalks.map((w) => ({
          id: w.id,
          minutes: w.minutes,
          meters: w.distanceMeters,
          time: formatTime(w.loggedAt, ctx.timezone, ctx.prefs.use24Hour),
        }))}
      />
    </>
  );
}
