'use client';

import { useMemo, useRef, useState } from 'react';
import { weightLabel, type WeightUnit } from '@/lib/units';
import { EMPTY_STATES } from '@/lib/copy';

type ComparePhoto = {
  id: string;
  angle: string;
  when: string;
  timestamp: number;
  weight: number | null;
};

type Mode = 'slider' | 'side' | 'fade';

export function CompareView({ photos, weightUnit }: { photos: ComparePhoto[]; weightUnit: WeightUnit }) {
  const [angle, setAngle] = useState('FRONT');
  const [mode, setMode] = useState<Mode>('slider');

  const forAngle = useMemo(() => photos.filter((p) => p.angle === angle), [photos, angle]);
  const angles = useMemo(() => Array.from(new Set(photos.map((p) => p.angle))), [photos]);

  const [beforeId, setBeforeId] = useState<string | null>(null);
  const [afterId, setAfterId] = useState<string | null>(null);

  // Default to the widest span available for the selected angle.
  const before = forAngle.find((p) => p.id === beforeId) ?? forAngle[0] ?? null;
  const after = forAngle.find((p) => p.id === afterId) ?? forAngle[forAngle.length - 1] ?? null;

  const [reveal, setReveal] = useState(50);
  const [fade, setFade] = useState(50);
  const frame = useRef<HTMLDivElement>(null);

  if (photos.length < 2) {
    return (
      <div className="animate-fade-up pt-2">
        <div className="ff-card py-12 text-center">
          <p className="text-sm text-slate">
            You need at least two photos to compare. {EMPTY_STATES.weight}
          </p>
        </div>
      </div>
    );
  }

  const daysBetween =
    before && after ? Math.round(Math.abs(after.timestamp - before.timestamp) / 86_400_000) : null;
  const weightChange =
    before?.weight !== null && before?.weight !== undefined && after?.weight !== null && after?.weight !== undefined
      ? after.weight - before.weight
      : null;

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      {angles.length > 1 ? (
        <div className="flex gap-1 rounded-xl bg-surface p-1">
          {angles.map((a) => (
            <button
              key={a}
              onClick={() => {
                setAngle(a);
                setBeforeId(null);
                setAfterId(null);
              }}
              className={`flex-1 rounded-lg py-2 text-[11px] font-bold capitalize transition ${
                angle === a ? 'bg-lime text-midnight' : 'text-slate'
              }`}
            >
              {a.toLowerCase()}
            </button>
          ))}
        </div>
      ) : null}

      {forAngle.length < 2 ? (
        <div className="ff-card py-10 text-center">
          <p className="text-sm text-slate">Only one photo at this angle so far. Add another to compare.</p>
        </div>
      ) : (
        <>
          <div className="flex gap-1 rounded-xl bg-surface p-1">
            {(['slider', 'side', 'fade'] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`flex-1 rounded-lg py-2 text-[11px] font-bold capitalize transition ${
                  mode === m ? 'bg-lime text-midnight' : 'text-slate'
                }`}
              >
                {m === 'side' ? 'Side by side' : m}
              </button>
            ))}
          </div>

          <div className="ff-card p-3">
            {mode === 'side' ? (
              <div className="grid grid-cols-2 gap-2">
                {[before, after].map((photo, index) => (
                  <div key={index}>
                    <div className="overflow-hidden rounded-xl bg-midnight">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/photos/${photo.id}/file`}
                          alt={index === 0 ? 'Before' : 'After'}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      ) : null}
                    </div>
                    <div className="mt-1.5 text-center">
                      <div className="text-[10px] font-black uppercase tracking-widest text-lime">
                        {index === 0 ? 'Before' : 'After'}
                      </div>
                      <div className="text-[11px] text-slate">{photo?.when}</div>
                      {photo?.weight !== null && photo?.weight !== undefined ? (
                        <div className="text-[11px] font-bold text-cream">
                          {photo.weight} {weightLabel(weightUnit)}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : mode === 'slider' ? (
              <div
                ref={frame}
                className="relative aspect-[3/4] w-full select-none overflow-hidden rounded-xl bg-midnight"
              >
                {after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${after.id}/file`}
                    alt="After"
                    className="absolute inset-0 h-full w-full object-cover"
                    draggable={false}
                  />
                ) : null}
                {before ? (
                  <div
                    className="absolute inset-0 overflow-hidden"
                    style={{ clipPath: `inset(0 ${100 - reveal}% 0 0)` }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`/api/photos/${before.id}/file`}
                      alt="Before"
                      className="h-full w-full object-cover"
                      draggable={false}
                    />
                  </div>
                ) : null}

                <div
                  className="pointer-events-none absolute inset-y-0 w-0.5 bg-lime"
                  style={{ left: `${reveal}%` }}
                >
                  <span className="absolute top-1/2 left-1/2 grid h-9 w-9 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-lime text-midnight shadow-lg">
                    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                      <path d="m9 6-4 6 4 6M15 6l4 6-4 6" />
                    </svg>
                  </span>
                </div>

                <span className="absolute top-2 left-2 rounded-full bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-cream">
                  Before
                </span>
                <span className="absolute top-2 right-2 rounded-full bg-black/60 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-lime">
                  After
                </span>

                <input
                  type="range"
                  min={0}
                  max={100}
                  value={reveal}
                  aria-label="Reveal slider"
                  onChange={(e) => setReveal(Number(e.target.value))}
                  className="absolute inset-0 h-full w-full cursor-ew-resize opacity-0"
                />
              </div>
            ) : (
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-xl bg-midnight">
                {before ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${before.id}/file`}
                    alt="Before"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                {after ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/photos/${after.id}/file`}
                    alt="After"
                    className="absolute inset-0 h-full w-full object-cover transition-opacity"
                    style={{ opacity: fade / 100 }}
                  />
                ) : null}
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={fade}
                  aria-label="Fade between photos"
                  onChange={(e) => setFade(Number(e.target.value))}
                  className="absolute inset-x-4 bottom-3 w-[calc(100%-2rem)] accent-lime"
                />
              </div>
            )}
          </div>

          {/* context */}
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Days" value={daysBetween !== null ? String(daysBetween) : '—'} />
            <Stat
              label="Change"
              value={
                weightChange !== null
                  ? `${weightChange > 0 ? '+' : ''}${weightChange.toFixed(1)}`
                  : '—'
              }
              tone={weightChange !== null && weightChange < 0 ? 'mint' : 'cream'}
            />
            <Stat
              label="Now"
              value={after?.weight !== null && after?.weight !== undefined ? String(after.weight) : '—'}
            />
          </div>

          <div className="ff-card">
            <label className="ff-label mb-1.5 block">Before</label>
            <select
              className="ff-input mb-3"
              value={before?.id ?? ''}
              onChange={(e) => setBeforeId(e.target.value)}
            >
              {forAngle.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.when}
                  {p.weight !== null ? ` · ${p.weight} ${weightLabel(weightUnit)}` : ''}
                </option>
              ))}
            </select>
            <label className="ff-label mb-1.5 block">After</label>
            <select className="ff-input" value={after?.id ?? ''} onChange={(e) => setAfterId(e.target.value)}>
              {forAngle.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.when}
                  {p.weight !== null ? ` · ${p.weight} ${weightLabel(weightUnit)}` : ''}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}

function Stat({ label, value, tone = 'cream' }: { label: string; value: string; tone?: 'cream' | 'mint' }) {
  return (
    <div className="ff-card py-3 text-center">
      <div className={`text-xl font-extrabold ${tone === 'mint' ? 'text-mint' : 'text-cream'}`}>{value}</div>
      <div className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate">{label}</div>
    </div>
  );
}
