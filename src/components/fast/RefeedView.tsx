'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { volumeLabel, weightLabel, type VolumeUnit, type WeightUnit } from '@/lib/units';
import { FAST_COPY } from '@/lib/copy';

type Entry = {
  id: string;
  when: string;
  meal: string;
  amount: string | null;
  water: number | null;
  symptoms: string | null;
  weight: number | null;
  notes: string | null;
};

export function RefeedView({
  fastId,
  nowInput,
  volumeUnit,
  weightUnit,
  entries,
}: {
  fastId: string | null;
  nowInput: string;
  volumeUnit: VolumeUnit;
  weightUnit: WeightUnit;
  entries: Entry[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    occurredAt: nowInput,
    meal: '',
    amount: '',
    water: '',
    symptoms: '',
    weight: '',
    notes: '',
  });

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!form.meal.trim()) return;
    setBusy(true);

    const response = await fetch('/api/refeed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fastId: fastId ?? undefined,
        occurredAt: new Date(form.occurredAt).toISOString(),
        meal: form.meal.trim(),
        amount: form.amount || undefined,
        water: form.water ? Number(form.water) : undefined,
        symptoms: form.symptoms || undefined,
        weight: form.weight ? Number(form.weight) : undefined,
        notes: form.notes || undefined,
      }),
    });
    setBusy(false);

    if (response.ok) {
      toast('Logged');
      setForm({ ...form, meal: '', amount: '', water: '', symptoms: '', weight: '', notes: '' });
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="rounded-2xl border border-electric/25 bg-electric/[0.07] p-4">
        <p className="text-[13px] leading-relaxed text-cream/85">{FAST_COPY.refeedNotice}</p>
      </div>

      <form onSubmit={submit} className="ff-card space-y-3">
        <div>
          <label className="ff-label mb-1.5 block">When</label>
          <input
            className="ff-input"
            type="datetime-local"
            value={form.occurredAt}
            onChange={(e) => setForm({ ...form, occurredAt: e.target.value })}
          />
        </div>
        <div>
          <label className="ff-label mb-1.5 block">What you ate</label>
          <input
            className="ff-input"
            placeholder="Bone broth, eggs, etc."
            value={form.meal}
            onChange={(e) => setForm({ ...form, meal: e.target.value })}
            required
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ff-label mb-1.5 block">Amount</label>
            <input
              className="ff-input"
              placeholder="1 cup"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div>
            <label className="ff-label mb-1.5 block">Water ({volumeLabel(volumeUnit)})</label>
            <input
              className="ff-input"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.water}
              onChange={(e) => setForm({ ...form, water: e.target.value })}
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="ff-label mb-1.5 block">Weight ({weightLabel(weightUnit)})</label>
            <input
              className="ff-input"
              type="number"
              inputMode="decimal"
              step="any"
              value={form.weight}
              onChange={(e) => setForm({ ...form, weight: e.target.value })}
            />
          </div>
          <div>
            <label className="ff-label mb-1.5 block">Symptoms</label>
            <input
              className="ff-input"
              placeholder="How you felt"
              value={form.symptoms}
              onChange={(e) => setForm({ ...form, symptoms: e.target.value })}
            />
          </div>
        </div>
        <div>
          <label className="ff-label mb-1.5 block">Notes</label>
          <textarea
            className="ff-input min-h-[4.5rem] resize-none"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </div>
        <button disabled={busy} type="submit" className="ff-btn-primary w-full py-3.5">
          Add entry
        </button>
      </form>

      <div className="ff-card">
        <div className="ff-label mb-3">Entries</div>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-slate">Nothing logged yet.</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((entry) => (
              <li key={entry.id} className="py-3">
                <div className="flex items-baseline justify-between">
                  <span className="text-sm font-bold text-cream">{entry.meal}</span>
                  <span className="text-[11px] text-slate">{entry.when}</span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate">
                  {entry.amount ? <span>{entry.amount}</span> : null}
                  {entry.water !== null ? <span>{entry.water} {volumeLabel(volumeUnit)} water</span> : null}
                  {entry.weight !== null ? <span>{entry.weight.toFixed(1)} {weightLabel(weightUnit)}</span> : null}
                </div>
                {entry.symptoms ? <div className="mt-1 text-xs text-cream/70">{entry.symptoms}</div> : null}
                {entry.notes ? <div className="mt-0.5 text-xs italic text-slate">{entry.notes}</div> : null}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
