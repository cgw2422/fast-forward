'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { volumeLabel, type VolumeUnit } from '@/lib/units';

type Preset = { id: string; label: string; amount: number; icon: string | null };

const ICON_CHOICES = ['💧', '🥤', '🧴', '🍶', '☕️', '🫗', '🪣', '🧊'];

export function ContainerSettings({
  presets,
  volumeUnit,
}: {
  presets: Preset[];
  volumeUnit: VolumeUnit;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Preset | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ label: '', amount: '', icon: '🥤' });
  const [busy, setBusy] = useState(false);

  async function save() {
    if (!form.label.trim() || !Number(form.amount)) {
      toast('Name and amount are both needed', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/water/presets', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(editing ? { id: editing.id } : {}),
        label: form.label.trim(),
        amount: Number(form.amount),
        unit: volumeUnit,
        icon: form.icon,
      }),
    });
    setBusy(false);
    if (response.ok) {
      toast(editing ? 'Saved' : 'Container added');
      setEditing(null);
      setCreating(false);
      setForm({ label: '', amount: '', icon: '🥤' });
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/water/presets?id=${id}`, { method: 'DELETE' });
    setEditing(null);
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  /** Swaps two neighbours and persists the whole order in one request. */
  async function move(index: number, direction: -1 | 1) {
    const next = [...presets];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];

    const response = await fetch('/api/water/presets', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ order: next.map((p) => p.id) }),
    });
    if (response.ok) router.refresh();
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      <ul className="space-y-2">
        {presets.map((preset, index) => (
          <li key={preset.id} className="ff-card flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-midnight text-lg">
              {preset.icon ?? '💧'}
            </span>
            <button
              onClick={() => {
                setForm({ label: preset.label, amount: String(preset.amount), icon: preset.icon ?? '🥤' });
                setEditing(preset);
              }}
              className="min-w-0 flex-1 text-left"
            >
              <div className="truncate text-sm font-bold text-cream">{preset.label}</div>
              <div className="text-[11px] text-slate">
                {preset.amount} {volumeLabel(volumeUnit)}
              </div>
            </button>
            <div className="flex flex-col">
              <button
                onClick={() => move(index, -1)}
                disabled={index === 0}
                aria-label="Move up"
                className="px-2 text-slate disabled:opacity-25"
              >
                ▲
              </button>
              <button
                onClick={() => move(index, 1)}
                disabled={index === presets.length - 1}
                aria-label="Move down"
                className="px-2 text-slate disabled:opacity-25"
              >
                ▼
              </button>
            </div>
          </li>
        ))}
      </ul>

      <button
        onClick={() => {
          setForm({ label: '', amount: '', icon: '🥤' });
          setCreating(true);
        }}
        className="ff-btn-primary w-full py-3.5"
      >
        + Add container
      </button>

      <Sheet
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit container' : 'New container'}
      >
        <label className="ff-label mb-1.5 block">Name</label>
        <input
          className="ff-input"
          placeholder="Big Honkin' Cup"
          value={form.label}
          onChange={(e) => setForm({ ...form, label: e.target.value })}
        />

        <label className="ff-label mb-1.5 mt-4 block">Volume ({volumeLabel(volumeUnit)})</label>
        <input
          className="ff-input text-2xl font-extrabold"
          type="number"
          inputMode="decimal"
          step="any"
          placeholder="44"
          value={form.amount}
          onChange={(e) => setForm({ ...form, amount: e.target.value })}
        />

        <label className="ff-label mb-2 mt-4 block">Icon</label>
        <div className="flex flex-wrap gap-2">
          {ICON_CHOICES.map((icon) => (
            <button
              key={icon}
              onClick={() => setForm({ ...form, icon })}
              className={`grid h-11 w-11 place-items-center rounded-xl text-lg transition ${
                form.icon === icon ? 'bg-lime' : 'bg-midnight'
              }`}
            >
              {icon}
            </button>
          ))}
        </div>

        <button disabled={busy} onClick={save} className="ff-btn-primary mt-5 w-full py-3.5">
          {editing ? 'Save changes' : 'Add container'}
        </button>
        {editing ? (
          <button onClick={() => remove(editing.id)} className="ff-btn-ghost mt-1 w-full text-xs">
            Delete container
          </button>
        ) : null}
      </Sheet>
    </div>
  );
}
