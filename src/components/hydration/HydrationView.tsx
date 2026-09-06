'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ProgressRing } from '@/components/ui/ProgressRing';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { formatVolume, mlToDisplay, volumeLabel, type VolumeUnit } from '@/lib/units';
import { EMPTY_STATES } from '@/lib/copy';

type Preset = { id: string; label: string; volumeMl: number; icon: string | null };
type Entry = { id: string; volumeMl: number; time: string };

export function HydrationView({
  totalMl,
  goalMl,
  volumeUnit,
  presets,
  entries,
  lastWaterLabel,
  nextReminderLabel,
}: {
  totalMl: number;
  goalMl: number;
  volumeUnit: VolumeUnit;
  presets: Preset[];
  entries: Entry[];
  lastWaterLabel: string | null;
  nextReminderLabel: string | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [customOpen, setCustomOpen] = useState(false);
  const [customAmount, setCustomAmount] = useState('');
  const [busy, setBusy] = useState(false);

  const progress = goalMl > 0 ? totalMl / goalMl : 0;
  const pct = Math.round(Math.min(1, progress) * 100);

  async function logWater(payload: Record<string, unknown>) {
    setBusy(true);
    const response = await fetch('/api/water', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);

    if (!response.ok) {
      toast(data.error ?? 'Could not log that', 'error');
      return false;
    }
    toast(data.achievement ? `🏆 ${data.achievement}` : (data.message ?? 'Logged'));
    router.refresh();
    return true;
  }

  async function removeEntry(id: string) {
    const response = await fetch(`/api/water?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="flex justify-center py-2">
        <ProgressRing value={progress} size={218} stroke={16} color="#4D8DFF">
          <div className="text-[11px]">💧</div>
          <div className="text-[2.4rem] font-black leading-none tracking-tight text-cream">
            {formatVolume(totalMl, volumeUnit, false)}
            <span className="text-lg"> {volumeLabel(volumeUnit)}</span>
          </div>
          <div className="mt-1 text-xs font-semibold text-slate">of {formatVolume(goalMl, volumeUnit)}</div>
          <div className="mt-1 text-xs font-bold text-electric">{pct}%</div>
        </ProgressRing>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {presets.map((preset) => (
          <button
            key={preset.id}
            disabled={busy}
            onClick={() => logWater({ presetId: preset.id })}
            className="ff-btn-secondary py-3.5 text-[13px]"
          >
            <span>{preset.icon ?? '💧'}</span>
            <span className="truncate">+ {preset.label}</span>
          </button>
        ))}
        <button onClick={() => setCustomOpen(true)} className="ff-btn-secondary col-span-2 py-3 text-[13px]">
          + Custom amount
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="ff-card py-3">
          <div className="ff-label">Last water</div>
          <div className="mt-1 text-lg font-extrabold text-cream">{lastWaterLabel ?? '—'}</div>
        </div>
        <div className="ff-card py-3">
          <div className="ff-label">Next reminder</div>
          <div className="mt-1 text-lg font-extrabold text-cream">{nextReminderLabel ?? '—'}</div>
        </div>
      </div>

      <div className="ff-card">
        <div className="ff-label mb-3">Today&apos;s entries</div>
        {entries.length === 0 ? (
          <p className="py-3 text-sm text-slate">{EMPTY_STATES.water}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <span className="text-base">💧</span>
                <span className="flex-1 text-sm font-semibold text-cream">
                  {formatVolume(entry.volumeMl, volumeUnit)}
                </span>
                <span className="text-xs text-slate">{entry.time}</span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Delete entry"
                  className="ml-1 p-1 text-slate transition hover:text-coral"
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

      <Sheet open={customOpen} onClose={() => setCustomOpen(false)} title="Custom amount">
        <div className="flex items-center gap-2">
          <input
            className="ff-input flex-1 text-2xl font-extrabold"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={customAmount}
            onChange={(e) => setCustomAmount(e.target.value)}
            autoFocus
          />
          <span className="text-lg font-bold text-slate">{volumeLabel(volumeUnit)}</span>
        </div>
        <button
          disabled={busy || !customAmount}
          onClick={async () => {
            const amount = Number(customAmount);
            if (!amount || amount <= 0) return;
            if (await logWater({ amount, unit: volumeUnit })) {
              setCustomAmount('');
              setCustomOpen(false);
            }
          }}
          className="ff-btn-primary mt-4 w-full py-3.5"
        >
          Log {customAmount || 0} {volumeLabel(volumeUnit)}
        </button>
        <p className="mt-3 text-center text-xs text-slate">
          Goal is {formatVolume(goalMl, volumeUnit)} — {mlToDisplay(Math.max(0, goalMl - totalMl), volumeUnit) < 1 ? 'already there' : `${formatVolume(Math.max(0, goalMl - totalMl), volumeUnit)} to go`}.
        </p>
      </Sheet>
    </div>
  );
}
