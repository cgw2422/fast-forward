'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PopGoblin } from '@/components/PopGoblin';
import { useToast } from '@/components/ui/Toast';
import { POP_COPY, POP_DISTRACTIONS } from '@/lib/copy';

export function CravingView({ reason }: { reason: string }) {
  const router = useRouter();
  const { toast } = useToast();
  const [distraction, setDistraction] = useState<string | null>(null);
  const [showReason, setShowReason] = useState(false);
  const [busy, setBusy] = useState(false);

  async function post(action: string, note?: string) {
    await fetch('/api/pop-pact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action, note }),
    });
  }

  async function imGood() {
    setBusy(true);
    await post('craving_resisted');
    toast(POP_COPY.notToday);
    router.push('/pop-pact');
    router.refresh();
  }

  function giveDistraction() {
    const next = POP_DISTRACTIONS[Math.floor(Math.random() * POP_DISTRACTIONS.length)];
    setDistraction(next);
    void post('distraction_used', next);
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-gradient-to-b from-[#B3352F] via-[#8E2621] to-[#5A1512]">
      <div className="mx-auto flex min-h-full w-full max-w-md flex-col px-6 pb-10 pt-6 safe-top">
        <button
          onClick={() => router.back()}
          aria-label="Close"
          className="self-start rounded-full p-2 text-white/70 transition hover:text-white"
        >
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className="flex flex-col items-center pt-2 text-center">
          <div className="animate-pop-in">
            <PopGoblin size={140} mood="angry" />
          </div>
          <h1 className="mt-3 text-[2rem] font-black leading-none tracking-tight text-white">FIZZ EMERGENCY</h1>
          <p className="mt-2 text-sm font-semibold text-white/75">{POP_COPY.cravingSubtitle}</p>
        </div>

        <div className="mt-7 rounded-2xl bg-black/25 p-5 backdrop-blur-sm">
          <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">
            Why&apos;d you make the deal?
          </p>
          <p className="mt-2 text-[15px] font-semibold leading-relaxed text-white">&ldquo;{reason}&rdquo;</p>
        </div>

        {distraction ? (
          <div className="mt-4 animate-pop-in rounded-2xl border border-white/15 bg-black/20 p-5">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/60">Do this instead</p>
            <p className="mt-2 text-[15px] font-semibold text-white">{distraction}</p>
            <button onClick={giveDistraction} className="mt-3 text-xs font-bold text-white/70 underline">
              Give me another one
            </button>
          </div>
        ) : null}

        {showReason ? (
          <div className="mt-4 animate-pop-in rounded-2xl border border-white/15 bg-black/20 p-5">
            <p className="text-[15px] leading-relaxed text-white/90">
              Every time you say no, you cast a vote for the person who keeps promises. The craving passes in about
              ten minutes. The promise lasts a lot longer than that.
            </p>
          </div>
        ) : null}

        <div className="mt-auto space-y-3 pt-8">
          <button onClick={imGood} disabled={busy} className="ff-btn-primary w-full py-4 text-base">
            I&apos;M GOOD 💪
          </button>
          <button
            onClick={giveDistraction}
            className="ff-btn w-full border border-white/20 bg-white/10 py-4 text-base text-white"
          >
            Give me a distraction
          </button>
          <button
            onClick={() => setShowReason((v) => !v)}
            className="w-full py-2 text-sm font-semibold text-white/70 underline"
          >
            Remind me why this matters
          </button>
        </div>
      </div>
    </div>
  );
}
