import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { formatDate } from '@/lib/dates';
import { kgToDisplay } from '@/lib/units';
import { PageHeader } from '@/components/PageHeader';
import { CompareView } from '@/components/photos/CompareView';

export const dynamic = 'force-dynamic';

export default async function ComparePage() {
  const ctx = await getContext();

  const photos = await prisma.progressPhoto.findMany({
    where: { userId: ctx.user.id },
    orderBy: { capturedAt: 'asc' },
    take: 300,
  });

  return (
    <>
      <PageHeader title="Before / After" subtitle="Forward Focus" backHref="/forward-focus" />
      <CompareView
        weightUnit={ctx.prefs.weightUnit}
        photos={photos.map((p) => ({
          id: p.id,
          angle: p.angle,
          when: formatDate(p.capturedAt, ctx.timezone, 'MMM d, yyyy'),
          timestamp: p.capturedAt.getTime(),
          weight: p.weightKg !== null ? Number(kgToDisplay(p.weightKg, ctx.prefs.weightUnit).toFixed(1)) : null,
        }))}
      />
    </>
  );
}
