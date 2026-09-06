import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { ContainerSettings } from '@/components/settings/ContainerSettings';
import { mlToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function ContainerSettingsPage() {
  const ctx = await getContext();
  const presets = await prisma.waterPreset.findMany({
    where: { userId: ctx.user.id },
    orderBy: { sortOrder: 'asc' },
  });

  return (
    <>
      <PageHeader title="Water Containers" subtitle="Your quick-add buttons." backHref="/more" />
      <ContainerSettings
        volumeUnit={ctx.prefs.volumeUnit}
        presets={presets.map((p) => ({
          id: p.id,
          label: p.label,
          amount: Number(mlToDisplay(p.volumeMl, ctx.prefs.volumeUnit).toFixed(1)),
          icon: p.icon,
        }))}
      />
    </>
  );
}
