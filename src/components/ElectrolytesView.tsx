'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { EMPTY_STATES } from '@/lib/copy';

type Preset = {
  id: string;
  name: string;
  servingSize: string | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  magnesiumMg: number | null;
  notes: string | null;
};

const EMPTY_PRESET = {
  name: '',
  servingSize: '',
  sodiumMg: '',
  potassiumMg: '',
  magnesiumMg: '',
  notes: '',
};

export function ElectrolytesView({
  totals,
  presets,
  entries,
}: {
  totals: { sodium: number; potassium: number; magnesium: number; servings: number };
  presets: Preset[];
  entries: {
    id: string;
    name: string;
    servings: number;
    sodiumMg: number | null;
    potassiumMg: number | null;
    magnesiumMg: number | null;
    time: string;
  }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [productOpen, setProductOpen] = useState(false);
  const [servingsOpen, setServingsOpen] = useState<Preset | null>(null);
  const [servings, setServings] = useState('1');
  const [form, setForm] = useState({ ...EMPTY_PRESET });
  const [busy, setBusy] = useState(false);

  async function logPreset(preset: Preset, count: number) {
    setBusy(true);
    const response = await fetch('/api/electrolytes', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presetId: preset.id, servings: count }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Logged ⚡');
      setServingsOpen(null);
      setServings('1');
      router.refresh();
    } else {
      toast('Could not log that', 'error');
    }
  }

  async function saveProduct() {
    if (!form.name.trim()) {
      toast('Give the product a name', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/electrolytes/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name.trim(),
        servingSize: form.servingSize || null,
        sodiumMg: form.sodiumMg ? Number(form.sodiumMg) : null,
        potassiumMg: form.potassiumMg ? Number(form.potassiumMg) : null,
        magnesiumMg: form.magnesiumMg ? Number(form.magnesiumMg) : null,
        notes: form.notes || null,
      }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Product saved');
      setForm({ ...EMPTY_PRESET });
      setProductOpen(false);
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  async function removeEntry(id: string) {
    const response = await fetch(`/api/electrolytes?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  async function removePreset(id: string) {
    const response = await fetch(`/api/electrolytes/presets?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Product removed', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="ff-card">
        <div className="ff-label mb-3">Today&apos;s totals</div>
        <div className="grid grid-cols-3 gap-2 text-center">
          <Total label="Sodium" value={totals.sodium} />
          <Total label="Potassium" value={totals.potassium} />
          <Total label="Magnesium" value={totals.magnesium} />
        </div>
        <p className="mt-3 border-t border-white/[0.06] pt-3 text-[11px] text-slate">
          {totals.servings > 0
            ? `${totals.servings} serving${totals.servings === 1 ? '' : 's'} logged today.`
            : 'Nothing logged today.'}{' '}
          These are your own recorded numbers — Fast Forward doesn&apos;t recommend amounts.
        </p>
      </div>

      <div>
        <div className="ff-label mb-2 px-1">Your products</div>
        {presets.length === 0 ? (
          <div className="ff-card py-8 text-center">
            <p className="text-sm text-slate">No products saved yet. Add the ones you actually use.</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {presets.map((preset) => (
              <li key={preset.id} className="ff-card flex items-center gap-3">
                <button
                  onClick={() => {
                    setServingsOpen(preset);
                    setServings('1');
                  }}
                  className="min-w-0 flex-1 text-left"
                >
                  <div className="text-sm font-bold text-cream">{preset.name}</div>
                  <div className="mt-0.5 flex flex-wrap gap-x-3 text-[11px] text-slate">
                    {preset.servingSize ? <span>{preset.servingSize}</span> : null}
                    {preset.sodiumMg ? <span>Na {preset.sodiumMg}mg</span> : null}
                    {preset.potassiumMg ? <span>K {preset.potassiumMg}mg</span> : null}
                    {preset.magnesiumMg ? <span>Mg {preset.magnesiumMg}mg</span> : null}
                  </div>
                </button>
                <button
                  onClick={() => logPreset(preset, 1)}
                  disabled={busy}
                  className="ff-btn-primary shrink-0 px-3 py-2 text-xs"
                >
                  + Log
                </button>
                <button
                  onClick={() => removePreset(preset.id)}
                  aria-label="Delete product"
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

      <button onClick={() => setProductOpen(true)} className="ff-btn-secondary w-full py-3.5">
        + Add a product
      </button>

      <div className="ff-card">
        <div className="ff-label mb-3">Today&apos;s entries</div>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-slate">{EMPTY_STATES.electrolytes}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <span className="text-base">⚡</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-cream">
                    {entry.name} <span className="text-slate">×{entry.servings}</span>
                  </span>
                  <span className="block text-[11px] text-slate">
                    {[
                      entry.sodiumMg ? `Na ${Math.round(entry.sodiumMg)}mg` : null,
                      entry.potassiumMg ? `K ${Math.round(entry.potassiumMg)}mg` : null,
                      entry.magnesiumMg ? `Mg ${Math.round(entry.magnesiumMg)}mg` : null,
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </span>
                </span>
                <span className="text-xs text-slate">{entry.time}</span>
                <button
                  onClick={() => removeEntry(entry.id)}
                  aria-label="Delete entry"
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

      <Sheet open={productOpen} onClose={() => setProductOpen(false)} title="Add a product">
        <div className="space-y-3">
          <input
            className="ff-input"
            placeholder="Product name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
          <input
            className="ff-input"
            placeholder="Serving size (e.g. 1 stick, 16 oz)"
            value={form.servingSize}
            onChange={(e) => setForm({ ...form, servingSize: e.target.value })}
          />
          <div className="grid grid-cols-3 gap-2">
            {(['sodiumMg', 'potassiumMg', 'magnesiumMg'] as const).map((key) => (
              <div key={key}>
                <label className="ff-label mb-1.5 block">
                  {key === 'sodiumMg' ? 'Sodium' : key === 'potassiumMg' ? 'Potassium' : 'Magnesium'}
                </label>
                <input
                  className="ff-input px-3 py-2.5 text-sm"
                  type="number"
                  inputMode="numeric"
                  placeholder="mg"
                  value={form[key]}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <textarea
            className="ff-input min-h-[4rem] resize-none"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
          <p className="text-[11px] text-slate">
            Copy the numbers straight off the label. Fast Forward records what you enter and nothing more.
          </p>
          <button disabled={busy} onClick={saveProduct} className="ff-btn-primary w-full py-3.5">
            Save product
          </button>
        </div>
      </Sheet>

      <Sheet open={servingsOpen !== null} onClose={() => setServingsOpen(null)} title={servingsOpen?.name ?? ''}>
        <label className="ff-label mb-1.5 block">Servings</label>
        <input
          className="ff-input text-2xl font-extrabold"
          type="number"
          inputMode="decimal"
          step="any"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
        />
        <button
          disabled={busy}
          onClick={() => servingsOpen && logPreset(servingsOpen, Number(servings) || 1)}
          className="ff-btn-primary mt-4 w-full py-3.5"
        >
          Log it
        </button>
      </Sheet>
    </div>
  );
}

function Total({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-midnight py-3">
      <div className="text-lg font-extrabold text-cream">{value > 0 ? Math.round(value) : '—'}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate">{label}</div>
      {value > 0 ? <div className="text-[9px] text-slate/70">mg</div> : null}
    </div>
  );
}
