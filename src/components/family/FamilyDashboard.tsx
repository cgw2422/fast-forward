'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { LogoMark } from '@/components/brand/Logo';
import { formatDistance, kgToDisplay, weightLabel, type DistanceUnit, type WeightUnit } from '@/lib/units';

type Snapshot = {
  popStreak: number | null;
  promiseKeptToday: boolean | null;
  walkMinutes: number | null;
  walkMeters: number | null;
  latestRuck: {
    packWeightKg: number;
    distanceMeters: number | null;
    durationMinutes: number;
    when: string;
  } | null;
  packCurrentKg: number | null;
  lostKg: number | null;
  percentOfLoss: number | null;
  weightLostKg: number | null;
  habits: { id: string; name: string; done: boolean }[];
  votesCast: number;
  votesTotal: number;
  achievements: { id: string; label: string; when: string }[];
  photos: { id: string; when: string; angle: string }[];
};

const QUICK_CHEERS = [
  'Proud of you. Keep going ❤️',
  "You've got this!",
  'Way to keep the promise.',
  'Saw your walk today — nice work.',
  'Thinking about you today.',
];

export function FamilyDashboard({
  ownerId,
  ownerName,
  viewerName,
  role,
  owners,
  units,
  snapshot,
  messagesSent,
}: {
  ownerId: string;
  ownerName: string;
  viewerName: string;
  role: string;
  owners: { id: string; name: string }[];
  units: { weight: WeightUnit; distance: DistanceUnit };
  snapshot: Snapshot;
  messagesSent: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [composerOpen, setComposerOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);

  const weight = (kg: number) => `${kgToDisplay(kg, units.weight).toFixed(1)} ${weightLabel(units.weight)}`;
  const weightRounded = (kg: number) => `${Math.round(kgToDisplay(kg, units.weight))} ${weightLabel(units.weight)}`;

  async function send() {
    const body = message.trim();
    if (!body) return;
    setBusy(true);
    const response = await fetch('/api/family/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerId, body }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Sent 💚');
      setMessage('');
      setComposerOpen(false);
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not send', 'error');
    }
  }

  return (
    <div className="mx-auto w-full max-w-md px-4 pb-10">
      <header className="flex items-center gap-3 pb-5 pt-7 safe-top">
        <LogoMark size={40} />
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-[22px] font-extrabold leading-tight tracking-tight text-cream">
            {ownerName}&apos;s FAST FORWARD
          </h1>
          <p className="text-xs font-semibold text-slate">
            Hi {viewerName} — here&apos;s how it&apos;s going.
          </p>
        </div>
      </header>

      {owners.length > 1 ? (
        <div className="mb-4 flex gap-1 rounded-xl bg-surface p-1">
          {owners.map((o) => (
            <button
              key={o.id}
              onClick={() => router.push(`/family?owner=${o.id}`)}
              className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
                o.id === ownerId ? 'bg-lime text-midnight' : 'text-slate'
              }`}
            >
              {o.name}
            </button>
          ))}
        </div>
      ) : null}

      <div className="space-y-3">
        {snapshot.popStreak !== null ? (
          <div className="ff-card">
            <div className="ff-label text-coral">The Pop Pact</div>
            <div className="mt-1 text-[2.4rem] font-black leading-none tracking-tight text-cream">
              {snapshot.popStreak}
              <span className="ml-2 text-lg font-bold text-slate">
                day{snapshot.popStreak === 1 ? '' : 's'} pop-free
              </span>
            </div>
            {snapshot.promiseKeptToday ? (
              <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
                <span className="grid h-6 w-6 place-items-center rounded-lg bg-mint text-midnight">
                  <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                </span>
                <span className="text-xs font-bold uppercase tracking-wider text-mint">Promise kept today</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {snapshot.walkMinutes !== null ? (
          <div className="ff-card flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-midnight text-lg">🚶</span>
            <div className="min-w-0 flex-1">
              <div className="ff-label text-mint">Movement today</div>
              <div className="text-2xl font-extrabold text-cream">
                {snapshot.walkMinutes}
                <span className="text-sm font-bold text-slate"> minutes</span>
              </div>
              {snapshot.walkMeters ? (
                <p className="text-[11px] text-slate">{formatDistance(snapshot.walkMeters, units.distance)}</p>
              ) : null}
            </div>
          </div>
        ) : null}

        {snapshot.latestRuck || snapshot.packCurrentKg !== null ? (
          <div className="ff-card">
            <div className="ff-label text-lime">Pack It Forward</div>
            {snapshot.packCurrentKg !== null ? (
              <div className="mt-1 text-2xl font-extrabold text-cream">
                {weightRounded(snapshot.packCurrentKg)}
                <span className="text-sm font-bold text-slate"> pack</span>
              </div>
            ) : null}
            {snapshot.latestRuck ? (
              <p className="mt-1 text-xs text-slate">
                Last ruck {snapshot.latestRuck.when} ·{' '}
                {snapshot.latestRuck.distanceMeters
                  ? `${formatDistance(snapshot.latestRuck.distanceMeters, units.distance)} · `
                  : ''}
                {snapshot.latestRuck.durationMinutes} min
              </p>
            ) : null}
            {snapshot.percentOfLoss !== null && snapshot.lostKg && snapshot.lostKg > 0 ? (
              <p className="mt-3 border-t border-white/[0.06] pt-3 text-[13px] leading-relaxed text-cream/85">
                {snapshot.percentOfLoss}% of the weight {ownerName} has lost is now weight they{' '}
                <span className="font-bold text-lime">choose</span> to carry.
              </p>
            ) : null}
          </div>
        ) : null}

        {snapshot.weightLostKg !== null && snapshot.weightLostKg > 0 ? (
          <div className="ff-card flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-midnight text-lg">📉</span>
            <div>
              <div className="ff-label">Progress</div>
              <div className="text-2xl font-extrabold text-cream">
                {weight(snapshot.weightLostKg)}
                <span className="text-sm font-bold text-slate"> down</span>
              </div>
            </div>
          </div>
        ) : null}

        {snapshot.habits.length > 0 ? (
          <div className="ff-card">
            <div className="mb-3 flex items-center justify-between">
              <div className="ff-label text-lime">Tiny Wins today</div>
              <span className="text-xs font-bold text-slate">
                {snapshot.votesCast} of {snapshot.votesTotal}
              </span>
            </div>
            <ul className="space-y-1.5">
              {snapshot.habits.map((habit) => (
                <li key={habit.id} className="flex items-center gap-3">
                  <span
                    className={`grid h-5 w-5 shrink-0 place-items-center rounded-md ${
                      habit.done ? 'bg-mint text-midnight' : 'border-2 border-white/15 text-transparent'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <span className={`text-sm ${habit.done ? 'font-semibold text-cream' : 'text-slate'}`}>
                    {habit.name}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {snapshot.photos.length > 0 ? (
          <div className="ff-card">
            <div className="ff-label mb-3">Shared photos</div>
            <div className="grid grid-cols-3 gap-2">
              {snapshot.photos.map((photo) => (
                <div key={photo.id} className="overflow-hidden rounded-xl bg-midnight">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${photo.id}/file`}
                    alt={`Progress photo from ${photo.when}`}
                    className="aspect-[3/4] w-full object-cover"
                    loading="lazy"
                  />
                  <div className="px-1.5 py-1 text-[9px] font-semibold text-slate">{photo.when}</div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        {snapshot.achievements.length > 0 ? (
          <div className="ff-card">
            <div className="ff-label mb-3">Recent milestones</div>
            <ul className="space-y-2">
              {snapshot.achievements.map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lime/12 text-sm">🏆</span>
                  <span className="flex-1 text-sm font-semibold text-cream">{a.label}</span>
                  <span className="text-[11px] text-slate">{a.when}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>

      <button onClick={() => setComposerOpen(true)} className="ff-btn-primary mt-5 w-full py-4 text-base">
        Send encouragement 💚
      </button>
      {messagesSent > 0 ? (
        <p className="mt-2 text-center text-[11px] text-slate">
          You&apos;ve sent {messagesSent} message{messagesSent === 1 ? '' : 's'}.
        </p>
      ) : null}

      <p className="mt-6 text-center text-[11px] text-slate/60">
        Read-only view · Small choices. Kept promises. More life.
      </p>
      <form action="/api/auth/logout" method="post" className="mt-4">
        <button className="ff-btn-ghost w-full text-xs">Sign out</button>
      </form>

      <Sheet open={composerOpen} onClose={() => setComposerOpen(false)} title="Cheer them on">
        <div className="mb-3 flex flex-wrap gap-2">
          {QUICK_CHEERS.map((cheer) => (
            <button
              key={cheer}
              onClick={() => setMessage(cheer)}
              className="rounded-full bg-midnight px-3 py-1.5 text-[11px] font-semibold text-slate transition active:scale-95"
            >
              {cheer}
            </button>
          ))}
        </div>
        <textarea
          className="ff-input min-h-[7rem] resize-none"
          placeholder={`Say something to ${ownerName}…`}
          maxLength={500}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <div className="mt-1 text-right text-[11px] text-slate">{message.length}/500</div>
        <button disabled={busy || !message.trim()} onClick={send} className="ff-btn-primary mt-3 w-full py-3.5">
          Send it
        </button>
        <p className="mt-3 text-center text-[11px] text-slate">
          {role === 'FAMILY_VIEWER' ? 'They might pin this one.' : 'Goes straight to their inbox.'}
        </p>
      </Sheet>
    </div>
  );
}
