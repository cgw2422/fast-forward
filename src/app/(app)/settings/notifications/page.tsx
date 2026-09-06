import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { NotificationSettings } from '@/components/settings/NotificationSettings';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const ctx = await getContext();

  const [pref, deviceCount] = await Promise.all([
    prisma.notificationPreference.upsert({
      where: { userId: ctx.user.id },
      update: {},
      create: { userId: ctx.user.id },
    }),
    prisma.pushSubscription.count({ where: { userId: ctx.user.id } }),
  ]);

  return (
    <>
      <PageHeader title="Notifications" subtitle="Stay on track, without the annoying." backHref="/more" />
      <NotificationSettings
        initial={{
          enabled: pref.enabled,
          nagLevel: pref.nagLevel,
          personality: pref.personality,
          quietStart: pref.quietStart,
          quietEnd: pref.quietEnd,
          waterEnabled: pref.waterEnabled,
          waterIntervalMinutes: pref.waterIntervalMinutes,
          waterWindowStart: pref.waterWindowStart,
          waterWindowEnd: pref.waterWindowEnd,
          waterIdleMinutes: pref.waterIdleMinutes,
          waterStopAfterGoal: pref.waterStopAfterGoal,
          popEnabled: pref.popEnabled,
          popTime: pref.popTime,
          moveEnabled: pref.moveEnabled,
          moveTime: pref.moveTime,
          fastMilestonesEnabled: pref.fastMilestonesEnabled,
          habitStackEnabled: pref.habitStackEnabled,
          eveningCheckEnabled: pref.eveningCheckEnabled,
          eveningCheckTime: pref.eveningCheckTime,
        }}
        deviceCount={deviceCount}
        vapidPublicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? ''}
        firstName={ctx.user.name.split(' ')[0]}
      />
    </>
  );
}
