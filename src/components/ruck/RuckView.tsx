'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar } from 'recharts';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { distanceLabel, weightLabel, type DistanceUnit, type WeightUnit } from '@/lib/units';
import { RUCK_COPY } from '@/lib/copy';

type Session = {
  id: string;
  when: string;
  pack: number;
  minutes: number;
  distance: number | null;
  terrain: string | null;
  difficulty: number | null;
  notes: string | null;
};

const TERRAINS = ['FLAT', 'HILLS', 'TRAIL', 'TREADMILL', 'MIXED', 'OTHER'] as const;

const CHART_STYLE = {
  background: '#182230',
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  fontSize: 12,
};

export function RuckView({
  weightUnit,
  distanceUnit,
  nowInput,
  pack,
  load,
  totals,
  chart,
  sessions,
  hasWeightHistory,
}: {
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
  nowInput: string;
  pack: { current: number | null; previous: number | null; highest: number | null; average: number | null };
  load: {
    starting: number | null;
    current: number | null;
    lost: number | null;
    pack: number | null;
    percentOfLoss: number | null;
  };
  totals: { weekDistance: number; weekMinutes: number; longestDistance: number; sessionCount: number };
  chart: {
    label: string;
    pack: number;
    totalLoad: number | null;
    body: number | null;
    distance: number;
    minutes: number;
  }[];
  sessions: Session[];
  hasWeightHistory: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [packOpen, setPackOpen] = useState(false);
  const [packDraft, setPackDraft] = useState(pack.current !== null ? String(pack.current) : '');
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    startedAt: nowInput,
    packWeight: pack.current !== null ? String(pack.current) : '',
    durationMinutes: '',
    distance: '',
    steps: '',
    terrain: '' as string,
    difficulty: 0,
    notes: '',
    savePackWeight: true,
  });

  const w = weightLabel(weightUnit);
  const d = distanceLabel(distanceUnit);

  async function logRuck() {
    if (!form.packWeight || !form.durationMinutes) {
      toast('Pack weight and duration are needed', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/ruck', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        startedAt: new Date(form.startedAt).toISOString(),
        packWeight: Number(form.packWeight),
        durationMinutes: Number(form.durationMinutes),
        distance: form.distance ? Number(form.distance) : undefined,
        steps: form.steps ? Number(form.steps) : undefined,
        terrain: form.terrain || undefined,
        difficulty: form.difficulty || undefined,
        notes: form.notes || undefined,
        savePackWeight: form.savePackWeight,
      }),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toast(data.error ?? 'Could not log that', 'error');
      return;
    }
    toast(data.achievement ? `🏆 ${data.achievement}` : 'Ruck logged 🎒');
    setForm({ ...form, durationMinutes: '', distance: '', steps: '', notes: '', difficulty: 0 });
    setOpen(false);
    router.refresh();
  }

  async function savePack() {
    if (!packDraft) return;
    setBusy(true);
    const response = await fetch('/api/ruck', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ weight: Number(packDraft) }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Pack weight updated');
      setPackOpen(false);
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/ruck?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Removed', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      {/* current pack */}
      <button onClick={() => setPackOpen(true)} className="ff-card ff-pressable block w-full text-left">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-midnight text-xl">🎒</span>
          <div className="flex-1">
            <div className="ff-label text-lime">Current pack</div>
            <div className="ff-metric">
              {pack.current !== null ? `${pack.current} ${w}` : '—'}
            </div>
            {pack.previous !== null && pack.current !== null && pack.previous !== pack.current ? (
              <p className="mt-0.5 text-xs text-slate">
                Was {pack.previous} {w}
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-slate">Tap to set</p>
            )}
          </div>
        </div>
      </button>

      {/* the motivational comparison */}
      {load.lost !== null && load.lost > 0 && load.pack !== null ? (
        <div className="ff-card border-lime/25 bg-lime/[0.04]">
          <div className="ff-label mb-2 text-lime">Weight you no longer carry</div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <Metric label="Started" value={load.starting !== null ? `${load.starting}` : '—'} unit={w} />
            <Metric label="Now" value={load.current !== null ? `${load.current}` : '—'} unit={w} />
            <Metric label="Lost" value={`${load.lost.toFixed(1)}`} unit={w} tone="mint" />
          </div>
          {load.percentOfLoss !== null ? (
            <p className="mt-3 border-t border-white/[0.06] pt-3 text-[15px] font-semibold leading-relaxed text-cream">
              {load.percentOfLoss}% of the weight you&apos;ve lost is now weight you{' '}
              <span className="text-lime">choose</span> to carry.
            </p>
          ) : null}
          <p className="mt-2 text-xs italic text-slate">&ldquo;{RUCK_COPY.chooseToCarry}&rdquo;</p>
        </div>
      ) : !hasWeightHistory ? (
        <div className="ff-card">
          <p className="text-[13px] text-slate">
            Log a few weigh-ins and this turns into a comparison between the weight you dropped and the weight you
            now choose to pick up.
          </p>
        </div>
      ) : null}

      <button onClick={() => setOpen(true)} className="ff-btn-primary w-full py-4 text-base">
        Log Ruck
      </button>

      {/* totals */}
      <div className="grid grid-cols-2 gap-3">
        <Card label="This week" value={`${totals.weekDistance} ${d}`} sub={`${totals.weekMinutes} min`} />
        <Card label="Longest ruck" value={`${totals.longestDistance} ${d}`} sub={`${totals.sessionCount} sessions`} />
        <Card label="Highest pack" value={pack.highest !== null ? `${pack.highest} ${w}` : '—'} />
        <Card label="Average pack" value={pack.average !== null ? `${pack.average.toFixed(1)} ${w}` : '—'} />
      </div>

      {/* charts */}
      {chart.length >= 2 ? (
        <>
          <div className="ff-card">
            <div className="ff-label mb-3">Pack weight & total load</div>
            <div className="h-44 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chart} margin={{ top: 6, right: 4, bottom: 0, left: -4 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={26} tick={{ fill: '#667085', fontSize: 10 }} />
                  {/* Pack weight and total load differ by an order of magnitude, so
                      they get their own scales — otherwise the pack line, which is
                      the whole point, flattens against zero. */}
                  <YAxis
                    yAxisId="pack"
                    tickLine={false}
                    axisLine={false}
                    width={38}
                    tick={{ fill: '#C7F43D', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="load"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={40}
                    tick={{ fill: '#667085', fontSize: 10 }}
                  />
                  <Tooltip contentStyle={CHART_STYLE} labelStyle={{ color: '#F7F6F1' }} />
                  <Line
                    yAxisId="pack"
                    type="monotone"
                    dataKey="pack"
                    name={`Pack (${w})`}
                    stroke="#C7F43D"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#C7F43D' }}
                  />
                  <Line
                    yAxisId="load"
                    type="monotone"
                    dataKey="totalLoad"
                    name={`Total Load (${w})`}
                    stroke="#4D8DFF"
                    strokeWidth={2}
                    strokeDasharray="4 3"
                    dot={false}
                    connectNulls
                  />
                  <Line
                    yAxisId="load"
                    type="monotone"
                    dataKey="body"
                    name={`Body (${w})`}
                    stroke="#667085"
                    strokeWidth={1.5}
                    dot={false}
                    connectNulls
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            <p className="mt-2 text-[11px] text-slate">
              <span className="text-lime">Lime</span> is the pack (left axis).{' '}
              <span className="text-electric">Blue</span> is {RUCK_COPY.totalLoad} — body plus pack (right axis).
            </p>
          </div>

          <div className="ff-card">
            <div className="ff-label mb-3">Distance & time per ruck</div>
            <div className="h-36 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chart} margin={{ top: 4, right: 2, bottom: 0, left: 0 }}>
                  <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
                  <XAxis dataKey="label" tickLine={false} axisLine={false} minTickGap={26} tick={{ fill: '#667085', fontSize: 10 }} />
                  {/* Miles and minutes aren't comparable magnitudes either. */}
                  <YAxis
                    yAxisId="distance"
                    tickLine={false}
                    axisLine={false}
                    width={42}
                    tickFormatter={(v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(1))}
                    tick={{ fill: '#3DDC97', fontSize: 10 }}
                  />
                  <YAxis
                    yAxisId="minutes"
                    orientation="right"
                    tickLine={false}
                    axisLine={false}
                    width={32}
                    tick={{ fill: '#667085', fontSize: 10 }}
                  />
                  <Tooltip cursor={{ fill: 'rgba(255,255,255,0.04)' }} contentStyle={CHART_STYLE} labelStyle={{ color: '#F7F6F1' }} />
                  <Bar yAxisId="distance" dataKey="distance" name={d} fill="#3DDC97" radius={[5, 5, 2, 2]} />
                  <Bar yAxisId="minutes" dataKey="minutes" name="min" fill="#3A4759" radius={[5, 5, 2, 2]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      ) : null}

      {/* history */}
      <div className="ff-card">
        <div className="ff-label mb-3">Recent rucks</div>
        {sessions.length === 0 ? (
          <p className="py-2 text-sm text-slate">{RUCK_COPY.empty}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {sessions.map((session) => (
              <li key={session.id} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-extrabold text-cream">
                    {session.distance !== null ? `${session.distance} ${d}` : `${session.minutes} min`}
                  </span>
                  <span className="rounded-full bg-lime/12 px-2 py-0.5 text-[10px] font-bold text-lime">
                    {session.pack} {w}
                  </span>
                </div>
                <div className="mt-1 flex flex-wrap gap-x-3 text-xs text-slate">
                  <span>{session.when}</span>
                  <span>{session.minutes} min</span>
                  {session.terrain ? <span className="capitalize">{session.terrain.toLowerCase()}</span> : null}
                  {session.difficulty ? <span>RPE {session.difficulty}/5</span> : null}
                </div>
                {session.notes ? <p className="mt-1 text-xs italic text-slate">{session.notes}</p> : null}
                <button onClick={() => remove(session.id)} className="mt-1 text-[11px] font-bold text-slate hover:text-coral">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ------------------------------------------------------- log sheet */}
      <Sheet open={open} onClose={() => setOpen(false)} title="Log a ruck">
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ff-label mb-1.5 block">Pack ({w})</label>
              <input
                className="ff-input text-xl font-extrabold"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="15"
                value={form.packWeight}
                onChange={(e) => setForm({ ...form, packWeight: e.target.value })}
              />
            </div>
            <div>
              <label className="ff-label mb-1.5 block">Minutes</label>
              <input
                className="ff-input text-xl font-extrabold"
                type="number"
                inputMode="numeric"
                placeholder="42"
                value={form.durationMinutes}
                onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ff-label mb-1.5 block">Distance ({d})</label>
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

          <div>
            <label className="ff-label mb-1.5 block">When</label>
            <input
              className="ff-input"
              type="datetime-local"
              value={form.startedAt}
              onChange={(e) => setForm({ ...form, startedAt: e.target.value })}
            />
          </div>

          <div>
            <label className="ff-label mb-2 block">Terrain</label>
            <div className="grid grid-cols-3 gap-2">
              {TERRAINS.map((terrain) => (
                <button
                  key={terrain}
                  onClick={() => setForm({ ...form, terrain: form.terrain === terrain ? '' : terrain })}
                  className={`rounded-xl py-2 text-[11px] font-bold capitalize transition ${
                    form.terrain === terrain ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
                  }`}
                >
                  {terrain.toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="ff-label mb-2 block">How hard did it feel?</label>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  onClick={() => setForm({ ...form, difficulty: form.difficulty === n ? 0 : n })}
                  className={`h-11 flex-1 rounded-xl text-sm font-bold transition ${
                    form.difficulty === n ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>

          <textarea
            className="ff-input min-h-[4rem] resize-none"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <label className="flex items-center justify-between rounded-xl bg-midnight px-4 py-3">
            <span className="text-sm font-semibold text-cream">Save as current pack weight</span>
            <input
              type="checkbox"
              checked={form.savePackWeight}
              onChange={(e) => setForm({ ...form, savePackWeight: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-white/15 transition checked:bg-lime"
            />
          </label>

          <button disabled={busy} onClick={logRuck} className="ff-btn-primary w-full py-3.5">
            Save ruck
          </button>
        </div>
      </Sheet>

      {/* ------------------------------------------------------ pack sheet */}
      <Sheet open={packOpen} onClose={() => setPackOpen(false)} title="Pack weight">
        <div className="flex items-center gap-2">
          <input
            className="ff-input flex-1 text-3xl font-extrabold"
            type="number"
            inputMode="decimal"
            step="any"
            placeholder="0"
            value={packDraft}
            onChange={(e) => setPackDraft(e.target.value)}
            autoFocus
          />
          <span className="text-lg font-bold text-slate">{w}</span>
        </div>
        <p className="mt-2 text-xs text-slate">
          Up, down, or the same — it&apos;s all just history. Carry what makes sense today.
        </p>
        <button disabled={busy} onClick={savePack} className="ff-btn-primary mt-4 w-full py-3.5">
          Save pack weight
        </button>
      </Sheet>
    </div>
  );
}

function Card({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="ff-card py-3">
      <div className="ff-label">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-cream">{value}</div>
      {sub ? <div className="mt-0.5 text-[11px] text-slate">{sub}</div> : null}
    </div>
  );
}

function Metric({
  label,
  value,
  unit,
  tone = 'cream',
}: {
  label: string;
  value: string;
  unit: string;
  tone?: 'cream' | 'mint';
}) {
  return (
    <div className="rounded-xl bg-midnight py-3">
      <div className={`text-lg font-extrabold ${tone === 'mint' ? 'text-mint' : 'text-cream'}`}>{value}</div>
      <div className="text-[9px] text-slate/70">{unit}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate">{label}</div>
    </div>
  );
}
