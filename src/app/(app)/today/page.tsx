import { Suspense } from 'react';
import { getContext, moduleOn } from '@/lib/context';
import { getTodaySnapshot } from '@/lib/queries';
import { greeting, formatDate, formatTime } from '@/lib/dates';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { TodayCards } from '@/components/today/TodayCards';
import { WeekStrip } from '@/components/today/WeekStrip';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function TodayPage() {
  return (
    <Suspense fallback={<TodayFallback />}>
      <TodayContent />
    </Suspense>
  );
}

function TodayFallback() {
  return (
    <div className="pt-8">
      <div className="ff-skeleton mb-6 h-10 w-56" />
      <DashboardSkeleton />
    </div>
  );
}

async function TodayContent() {
  const ctx = await getContext();
  const snapshot = await getTodaySnapshot(ctx);
  const now = new Date();
  const firstName = ctx.user.name.split(' ')[0];

  return (
    <div className="animate-fade-up">
      <header className="flex items-start justify-between pb-3 pt-6 safe-top">
        <div>
          <h1 className="text-[26px] font-extrabold leading-tight tracking-tight text-cream">
            {greeting(now, ctx.timezone)}, {firstName}.
          </h1>
          <p className="mt-1 text-sm font-semibold text-slate">
            Let&apos;s move this thing forward. <span className="text-lime">⏩</span>
          </p>
        </div>
        <Link
          href="/settings/profile"
          aria-label="Profile"
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/10 bg-raised text-sm font-bold text-lime"
        >
          {firstName.slice(0, 1).toUpperCase()}
        </Link>
      </header>

      <p className="ff-label mb-3">{formatDate(now, ctx.timezone).toUpperCase()}</p>

      <WeekStrip timezone={ctx.timezone} />

      <TodayCards
        snapshot={serialize(snapshot)}
        prefs={{
          volumeUnit: ctx.prefs.volumeUnit,
          weightUnit: ctx.prefs.weightUnit,
          distanceUnit: ctx.prefs.distanceUnit,
          use24Hour: ctx.prefs.use24Hour,
        }}
        modules={{
          fasting: moduleOn(ctx, 'FASTING'),
          water: moduleOn(ctx, 'WATER'),
          walking: moduleOn(ctx, 'WALKING'),
          steps: moduleOn(ctx, 'STEPS'),
          weight: moduleOn(ctx, 'WEIGHT'),
          popPact: moduleOn(ctx, 'POP_PACT'),
          habits: moduleOn(ctx, 'HABITS'),
          checkIn: moduleOn(ctx, 'DAILY_CHECKIN'),
          electrolytes: moduleOn(ctx, 'ELECTROLYTES'),
        }}
        lastWaterLabel={
          snapshot.water.lastAt ? formatTime(snapshot.water.lastAt, ctx.timezone, ctx.prefs.use24Hour) : null
        }
      />
    </div>
  );
}

/** Dates cross the server/client boundary as ISO strings. */
function serialize(snapshot: Awaited<ReturnType<typeof getTodaySnapshot>>) {
  return {
    fast: snapshot.activeFast
      ? {
          id: snapshot.activeFast.id,
          startIso: snapshot.activeFast.startAt.toISOString(),
          targetHours: snapshot.activeFast.targetHours,
          presetLabel: snapshot.activeFast.presetLabel,
        }
      : null,
    popStreakDays: snapshot.popStreakDays,
    popStartIso: snapshot.popPact ? snapshot.popPact.startDate.toISOString() : null,
    water: snapshot.water,
    walk: snapshot.walk,
    weight: snapshot.weight,
    electrolyteCount: snapshot.electrolyteCount,
    habits: snapshot.habits,
    votesCast: snapshot.votesCast,
    votesTotal: snapshot.votesTotal,
    hasCheckIn: Boolean(snapshot.checkIn),
  };
}
