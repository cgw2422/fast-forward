import { prisma } from '@/lib/prisma';
import { getContext, DEFAULT_MODULES } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { TrackingSettings } from '@/components/settings/TrackingSettings';

export const dynamic = 'force-dynamic';

export default async function TrackingSettingsPage() {
  const ctx = await getContext();
  const settings = await prisma.moduleSetting.findMany({ where: { userId: ctx.user.id } });
  const enabled = new Map(settings.map((s) => [s.module, s.enabled]));

  return (
    <>
      <PageHeader title="Tracking" subtitle="Turn off what you don't use." backHref="/more" />
      <TrackingSettings
        modules={DEFAULT_MODULES.map((m) => ({
          module: m.module,
          label: m.label,
          group: m.group,
          enabled: enabled.get(m.module) ?? m.enabled,
        }))}
      />
    </>
  );
}
