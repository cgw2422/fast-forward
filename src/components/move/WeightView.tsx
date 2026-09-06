'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from 'recharts';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { weightLabel, type WeightUnit } from '@/lib/units';
import { WEIGHT_COPY, EMPTY_STATES } from '@/lib/copy';

type Point = { t: number; value: number; label: string };
const RANGES = [
  { key: '7', label: '7D', days: 7 },
  { key: '30', label: '30D', days: 30 },
  { key: '90', label: '90D', days: 90 },
  { key: 'all', label: 'All', days: Infinity },
];

export function WeightView({
  weightUnit,
  current,
  trend,
  change,
  compareDays,
  goal,
  points,
  nowInput,
  entries,
}: {
  weightUnit: WeightUnit;
  current: number | null;
  trend: number | null;
  change: number | null;
  compareDays: number;
  goal: number | null;
  points: Point[];
  nowInput: string;
  entries: { id: string; value: number; when: string; note: string | null }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [range, setRange] = useState('30');
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState('');
  const [loggedAt, setLoggedAt] = useState(nowInput);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  const chartData = useMemo(() => {
    const days = RANGES.find((r) => r.key === range)?.days ?? 30;
    if (days === Infinity) return points;
    const cutoff = Date.now() - days * 86_400_000;
    const filtered = points.filter((p) => p.t >= cutoff);
    return filtered.length >= 2 ? filtered : points.slice(-2);
  }, [points, range]);

  const domain = useMemo(() => {
    if (chartData.length === 0) return [0, 1] as [number, number];
    const values = chartData.map((p) => p.value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const pad = Math.max(1, (max - min) * 0.25);
    return [Math.floor(min - pad), Math.ceil(max + pad)] as [number, number];
  }, [chartData]);

  async function save() {
    const numeric = Number(value);
    if (!numeric || numeric <= 0) {
      toast('Enter a weight', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/weight', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        weight: numeric,
        loggedAt: new Date(loggedAt).toISOString(),
        note: note || undefined,
      }),
    });
    setBusy(false);
    if (response.ok) {
      toast(WEIGHT_COPY.cheer);
      setValue('');
      setNote('');
      setOpen(false);
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/weight?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-4 pt-2">
      <div className="ff-card">
        <div className="ff-label">Current</div>
        <div className="mt-1 flex items-baseline gap-2">
          <span className="text-[2.6rem] font-black leading-none tracking-tight text-cream">
            {current !== null ? current.toFixed(1) : '—'}
          </span>
          <span className="text-base font-bold text-slate">{weightLabel(weightUnit)}</span>
        </div>
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs">
          {trend !== null ? (
            <span className="text-slate">
              Trend <span className="font-bold text-cream">{trend.toFixed(1)}</span>
            </span>
          ) : null}
          {change !== null ? (
            <span className={change <= 0 ? 'text-mint' : 'text-slate'}>
              {change > 0 ? '+' : ''}
              {change.toFixed(1)} {weightLabel(weightUnit)} / {compareDays}d
            </span>
          ) : null}
          {goal !== null ? <span className="text-slate">Goal {goal.toFixed(1)}</span> : null}
        </div>
      </div>

      <button onClick={() => setOpen(true)} className="ff-btn-primary w-full py-4 text-base">
        Log Weight
      </button>

      <div className="ff-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="ff-label">Trend</div>
          <div className="flex gap-1 rounded-lg bg-midnight p-1">
            {RANGES.map((r) => (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className={`rounded-md px-2.5 py-1 text-[11px] font-bold transition ${
                  range === r.key ? 'bg-lime text-midnight' : 'text-slate'
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {chartData.length < 2 ? (
          <p className="py-8 text-center text-sm text-slate">{EMPTY_STATES.weight}</p>
        ) : (
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 6, right: 6, bottom: 0, left: -18 }}>
                <defs>
                  <linearGradient id="weightFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#C7F43D" stopOpacity={0.28} />
                    <stop offset="100%" stopColor="#C7F43D" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis
                  dataKey="label"
                  tickLine={false}
                  axisLine={false}
                  minTickGap={28}
                  tick={{ fill: '#667085', fontSize: 10 }}
                />
                <YAxis
                  domain={domain}
                  tickLine={false}
                  axisLine={false}
                  width={44}
                  tick={{ fill: '#667085', fontSize: 10 }}
                />
                <Tooltip
                  contentStyle={{
                    background: '#182230',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#F7F6F1' }}
                  formatter={(v: number) => [`${v} ${weightLabel(weightUnit)}`, 'Weight']}
                />
                <Area type="monotone" dataKey="value" stroke="#C7F43D" strokeWidth={2.5} fill="url(#weightFill)" />
                {goal !== null ? (
                  <Line
                    type="monotone"
                    dataKey={() => goal}
                    stroke="#4D8DFF"
                    strokeDasharray="4 4"
                    strokeWidth={1.5}
                    dot={false}
                  />
                ) : null}
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <div className="ff-card">
        <div className="ff-label mb-3">Recent entries</div>
        {entries.length === 0 ? (
          <p className="py-2 text-sm text-slate">{EMPTY_STATES.weight}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {entries.map((entry) => (
              <li key={entry.id} className="flex items-center gap-3 py-2.5">
                <span className="flex-1">
                  <span className="text-sm font-bold text-cream">
                    {entry.value.toFixed(1)} {weightLabel(weightUnit)}
                  </span>
                  {entry.note ? <span className="block text-[11px] italic text-slate">{entry.note}</span> : null}
                </span>
                <span className="text-xs text-slate">{entry.when}</span>
                <button
                  onClick={() => remove(entry.id)}
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

      <Sheet open={open} onClose={() => setOpen(false)} title="Log weight">
        <div className="flex items-center gap-2">
          <input
            className="ff-input flex-1 text-3xl font-extrabold"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0.0"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
          />
          <span className="text-lg font-bold text-slate">{weightLabel(weightUnit)}</span>
        </div>
        <label className="ff-label mb-1.5 mt-4 block">When</label>
        <input
          className="ff-input"
          type="datetime-local"
          value={loggedAt}
          onChange={(e) => setLoggedAt(e.target.value)}
        />
        <label className="ff-label mb-1.5 mt-4 block">Note</label>
        <input
          className="ff-input"
          placeholder="Optional"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        <button disabled={busy} onClick={save} className="ff-btn-primary mt-5 w-full py-3.5">
          Save
        </button>
      </Sheet>
    </div>
  );
}
