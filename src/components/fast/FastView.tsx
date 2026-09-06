'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Sheet, ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { useElapsed } from '@/components/LiveClock';
import { formatElapsedClock, formatDurationShort, fastDayNumber, weightLabel, type WeightUnit } from '@/lib/units';
import { FAST_COPY, FAST_MILESTONE_HOURS, EMPTY_STATES } from '@/lib/copy';

type ActiveFast = {
  id: string;
  startIso: string;
  targetHours: number | null;
  presetLabel: string | null;
  notes: string | null;
  milestones: { hours: number }[];
};

type Props = {
  activeFast: ActiveFast | null;
  presets: { id: string; label: string; hours: number }[];
  weightUnit: WeightUnit;
  defaultTargetHours: number | null;
  safetyNoticeHours: number;
  nowInput: string;
  timezone: string;
  recent: { id: string; durationMs: number; startIso: string }[];
};

export function FastView(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const elapsed = useElapsed(props.activeFast?.startIso ?? null);

  const [startOpen, setStartOpen] = useState(false);
  const [endOpen, setEndOpen] = useState(false);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const [busy, setBusy] = useState(false);

  // start form
  const [targetHours, setTargetHours] = useState<number | null>(props.defaultTargetHours ?? 18);
  const [presetLabel, setPresetLabel] = useState<string | null>(null);
  const [customHours, setCustomHours] = useState('');
  const [startAt, setStartAt] = useState(props.nowInput);
  const [startWeight, setStartWeight] = useState('');

  // end form
  const [endWeight, setEndWeight] = useState('');
  const [endNotes, setEndNotes] = useState('');

  const targetMs = props.activeFast?.targetHours ? props.activeFast.targetHours * 3_600_000 : null;
  const progress = targetMs ? elapsed / targetMs : 0;
  const isExtended = elapsed >= 86_400_000;
  const pastSafetyThreshold = elapsed >= props.safetyNoticeHours * 3_600_000;

  const nextMilestone = FAST_MILESTONE_HOURS.find((h) => h * 3_600_000 > elapsed) ?? null;

  async function post(body: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch('/api/fast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toast(data.error ?? 'Could not save', 'error');
      return null;
    }
    router.refresh();
    return data;
  }

  async function startFast() {
    const hours = customHours ? Number(customHours) : targetHours;
    const data = await post({
      action: 'start',
      startAt: new Date(startAt).toISOString(),
      targetHours: hours && hours > 0 ? hours : null,
      presetLabel,
      startWeight: startWeight ? Number(startWeight) : undefined,
    });
    if (data) {
      setStartOpen(false);
      toast('Fast started ⏩');
    }
  }

  async function endFast() {
    if (!props.activeFast) return;
    const data = await post({
      action: 'end',
      fastId: props.activeFast.id,
      endWeight: endWeight ? Number(endWeight) : undefined,
      notes: endNotes || undefined,
    });
    if (data) {
      setEndOpen(false);
      setConfirmEnd(false);
      toast(data.message ?? 'Fast completed');
      if (data.offerRefeed) router.push(`/fast/refeed?fastId=${props.activeFast.id}`);
    }
  }

  /* --------------------------------------------------------- no active fast */
  if (!props.activeFast) {
    return (
      <div className="animate-fade-up space-y-4 pt-2">
        <div className="ff-card flex flex-col items-center py-10 text-center">
          <ProgressRing value={0} size={196} stroke={15} color="#667085">
            <div className="text-2xl font-black tracking-tight text-cream/70">Not fasting</div>
            <div className="mt-1 text-xs text-slate">Nothing running right now</div>
          </ProgressRing>
        </div>

        <button onClick={() => setStartOpen(true)} className="ff-btn-primary w-full py-4 text-base">
          Start Fast
        </button>

        <div className="ff-card">
          <div className="ff-label mb-3">Recent fasts</div>
          {props.recent.length === 0 ? (
            <p className="py-2 text-sm text-slate">{EMPTY_STATES.fasts}</p>
          ) : (
            <ul className="divide-y divide-white/[0.05]">
              {props.recent.map((f) => (
                <li key={f.id} className="flex items-center justify-between py-2.5">
                  <span className="text-sm font-semibold text-cream">{formatDurationShort(f.durationMs)}</span>
                  <span className="text-xs text-slate">
                    {new Date(f.startIso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <StartSheet
          open={startOpen}
          onClose={() => setStartOpen(false)}
          presets={props.presets}
          targetHours={targetHours}
          setTargetHours={setTargetHours}
          presetLabel={presetLabel}
          setPresetLabel={setPresetLabel}
          customHours={customHours}
          setCustomHours={setCustomHours}
          startAt={startAt}
          setStartAt={setStartAt}
          startWeight={startWeight}
          setStartWeight={setStartWeight}
          weightUnit={props.weightUnit}
          busy={busy}
          onStart={startFast}
        />
      </div>
    );
  }

  /* ------------------------------------------------------------ active fast */
  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="ff-card flex flex-col items-center py-7">
        <ProgressRing value={targetMs ? progress : 0} size={214} stroke={15} color="#FF655D">
          {isExtended ? <div className="ff-label mb-1 text-lime">Day {fastDayNumber(elapsed)}</div> : <div className="text-lg">🔥</div>}
          <div className="text-[2rem] font-black leading-none tracking-tight tabular-nums text-cream">
            {formatElapsedClock(elapsed)}
          </div>
          {props.activeFast.targetHours ? (
            <>
              <div className="mt-1.5 text-xs font-semibold text-slate">of {props.activeFast.targetHours}h</div>
              <div className="mt-1 text-xs font-bold text-coral">{Math.round(Math.min(1, progress) * 100)}%</div>
            </>
          ) : (
            <div className="mt-1.5 text-xs font-semibold text-slate">No target</div>
          )}
        </ProgressRing>
        <p className="mt-3 text-xs font-semibold text-slate">{FAST_COPY.active}</p>
      </div>

      <div className="space-y-2.5">
        <button onClick={() => setEndOpen(true)} className="ff-btn-secondary w-full py-3.5">
          End Fast
        </button>
        <button onClick={() => router.refresh()} className="ff-btn-primary w-full py-3.5">
          Keep Tracking
        </button>
      </div>

      {nextMilestone ? (
        <div className="ff-card flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-xl bg-midnight text-lg">🚀</span>
          <div className="flex-1">
            <div className="ff-label">Next milestone</div>
            <div className="text-lg font-extrabold text-cream">{nextMilestone} Hours</div>
          </div>
          <span className="text-xs font-semibold text-slate">
            {formatDurationShort(nextMilestone * 3_600_000 - elapsed)} away
          </span>
        </div>
      ) : null}

      {props.activeFast.milestones.length > 0 ? (
        <div className="ff-card">
          <div className="ff-label mb-3">Milestones reached</div>
          <div className="flex flex-wrap gap-2">
            {props.activeFast.milestones.map((m) => (
              <span key={m.hours} className="rounded-full bg-lime/12 px-3 py-1.5 text-xs font-bold text-lime">
                {m.hours}h
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {pastSafetyThreshold ? (
        <div className="rounded-2xl border border-electric/25 bg-electric/[0.07] p-4">
          <div className="ff-label mb-2 text-electric">Health notice</div>
          <p className="text-[13px] leading-relaxed text-cream/85">{FAST_COPY.safety}</p>
        </div>
      ) : null}

      <Sheet open={endOpen} onClose={() => setEndOpen(false)} title="End fast">
        <p className="mb-4 text-sm text-slate">
          {FAST_COPY.completed(formatDurationShort(elapsed))}. Log anything you want to remember.
        </p>
        <label className="ff-label mb-1.5 block">Ending weight ({weightLabel(props.weightUnit)})</label>
        <input
          className="ff-input"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="Optional"
          value={endWeight}
          onChange={(e) => setEndWeight(e.target.value)}
        />
        <label className="ff-label mb-1.5 mt-4 block">Notes</label>
        <textarea
          className="ff-input min-h-[5rem] resize-none"
          placeholder="How did it go?"
          value={endNotes}
          onChange={(e) => setEndNotes(e.target.value)}
        />
        <button
          disabled={busy}
          onClick={() => {
            if (isExtended) setConfirmEnd(true);
            else void endFast();
          }}
          className="ff-btn-primary mt-4 w-full py-3.5"
        >
          End fast
        </button>
        <p className="mt-3 text-center text-xs text-slate">You can end a fast at any time. That&apos;s the point.</p>
      </Sheet>

      <ConfirmDialog
        open={confirmEnd}
        title="End this fast?"
        body={`${formatDurationShort(elapsed)} will be recorded as completed. Ending an extended fast is worth taking slowly — you'll be offered a refeeding log next.`}
        confirmLabel="End fast"
        onCancel={() => setConfirmEnd(false)}
        onConfirm={endFast}
      />

      <StartSheet
        open={startOpen}
        onClose={() => setStartOpen(false)}
        presets={props.presets}
        targetHours={targetHours}
        setTargetHours={setTargetHours}
        presetLabel={presetLabel}
        setPresetLabel={setPresetLabel}
        customHours={customHours}
        setCustomHours={setCustomHours}
        startAt={startAt}
        setStartAt={setStartAt}
        startWeight={startWeight}
        setStartWeight={setStartWeight}
        weightUnit={props.weightUnit}
        busy={busy}
        onStart={startFast}
      />
    </div>
  );
}

function StartSheet({
  open,
  onClose,
  presets,
  targetHours,
  setTargetHours,
  presetLabel,
  setPresetLabel,
  customHours,
  setCustomHours,
  startAt,
  setStartAt,
  startWeight,
  setStartWeight,
  weightUnit,
  busy,
  onStart,
}: {
  open: boolean;
  onClose: () => void;
  presets: { id: string; label: string; hours: number }[];
  targetHours: number | null;
  setTargetHours: (v: number | null) => void;
  presetLabel: string | null;
  setPresetLabel: (v: string | null) => void;
  customHours: string;
  setCustomHours: (v: string) => void;
  startAt: string;
  setStartAt: (v: string) => void;
  startWeight: string;
  setStartWeight: (v: string) => void;
  weightUnit: WeightUnit;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <Sheet open={open} onClose={onClose} title="Start a fast">
      <label className="ff-label mb-2 block">Target</label>
      <div className="grid grid-cols-3 gap-2">
        {presets.map((preset) => {
          const active = presetLabel === preset.label && !customHours;
          return (
            <button
              key={preset.id}
              onClick={() => {
                setPresetLabel(preset.label);
                setTargetHours(preset.hours);
                setCustomHours('');
              }}
              className={`rounded-xl border py-2.5 text-xs font-bold transition ${
                active ? 'border-lime bg-lime text-midnight' : 'border-white/10 bg-midnight text-cream'
              }`}
            >
              {preset.label}
            </button>
          );
        })}
        <button
          onClick={() => {
            setPresetLabel(null);
            setTargetHours(null);
            setCustomHours('');
          }}
          className={`rounded-xl border py-2.5 text-xs font-bold transition ${
            targetHours === null && !customHours
              ? 'border-lime bg-lime text-midnight'
              : 'border-white/10 bg-midnight text-cream'
          }`}
        >
          No target
        </button>
      </div>

      <label className="ff-label mb-1.5 mt-4 block">Custom hours</label>
      <input
        className="ff-input"
        type="number"
        inputMode="decimal"
        step="any"
        placeholder="e.g. 72"
        value={customHours}
        onChange={(e) => {
          setCustomHours(e.target.value);
          setPresetLabel(null);
        }}
      />

      <label className="ff-label mb-1.5 mt-4 block">Start time</label>
      <input
        className="ff-input"
        type="datetime-local"
        value={startAt}
        onChange={(e) => setStartAt(e.target.value)}
      />
      <p className="mt-1.5 text-xs text-slate">Backdate this if you already started.</p>

      <label className="ff-label mb-1.5 mt-4 block">Starting weight ({weightLabel(weightUnit)})</label>
      <input
        className="ff-input"
        type="number"
        inputMode="decimal"
        step="any"
        placeholder="Optional"
        value={startWeight}
        onChange={(e) => setStartWeight(e.target.value)}
      />

      <button disabled={busy} onClick={onStart} className="ff-btn-primary mt-5 w-full py-3.5">
        Start Fast
      </button>
    </Sheet>
  );
}
