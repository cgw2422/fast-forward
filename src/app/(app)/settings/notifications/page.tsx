import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { NotificationSettings } from '@/components/settings/NotificationSettings';
import { getVapidKeys } from '@/lib/runtime-config';

export const dynamic = 'force-dynamic';

export default async function NotificationSettingsPage() {
  const ctx = await getContext();

  const [pref, deviceCount, vapid] = await Promise.all([
    prisma.notificationPreference.upsert({
      where: { userId: ctx.user.id },
      update: {},
      create: { userId: ctx.user.id },
    }),
    prisma.pushSubscription.count({ where: { userId: ctx.user.id } }),
    getVapidKeys(),
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
        vapidPublicKey={vapid.publicKey}
        firstName={ctx.user.name.split(' ')[0]}
      />
    </>
  );
}
