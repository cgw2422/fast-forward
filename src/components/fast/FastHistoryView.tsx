'use client';

import { useRouter } from 'next/navigation';
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { formatDurationShort } from '@/lib/units';
import { useToast } from '@/components/ui/Toast';
import { EMPTY_STATES } from '@/lib/copy';

type Fast = {
  id: string;
  start: string;
  end: string;
  durationMs: number;
  targetHours: number | null;
  hitTarget: boolean | null;
  weightChange: number | null;
  notes: string | null;
};

export function FastHistoryView({
  stats,
  monthly,
  fasts,
  weightUnitLabel,
}: {
  stats: { totalHours: number; averageHours: number; longestMs: number; count: number };
  monthly: { month: string; hours: number }[];
  fasts: Fast[];
  weightUnitLabel: string;
}) {
  const router = useRouter();
  const { toast } = useToast();

  async function remove(id: string) {
    const response = await fetch(`/api/fast?id=${id}`, { method: 'DELETE' });
    if (response.ok) {
      toast('Deleted', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2">
      <div className="grid grid-cols-2 gap-3">
        <Stat label="Total hours" value={stats.totalHours.toLocaleString()} />
        <Stat label="Fasts logged" value={stats.count.toString()} />
        <Stat label="Average fast" value={formatDurationShort(stats.averageHours * 3_600_000)} />
        <Stat label="Longest fast" value={formatDurationShort(stats.longestMs)} />
      </div>

      {monthly.length > 0 ? (
        <div className="ff-card">
          <div className="ff-label mb-3">Monthly hours</div>
          <div className="h-36 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={monthly} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
                <XAxis
                  dataKey="month"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fill: '#667085', fontSize: 11, fontWeight: 700 }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.04)' }}
                  contentStyle={{
                    background: '#182230',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 12,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: '#F7F6F1' }}
                  formatter={(value: number) => [`${value} h`, 'Fasted']}
                />
                <Bar dataKey="hours" radius={[6, 6, 2, 2]}>
                  {monthly.map((entry, index) => (
                    <Cell key={entry.month} fill={index === monthly.length - 1 ? '#C7F43D' : '#3A4759'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}

      <div className="ff-card">
        <div className="ff-label mb-3">All fasts</div>
        {fasts.length === 0 ? (
          <p className="py-3 text-sm text-slate">{EMPTY_STATES.fasts}</p>
        ) : (
          <ul className="divide-y divide-white/[0.05]">
            {fasts.map((fast) => (
              <li key={fast.id} className="py-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-base font-extrabold text-cream">{formatDurationShort(fast.durationMs)}</span>
                  {fast.targetHours ? (
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        fast.hitTarget ? 'bg-mint/15 text-mint' : 'bg-white/[0.06] text-slate'
                      }`}
                    >
                      {fast.hitTarget ? `Reached ${fast.targetHours}h` : `Target ${fast.targetHours}h`}
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold text-slate">No target</span>
                  )}
                </div>
                <div className="mt-1 text-xs text-slate">
                  {fast.start} → {fast.end}
                </div>
                {fast.weightChange !== null ? (
                  <div className="mt-1 text-xs text-slate">
                    Weight {fast.weightChange > 0 ? '+' : ''}
                    {fast.weightChange.toFixed(1)} {weightUnitLabel}
                  </div>
                ) : null}
                {fast.notes ? <div className="mt-1 text-xs italic text-slate">{fast.notes}</div> : null}
                <button onClick={() => remove(fast.id)} className="mt-1.5 text-[11px] font-bold text-slate hover:text-coral">
                  Delete
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="ff-card py-3">
      <div className="ff-label">{label}</div>
      <div className="mt-1 text-xl font-extrabold tracking-tight text-cream">{value}</div>
    </div>
  );
}
