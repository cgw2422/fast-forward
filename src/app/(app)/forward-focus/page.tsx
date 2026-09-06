import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { formatDate, localDateTimeInputValue } from '@/lib/dates';
import { kgToDisplay } from '@/lib/units';
import { PageHeader } from '@/components/PageHeader';
import { ForwardFocusView } from '@/components/photos/ForwardFocusView';

export const dynamic = 'force-dynamic';

export default async function ForwardFocusPage() {
  const ctx = await getContext();

  const [photos, latestWeight] = await Promise.all([
    prisma.progressPhoto.findMany({
      where: { userId: ctx.user.id },
      orderBy: { capturedAt: 'desc' },
      take: 300,
    }),
    prisma.weightEntry.findFirst({ where: { userId: ctx.user.id }, orderBy: { loggedAt: 'desc' } }),
  ]);

  return (
    <>
      <PageHeader
        title="Forward Focus"
        subtitle="Progress Photos"
        backHref="/more"
        action={
          photos.length >= 2 ? (
            <Link href="/forward-focus/compare" className="text-xs font-bold text-lime">
              Compare
            </Link>
          ) : null
        }
      />
      <ForwardFocusView
        weightUnit={ctx.prefs.weightUnit}
        nowInput={localDateTimeInputValue(new Date(), ctx.timezone)}
        suggestedWeight={
          latestWeight ? Number(kgToDisplay(latestWeight.weightKg, ctx.prefs.weightUnit).toFixed(1)) : null
        }
        photos={photos.map((p) => ({
          id: p.id,
          angle: p.angle,
          customAngle: p.customAngle,
          visibility: p.visibility,
          isMilestone: p.isMilestone,
          isFavorite: p.isFavorite,
          notes: p.notes,
          when: formatDate(p.capturedAt, ctx.timezone, 'MMM d, yyyy'),
          dateKey: formatDate(p.capturedAt, ctx.timezone, 'yyyy-MM-dd'),
          weight: p.weightKg !== null ? Number(kgToDisplay(p.weightKg, ctx.prefs.weightUnit).toFixed(1)) : null,
        }))}
      />
    </>
  );
}
