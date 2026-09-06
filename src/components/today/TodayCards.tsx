'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { ProgressBar } from '@/components/ui/ProgressRing';
import { FastClock } from '@/components/LiveClock';
import { formatVolume, formatWeight, formatDistance, weightLabel } from '@/lib/units';
import type { VolumeUnit, WeightUnit, DistanceUnit } from '@/lib/units';
import { POP_COPY, MOVE_COPY } from '@/lib/copy';
import { useToast } from '@/components/ui/Toast';
import { PopGoblin } from '@/components/PopGoblin';

type Snapshot = {
  fast: { id: string; startIso: string; targetHours: number | null; presetLabel: string | null } | null;
  popStreakDays: number;
  popStartIso: string | null;
  water: { totalMl: number; goalMl: number; progress: number; lastAt: Date | string | null };
  walk: {
    minutes: number;
    goalMinutes: number;
    tinyMinutes: number;
    meters: number;
    steps: number;
    stepGoal: number;
    progress: number;
  };
  weight: { current: number | null; trend: number | null; change: number | null; compareDays: number };
  electrolyteCount: number;
  habits: { id: string; name: string; identityStatement: string | null; status: string | null }[];
  votesCast: number;
  votesTotal: number;
  hasCheckIn: boolean;
};

type Prefs = { volumeUnit: VolumeUnit; weightUnit: WeightUnit; distanceUnit: DistanceUnit; use24Hour: boolean };

type Modules = {
  fasting: boolean;
  water: boolean;
  walking: boolean;
  steps: boolean;
  weight: boolean;
  popPact: boolean;
  habits: boolean;
  checkIn: boolean;
  electrolytes: boolean;
};

function Chevron() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="shrink-0 text-slate">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

function StatCard({
  href,
  label,
  accent,
  icon,
  children,
  progress,
  progressColor,
}: {
  href: string;
  label: string;
  accent: string;
  icon: string;
  children: React.ReactNode;
  progress?: number;
  progressColor?: string;
}) {
  return (
    <Link href={href} className="ff-card ff-pressable block">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-midnight text-lg">{icon}</span>
        <div className="min-w-0 flex-1">
          <div className="ff-label" style={{ color: accent }}>
            {label}
          </div>
          {children}
        </div>
        <Chevron />
      </div>
      {progress !== undefined ? (
        <ProgressBar value={progress} color={progressColor ?? accent} className="mt-3" />
      ) : null}
    </Link>
  );
}

