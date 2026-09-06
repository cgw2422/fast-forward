import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { buildWeightSummary } from '@/lib/queries';
import { PageHeader } from '@/components/PageHeader';
import { WeightView } from '@/components/move/WeightView';
import { formatDate, localDateTimeInputValue } from '@/lib/dates';
import { kgToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function WeightPage() {
  const ctx = await getContext();

  const entries = await prisma.weightEntry.findMany({
    where: { userId: ctx.user.id },
    orderBy: { loggedAt: 'desc' },
    take: 400,
  });

  const summary = buildWeightSummary(entries, ctx.prefs.weightTrendDays, ctx.prefs.weightComparePeriodDays);

  // Chart points ascending, converted to the display unit once here.
  const points = [...entries]
    .sort((a, b) => a.loggedAt.getTime() - b.loggedAt.getTime())
    .map((e) => ({
      t: e.loggedAt.getTime(),
      value: Number(kgToDisplay(e.weightKg, ctx.prefs.weightUnit).toFixed(1)),
      label: formatDate(e.loggedAt, ctx.timezone, 'MMM d'),
    }));

  return (
    <>
      <PageHeader title="Weight" subtitle="Trend over noise." backHref="/today" />
      <WeightView
        weightUnit={ctx.prefs.weightUnit}
        current={summary.current !== null ? kgToDisplay(summary.current, ctx.prefs.weightUnit) : null}
        trend={summary.trend !== null ? kgToDisplay(summary.trend, ctx.prefs.weightUnit) : null}
        change={summary.change !== null ? kgToDisplay(summary.change, ctx.prefs.weightUnit) : null}
        compareDays={summary.compareDays}
        goal={ctx.prefs.goalWeightKg !== null ? kgToDisplay(ctx.prefs.goalWeightKg, ctx.prefs.weightUnit) : null}
        points={points}
        nowInput={localDateTimeInputValue(new Date(), ctx.timezone)}
        entries={entries.slice(0, 30).map((e) => ({
          id: e.id,
          value: kgToDisplay(e.weightKg, ctx.prefs.weightUnit),
          when: formatDate(e.loggedAt, ctx.timezone, 'MMM d · h:mm a'),
          note: e.note,
        }))}
      />
    </>
  );
}
