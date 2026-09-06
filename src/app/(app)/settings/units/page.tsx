import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { UnitSettings } from '@/components/settings/UnitSettings';

export const dynamic = 'force-dynamic';

export default async function UnitSettingsPage() {
  const ctx = await getContext();
  return (
    <>
      <PageHeader title="Units & Appearance" backHref="/more" />
      <UnitSettings
        weightUnit={ctx.prefs.weightUnit}
        volumeUnit={ctx.prefs.volumeUnit}
        distanceUnit={ctx.prefs.distanceUnit}
        use24Hour={ctx.prefs.use24Hour}
      />
    </>
  );
}
