'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { formatDistance, distanceLabel, metersToDisplay, type DistanceUnit } from '@/lib/units';
import { MOVE_COPY, EMPTY_STATES } from '@/lib/copy';

type Bucket = { label: string; minutes: number; meters: number; isToday: boolean };

export function MoveView({
  minutes,
  goalMinutes,
  tinyMinutes,
  meters,
  weekMiles,
  week,
  distanceUnit,
  stepsEnabled,
  stepsToday,
  stepGoal,
  entries,
}: {
  minutes: number;
  goalMinutes: number;
  tinyMinutes: number;
  meters: number;
  weekMiles: number;
  week: Bucket[];
  distanceUnit: DistanceUnit;
  stepsEnabled: boolean;
  stepsToday: number;
  stepGoal: number;
  entries: { id: string; minutes: number; meters: number | null; time: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ minutes: '', distance: '', steps: '' });
  const [stepsOpen, setStepsOpen] = useState(false);
  const [stepsDraft, setStepsDraft] = useState(stepsToday ? String(stepsToday) : '');
  const [busy, setBusy] = useState(false);

  const progress = goalMinutes > 0 ? minutes / goalMinutes : 0;
  const maxWeekMinutes = Math.max(goalMinutes, ...week.map((b) => b.minutes), 1);
  const showTinyWin = minutes < goalMinutes;

  async function logWalk(overrideMinutes?: number) {
    const value = overrideMinutes ?? Number(form.minutes);
    if (!value || value <= 0) {
      toast('Enter how many minutes', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/walk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        minutes: Math.round(value),
        distance: form.distance ? Number(form.distance) : undefined,
        steps: form.steps ? Number(form.steps) : undefined,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      toast(data.error ?? 'Could not log that', 'error');
      return;
    }
    toast(data.achievement ? `🏆 ${data.achievement}` : `+${Math.round(value)} min`);
    setForm({ minutes: '', distance: '', steps: '' });
    setOpen(false);
    router.refresh();
  }

  async function saveSteps() {
    setBusy(true);
    const response = await fetch('/api/walk', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ steps: Number(stepsDraft) || 0 }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Steps saved');
      setStepsOpen(false);
      router.refresh();
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/walk?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="flex justify-center py-1">
        <ProgressRing value={progress} size={210} stroke={15} color="#3DDC97">
          <div className="text-lg">🚶</div>
          <div className="text-[2.2rem] font-black leading-none tracking-tight text-cream">
            {minutes}
            <span className="text-lg"> min</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate">of {goalMinutes} min</div>
          <div className="mt-1 text-xs font-bold text-mint">{Math.round(Math.min(1, progress) * 100)}%</div>
        </ProgressRing>
      </div>

      <button onClick={() => setOpen(true)} className="ff-btn-primary w-full py-4 text-base">
        Log Walk
      </button>

      {showTinyWin ? (
        <button
          onClick={() => logWalk(tinyMinutes)}
          disabled={busy}
          className="ff-btn-secondary w-full py-3 text-[13px]"
        >
          ⚡ Log the Tiny Win — {tinyMinutes} min
        </button>
      ) : null}

      <p className="text-center text-xs font-semibold text-slate">
        &ldquo;{MOVE_COPY.motto}&rdquo; <span className="block pt-1 text-[10px] tracking-widest">— FAST FORWARD</span>
      </p>

      <div className="ff-card">
        <div className="mb-3 flex items-baseline justify-between">
          <div className="ff-label">This week</div>
          <div className="text-xl font-extrabold text-cream">
            {weekMiles.toFixed(1)} <span className="text-xs text-slate">{distanceLabel(distanceUnit)}</span>
          </div>
        </div>
        <div className="flex h-24 items-end justify-between gap-1.5">
          {week.map((bucket, index) => (
            <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end">
                <div
                  className={`w-full rounded-t-md transition-all ${bucket.isToday ? 'bg-lime' : 'bg-mint/45'}`}
                  style={{ height: `${Math.max(3, (bucket.minutes / maxWeekMinutes) * 100)}%` }}
                  title={`${bucket.minutes} min`}
                />
              </div>
              <span className={`text-[10px] font-bold ${bucket.isToday ? 'text-lime' : 'text-slate'}`}>
                {bucket.label}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="ff-card py-3">
          <div className="ff-label">Distance today</div>
          <div className="mt-1 text-xl font-extrabold text-cream">
            {meters > 0 ? formatDistance(meters, distanceUnit) : '—'}
          </div>
        </div>
        {stepsEnabled ? (
          <button onClick={() => setStepsOpen(true)} className="ff-card ff-pressable py-3 text-left">
            <div className="ff-label">Steps today</div>
            <div className="mt-1 text-xl font-extrabold text-cream">
              {stepsToday > 0 ? stepsToday.toLocaleString() : '—'}
            </div>
            <div className="mt-0.5 text-[10px] text-slate">Goal {stepGoal.toLocaleString()}</div>
          </button>
        ) : (
          <div className="ff-card py-3">
            <div className="ff-label">Goal</div>
            <div className="mt-1 text-xl font-extrabold text-cream">{goalMinutes} min</div>
          </div>
        )}
      </div>

      <div className="ff-card">
        <div className="ff-label mb-3">Today&apos;s walks</div>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-slate">{EMPTY_STATES.walks}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <span className="text-base">🚶</span>
                <span className="flex-1 text-sm font-semibold text-cream">
                  {entry.minutes} min
                  {entry.meters ? (
                    <span className="font-normal text-slate"> · {formatDistance(entry.meters, distanceUnit)}</span>
                  ) : null}
                </span>
                <span className="text-xs text-slate">{entry.time}</span>
                <button
                  onClick={() => remove(entry.id)}
                  aria-label="Delete walk"
                  className="p-1 text-slate transition hover:text-coral"
                >
                  <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Sheet open={open} onClose={() => setOpen(false)} title="Log a walk">
        <label className="ff-label mb-1.5 block">Minutes</label>
        <input
          className="ff-input text-2xl font-extrabold"
          type="number"
          inputMode="numeric"
          placeholder="30"
          value={form.minutes}
          onChange={(e) => setForm({ ...form, minutes: e.target.value })}
          autoFocus
        />
        <div className="mt-3 grid grid-cols-2 gap-3">
          <div>
            <label className="ff-label mb-1.5 block">Distance ({distanceLabel(distanceUnit)})</label>
            <input
              className="ff-input"
              type="number"
              inputMode="decimal"
              step="any"
              placeholder="Optional"
              value={form.distance}
              onChange={(e) => setForm({ ...form, distance: e.target.value })}
            />
          </div>
          <div>
            <label className="ff-label mb-1.5 block">Steps</label>
            <input
              className="ff-input"
              type="number"
              inputMode="numeric"
              placeholder="Optional"
              value={form.steps}
              onChange={(e) => setForm({ ...form, steps: e.target.value })}
            />
          </div>
        </div>
        <button disabled={busy} onClick={() => logWalk()} className="ff-btn-primary mt-5 w-full py-3.5">
          Save walk
        </button>
        <button
          onClick={() => logWalk(tinyMinutes)}
          disabled={busy}
          className="ff-btn-ghost mt-1 w-full text-xs"
        >
          Just log the {tinyMinutes}-minute Tiny Win
        </button>
      </Sheet>

      <Sheet open={stepsOpen} onClose={() => setStepsOpen(false)} title="Steps today">
        <input
          className="ff-input text-2xl font-extrabold"
          type="number"
          inputMode="numeric"
          placeholder="0"
          value={stepsDraft}
          onChange={(e) => setStepsDraft(e.target.value)}
          autoFocus
        />
        <p className="mt-2 text-xs text-slate">Enter your total for the day — this replaces the current number.</p>
        <button disabled={busy} onClick={saveSteps} className="ff-btn-primary mt-4 w-full py-3.5">
          Save steps
        </button>
      </Sheet>
    </div>
  );
}