export function TodayCards({
  snapshot,
  prefs,
  modules,
  lastWaterLabel,
}: {
  snapshot: Snapshot;
  prefs: Prefs;
  modules: Modules;
  lastWaterLabel: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busyHabit, setBusyHabit] = useState<string | null>(null);

  const fastTargetProgress =
    snapshot.fast && snapshot.fast.targetHours
      ? (Date.now() - new Date(snapshot.fast.startIso).getTime()) / (snapshot.fast.targetHours * 3_600_000)
      : 0;

  async function toggleHabit(habitId: string, current: string | null) {
    setBusyHabit(habitId);
    const next = current === 'DONE' ? null : 'DONE';
    const response = await fetch('/api/habits/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId, status: next }),
    });
    setBusyHabit(null);
    if (response.ok) {
      const data = await response.json().catch(() => ({}));
      if (data.achievement) toast(`🏆 ${data.achievement}`);
      else if (next) toast('Vote cast. ⏩');
      router.refresh();
    } else {
      toast('Could not save that', 'error');
    }
  }

  return (
    <div className="space-y-3">
      {/* ---------------------------------------------------------- fasting */}
      {modules.fasting ? (
        snapshot.fast ? (
          <Link href="/fast" className="ff-card ff-pressable block">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-midnight text-lg">🏃</span>
              <div className="min-w-0 flex-1">
                <div className="ff-label text-lime">The Fast Lane</div>
                <FastClock startIso={snapshot.fast.startIso} className="ff-metric" />
                {snapshot.fast.targetHours ? (
                  <p className="mt-0.5 text-xs text-slate">
                    {Math.round(Math.min(1, fastTargetProgress) * 100)}% of {snapshot.fast.targetHours}h target
                  </p>
                ) : (
                  <p className="mt-0.5 text-xs text-slate">No target — tracking only</p>
                )}
              </div>
              <Chevron />
            </div>
            {snapshot.fast.targetHours ? (
              <ProgressBar value={fastTargetProgress} color="#FF655D" className="mt-3" />
            ) : null}
          </Link>
        ) : (
          <StatCard href="/fast" label="The Fast Lane" accent="#C7F43D" icon="🏃">
            <div className="ff-metric text-cream/70">Not fasting</div>
            <p className="mt-0.5 text-xs text-slate">Tap to start a fast</p>
          </StatCard>
        )
      ) : null}

      {/* --------------------------------------------------------- pop pact */}
      {modules.popPact ? (
        <Link href="/pop-pact" className="ff-card ff-pressable block">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <div className="ff-label text-coral">The Pop Pact</div>
              <div className="ff-metric">
                {snapshot.popStreakDays} day{snapshot.popStreakDays === 1 ? '' : 's'} pop-free
              </div>
              <p className="mt-0.5 text-xs text-slate">{POP_COPY.keepingPromise}</p>
            </div>
            <PopGoblin size={54} mood="smug" />
          </div>
        </Link>
      ) : null}

      {/* -------------------------------------------------------- hydration */}
      {modules.water ? (
        <StatCard
          href="/hydration"
          label="Hydration Station"
          accent="#4D8DFF"
          icon="💧"
          progress={snapshot.water.progress}
        >
          <div className="ff-metric">
            {formatVolume(snapshot.water.totalMl, prefs.volumeUnit, false)}
            <span className="text-base font-bold text-slate">
              {' '}
              / {formatVolume(snapshot.water.goalMl, prefs.volumeUnit)}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-slate">
            {lastWaterLabel ? `Last water ${lastWaterLabel}` : 'Nothing logged yet today'}
          </p>
        </StatCard>
      ) : null}

      {/* ---------------------------------------------------------- walking */}
      {modules.walking ? (
        <StatCard
          href="/move"
          label="Walk This Weigh"
          accent="#3DDC97"
          icon="🚶"
          progress={snapshot.walk.progress}
        >
          <div className="ff-metric">
            {snapshot.walk.minutes}
            <span className="text-base font-bold text-slate"> / {snapshot.walk.goalMinutes} min</span>
          </div>
          <p className="mt-0.5 text-xs text-slate">
            {snapshot.walk.meters > 0 ? `${formatDistance(snapshot.walk.meters, prefs.distanceUnit)} · ` : ''}
            {modules.steps && snapshot.walk.steps > 0
              ? `${snapshot.walk.steps.toLocaleString()} steps`
              : snapshot.walk.minutes === 0
                ? MOVE_COPY.motto
                : 'Keep it moving'}
          </p>
        </StatCard>
      ) : null}

      {/* ----------------------------------------------------------- weight */}
      {modules.weight ? (
        <StatCard href="/weight" label="Weight" accent="#C7F43D" icon="⚖️">
          {snapshot.weight.current !== null ? (
            <>
              <div className="ff-metric">{formatWeight(snapshot.weight.current, prefs.weightUnit)}</div>
              <p className="mt-0.5 text-xs text-slate">
                {snapshot.weight.trend !== null
                  ? `Trend ${formatWeight(snapshot.weight.trend, prefs.weightUnit)}`
                  : ''}
                {snapshot.weight.change !== null ? (
                  <span className={snapshot.weight.change <= 0 ? 'text-mint' : 'text-slate'}>
                    {' · '}
                    {snapshot.weight.change > 0 ? '+' : ''}
                    {(
                      snapshot.weight.change * (prefs.weightUnit === 'LB' ? 2.2046226218 : 1)
                    ).toFixed(1)}{' '}
                    {weightLabel(prefs.weightUnit)} / {snapshot.weight.compareDays}d
                  </span>
                ) : null}
              </p>
            </>
          ) : (
            <>
              <div className="ff-metric text-cream/70">—</div>
              <p className="mt-0.5 text-xs text-slate">Log your first weigh-in</p>
            </>
          )}
        </StatCard>
      ) : null}

      {/* ------------------------------------------------------ today's votes */}
      {modules.habits && snapshot.habits.length > 0 ? (
        <div className="ff-card">
          <div className="mb-3 flex items-center justify-between">
            <div className="ff-label text-lime">Today&apos;s Votes</div>
            <span className="text-xs font-bold text-slate">
              {snapshot.votesCast} of {snapshot.votesTotal}
            </span>
          </div>
          <ul className="space-y-1">
            {snapshot.habits.map((habit) => {
              const done = habit.status === 'DONE' || habit.status === 'TINY';
              return (
                <li key={habit.id}>
                  <button
                    onClick={() => toggleHabit(habit.id, habit.status)}
                    disabled={busyHabit === habit.id}
                    className="flex w-full items-center gap-3 rounded-xl px-1 py-2 text-left transition active:scale-[0.99] disabled:opacity-60"
                  >
                    <span
                      className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border-2 transition ${
                        done ? 'border-mint bg-mint text-midnight' : 'border-white/15 text-transparent'
                      }`}
                    >
                      <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className={`block text-sm font-semibold ${done ? 'text-cream' : 'text-cream/85'}`}>
                        {habit.name}
                        {habit.status === 'TINY' ? <span className="ml-2 text-[10px] font-bold text-lime">TINY WIN</span> : null}
                      </span>
                      {habit.identityStatement ? (
                        <span className="block truncate text-[11px] text-slate">{habit.identityStatement}</span>
                      ) : null}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          <p className="mt-3 border-t border-white/[0.06] pt-3 text-xs text-slate">
            {snapshot.votesCast} of {snapshot.votesTotal} votes cast today.
          </p>
        </div>
      ) : null}

      {/* ------------------------------------------------------ quick links */}
      <div className="grid grid-cols-2 gap-3 pt-1">
        {modules.electrolytes ? (
          <Link href="/electrolytes" className="ff-card ff-pressable flex items-center gap-2 py-3">
            <span className="text-lg">⚡</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-cream">Electrolytes</div>
              <div className="text-[11px] text-slate">
                {snapshot.electrolyteCount > 0 ? `${snapshot.electrolyteCount} logged` : 'Not logged'}
              </div>
            </div>
          </Link>
        ) : null}
        {modules.checkIn ? (
          <Link href="/check-in" className="ff-card ff-pressable flex items-center gap-2 py-3">
            <span className="text-lg">📝</span>
            <div className="min-w-0">
              <div className="text-sm font-bold text-cream">Check-In</div>
              <div className="text-[11px] text-slate">{snapshot.hasCheckIn ? 'Done' : 'How was today?'}</div>
            </div>
          </Link>
        ) : null}
        <Link href="/timeline" className="ff-card ff-pressable col-span-2 flex items-center justify-between py-3">
          <span className="flex items-center gap-2">
            <span className="text-lg">📋</span>
            <span className="text-sm font-bold text-cream">Today&apos;s Timeline</span>
          </span>
          <Chevron />
        </Link>
      </div>
    </div>
  );
}
