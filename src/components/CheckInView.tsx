'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';

type Ratings = {
  energy: number | null;
  hunger: number | null;
  sleep: number | null;
  mood: number | null;
  notes: string;
};

const SCALES: { key: keyof Omit<Ratings, 'notes'>; label: string; low: string; high: string; icon: string }[] = [
  { key: 'energy', label: 'Energy', low: 'Wiped', high: 'Charged', icon: '⚡' },
  { key: 'hunger', label: 'Hunger', low: 'None', high: 'Ravenous', icon: '🍽' },
  { key: 'sleep', label: 'Sleep', low: 'Rough', high: 'Great', icon: '😴' },
  { key: 'mood', label: 'Mood', low: 'Low', high: 'Good', icon: '🙂' },
];

export function CheckInView({
  initial,
  recent,
}: {
  initial: Ratings;
  recent: {
    id: string;
    date: string;
    energy: number | null;
    hunger: number | null;
    sleep: number | null;
    mood: number | null;
    notes: string | null;
  }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [values, setValues] = useState(initial);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch('/api/checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...values, notes: values.notes || null }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Check-in saved');
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2">
      {SCALES.map((scale) => (
        <div key={scale.key} className="ff-card">
          <div className="mb-3 flex items-center gap-2">
            <span className="text-base">{scale.icon}</span>
            <span className="text-sm font-bold text-cream">{scale.label}</span>
            <span className="ml-auto text-xs font-bold text-slate">
              {values[scale.key] ? `${values[scale.key]}/5` : '—'}
            </span>
          </div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => {
              const active = values[scale.key] === n;
              return (
                <button
                  key={n}
                  onClick={() => setValues({ ...values, [scale.key]: active ? null : n })}
                  className={`h-11 flex-1 rounded-xl text-sm font-bold transition active:scale-95 ${
                    active ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
                  }`}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex justify-between text-[10px] font-semibold text-slate/70">
            <span>{scale.low}</span>
            <span>{scale.high}</span>
          </div>
        </div>
      ))}

      <div className="ff-card">
        <label className="ff-label mb-2 block">Notes</label>
        <textarea
          className="ff-input min-h-[6rem] resize-none"
          placeholder="Anything worth remembering about today."
          value={values.notes}
          onChange={(e) => setValues({ ...values, notes: e.target.value })}
        />
      </div>

      <button disabled={busy} onClick={save} className="ff-btn-primary w-full py-4 text-base">
        Save check-in
      </button>

      {recent.length > 0 ? (
        <div className="ff-card">
          <div className="ff-label mb-3">Last 7 days</div>
          <ul className="divide-y divide-white/[0.05]">
            {recent.map((entry) => (
              <li key={entry.id} className="py-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-cream">{entry.date}</span>
                  <span className="flex gap-2 text-[11px] text-slate">
                    {entry.energy ? <span>⚡{entry.energy}</span> : null}
                    {entry.hunger ? <span>🍽{entry.hunger}</span> : null}
                    {entry.sleep ? <span>😴{entry.sleep}</span> : null}
                    {entry.mood ? <span>🙂{entry.mood}</span> : null}
                  </span>
                </div>
                {entry.notes ? <p className="mt-1 text-[11px] italic text-slate">{entry.notes}</p> : null}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
