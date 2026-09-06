import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { RefeedView } from '@/components/fast/RefeedView';
import { formatDate, localDateTimeInputValue } from '@/lib/dates';
import { mlToDisplay, kgToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function RefeedPage({
  searchParams,
}: {
  searchParams: Promise<{ fastId?: string }>;
}) {
  const ctx = await getContext();
  const { fastId } = await searchParams;

  const entries = await prisma.refeedEntry.findMany({
    where: { userId: ctx.user.id, ...(fastId ? { fastId } : {}) },
    orderBy: { occurredAt: 'desc' },
    take: 50,
  });

  return (
    <>
      <PageHeader title="Refeeding Log" subtitle="Observational tracking only." backHref="/fast" />
      <RefeedView
        fastId={fastId ?? null}
        nowInput={localDateTimeInputValue(new Date(), ctx.timezone)}
        volumeUnit={ctx.prefs.volumeUnit}
        weightUnit={ctx.prefs.weightUnit}
        entries={entries.map((e) => ({
          id: e.id,
          when: formatDate(e.occurredAt, ctx.timezone, 'MMM d · h:mm a'),
          meal: e.meal,
          amount: e.amount,
          water: e.waterMl !== null ? Math.round(mlToDisplay(e.waterMl, ctx.prefs.volumeUnit)) : null,
          symptoms: e.symptoms,
          weight: e.weightKg !== null ? kgToDisplay(e.weightKg, ctx.prefs.weightUnit) : null,
          notes: e.notes,
        }))}
      />
    </>
  );
}
