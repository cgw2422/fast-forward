import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { dayRange, formatTime } from '@/lib/dates';
import { computeWaterState } from '@/lib/reminders';
import { PageHeader } from '@/components/PageHeader';
import { HydrationView } from '@/components/hydration/HydrationView';

export const dynamic = 'force-dynamic';

export default async function HydrationPage() {
  const ctx = await getContext();
  const now = new Date();
  const { start, end } = dayRange(now, ctx.timezone);

  const [presets, entries, notifPref] = await Promise.all([
    prisma.waterPreset.findMany({ where: { userId: ctx.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.waterEntry.findMany({
      where: { userId: ctx.user.id, loggedAt: { gte: start, lt: end } },
      orderBy: { loggedAt: 'desc' },
    }),
    prisma.notificationPreference.findUnique({ where: { userId: ctx.user.id } }),
  ]);

  const totalMl = entries.reduce((sum, e) => sum + e.volumeMl, 0);
  const state = notifPref
    ? await computeWaterState(
        ctx.user.id,
        ctx.timezone,
        ctx.prefs.dailyWaterMl,
        notifPref.waterIntervalMinutes,
        notifPref.waterWindowStart,
        now
      )
    : null;

  const remindersOn = Boolean(notifPref?.enabled && notifPref.waterEnabled);
  const stopped = Boolean(notifPref?.waterStopAfterGoal && state?.goalReached);

  return (
    <>
      <PageHeader
        title="Hydration Station"
        subtitle="Fuel the good stuff."
        backHref="/today"
        action={
          <Link href="/settings/hydration" aria-label="Hydration settings" className="p-1 text-slate">
            <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6 1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </Link>
        }
      />
      <HydrationView
        totalMl={totalMl}
        goalMl={ctx.prefs.dailyWaterMl}
        volumeUnit={ctx.prefs.volumeUnit}
        presets={presets.map((p) => ({ id: p.id, label: p.label, volumeMl: p.volumeMl, icon: p.icon }))}
        entries={entries.map((e) => ({
          id: e.id,
          volumeMl: e.volumeMl,
          time: formatTime(e.loggedAt, ctx.timezone, ctx.prefs.use24Hour),
        }))}
        lastWaterLabel={
          state?.lastAt ? formatTime(state.lastAt, ctx.timezone, ctx.prefs.use24Hour) : null
        }
        nextReminderLabel={
          remindersOn && !stopped && state?.nextReminderAt
            ? formatTime(state.nextReminderAt, ctx.timezone, ctx.prefs.use24Hour)
            : stopped
              ? 'Goal reached'
              : remindersOn
                ? null
                : 'Off'
        }
      />
    </>
  );
}
