import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { FastHistoryView } from '@/components/fast/FastHistoryView';
import { formatDate } from '@/lib/dates';
import { kgToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function FastHistoryPage() {
  const ctx = await getContext();

  const fasts = await prisma.fast.findMany({
    where: { userId: ctx.user.id, status: 'COMPLETED', endAt: { not: null } },
    orderBy: { startAt: 'desc' },
    take: 200,
  });

  const durations = fasts.map((f) => (f.endAt as Date).getTime() - f.startAt.getTime());
  const totalHours = durations.reduce((sum, ms) => sum + ms / 3_600_000, 0);
  const longest = durations.length > 0 ? Math.max(...durations) : 0;
  const average = durations.length > 0 ? totalHours / durations.length : 0;

  // Monthly totals, most recent 6 months, oldest first for the chart.
  const monthly = new Map<string, number>();
  for (const fast of fasts) {
    const key = formatDate(fast.startAt, ctx.timezone, 'MMM yyyy');
    const hours = ((fast.endAt as Date).getTime() - fast.startAt.getTime()) / 3_600_000;
    monthly.set(key, (monthly.get(key) ?? 0) + hours);
  }
  const monthlyData = Array.from(monthly.entries())
    .slice(0, 6)
    .reverse()
    .map(([month, hours]) => ({ month: month.split(' ')[0], hours: Math.round(hours) }));

  return (
    <>
      <PageHeader title="Fasting History" backHref="/fast" />
      <FastHistoryView
        stats={{
          totalHours: Math.round(totalHours),
          averageHours: average,
          longestMs: longest,
          count: fasts.length,
        }}
        monthly={monthlyData}
        weightUnitLabel={ctx.prefs.weightUnit === 'LB' ? 'lb' : 'kg'}
        fasts={fasts.map((f) => {
          const durationMs = (f.endAt as Date).getTime() - f.startAt.getTime();
          const hitTarget = f.targetHours ? durationMs >= f.targetHours * 3_600_000 : null;
          const weightChange =
            f.startWeightKg !== null && f.endWeightKg !== null
              ? kgToDisplay(f.endWeightKg - f.startWeightKg, ctx.prefs.weightUnit)
              : null;
          return {
            id: f.id,
            start: formatDate(f.startAt, ctx.timezone, 'MMM d, h:mm a'),
            end: formatDate(f.endAt as Date, ctx.timezone, 'MMM d, h:mm a'),
            durationMs,
            targetHours: f.targetHours,
            hitTarget,
            weightChange,
            notes: f.notes,
          };
        })}
      />
    </>
  );
}
