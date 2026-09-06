'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PopGoblin } from '@/components/PopGoblin';
import { Sheet, ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { POP_COPY } from '@/lib/copy';

type Props = {
  days: number;
  totalDays: number;
  startLabel: string;
  startInput: string;
  longestStreak: number;
  reason: string;
  reasons: { id: string; text: string }[];
  earned: { key: string; days: number; label: string }[];
  next: { days: number; label: string } | null;
  history: { id: string; type: string; when: string; note: string | null }[];
};

const EVENT_LABEL: Record<string, string> = {
  SLIP: 'Had a pop',
  CRAVING_RESISTED: 'Craving resisted',
  DISTRACTION_USED: 'Used a distraction',
  MILESTONE: 'Milestone',
  NOTE: 'Note',
};

export function PopPactView(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [editReason, setEditReason] = useState(false);
  const [reasonDraft, setReasonDraft] = useState(props.reason);
  const [newReason, setNewReason] = useState('');
  const [confirmSlip, setConfirmSlip] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [startDraft, setStartDraft] = useState(props.startInput);

  async function post(body: Record<string, unknown>, successMessage?: string) {
    const response = await fetch('/api/pop-pact', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      toast(data.error ?? 'Could not save', 'error');
      return false;
    }
    if (successMessage ?? data.message) toast(successMessage ?? data.message);
    router.refresh();
    return true;
  }

  return (
    <div className="animate-fade-up space-y-3 pt-1">
      {/* headline streak */}
      <div className="ff-card relative overflow-hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-[2.35rem] font-black leading-[0.95] tracking-tight text-cream">
              {props.days} day{props.days === 1 ? '' : 's'}
              <br />
              <span className="text-lime">pop-free!</span>
            </h2>
            <p className="mt-2 text-xs font-semibold text-slate">Since {props.startLabel}</p>
          </div>
          <PopGoblin size={86} mood="defeated" />
        </div>
      </div>

      {/* why */}
      <div className="ff-card">
        <div className="ff-label mb-2 text-coral">Why I made the deal</div>
        <p className="text-[15px] leading-relaxed text-cream">&ldquo;{props.reason}&rdquo;</p>
        <div className="mt-3 flex items-center gap-2 border-t border-white/[0.06] pt-3">
          <span className="text-coral">❤️</span>
          <span className="text-xs font-semibold text-slate">That&apos;s the real reason.</span>
          <button
            onClick={() => {
              setReasonDraft(props.reason);
              setEditReason(true);
            }}
            className="ml-auto text-xs font-bold text-lime"
          >
            Edit
          </button>
        </div>
      </div>

      {/* metrics */}
      <div className="grid grid-cols-2 gap-3">
        <div className="ff-card">
          <div className="ff-label">Days Moving Forward</div>
          <div className="ff-metric mt-1">{props.totalDays}</div>
          <p className="mt-1 text-[11px] text-slate">Since the pact began</p>
        </div>
        <div className="ff-card">
          <div className="ff-label">Longest Streak</div>
          <div className="ff-metric mt-1">{props.longestStreak}</div>
          <p className="mt-1 text-[11px] text-slate">Days in a row</p>
        </div>
      </div>

      {/* craving button */}
      <Link href="/pop-pact/craving" className="ff-btn-primary w-full py-4 text-base">
        I&apos;m craving pop
      </Link>
      <p className="text-center text-sm font-bold text-lime">{POP_COPY.notToday}</p>

      {/* milestones */}
      <div className="ff-card">
        <div className="ff-label mb-3">Milestones</div>
        <ul className="space-y-2">
          {props.earned.map((m) => (
            <li key={m.key} className="flex items-center gap-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-lime/15 text-xs">🏆</span>
              <span className="flex-1 text-sm font-semibold text-cream">{m.label}</span>
              <span className="text-xs text-slate">{m.days}d</span>
            </li>
          ))}
          {props.next ? (
            <li className="flex items-center gap-3 opacity-55">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-white/[0.05] text-xs">🔒</span>
              <span className="flex-1 text-sm font-semibold text-cream">{props.next.label}</span>
              <span className="text-xs text-slate">{props.next.days - props.days}d to go</span>
            </li>
          ) : null}
        </ul>
      </div>

      {/* reasons list */}
      <div className="ff-card">
        <div className="ff-label mb-3">Why I&apos;m Moving Forward</div>
        <ul className="space-y-2">
          {props.reasons.map((r) => (
            <li key={r.id} className="group flex items-start gap-2.5">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-lime" />
              <span className="flex-1 text-sm text-cream/90">{r.text}</span>
              <button
                onClick={() => post({ action: 'remove_reason', reasonId: r.id })}
                aria-label="Remove reason"
                className="text-slate transition hover:text-coral"
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (!newReason.trim()) return;
            if (await post({ action: 'add_reason', text: newReason.trim() }, 'Reason added')) setNewReason('');
          }}
          className="mt-3 flex gap-2"
        >
          <input
            className="ff-input flex-1 py-2.5 text-sm"
            placeholder="Add a reason…"
            value={newReason}
            onChange={(e) => setNewReason(e.target.value)}
          />
          <button type="submit" className="ff-btn-secondary px-4">
            Add
          </button>
        </form>
      </div>

      {/* history */}
      <div className="ff-card">
        <div className="mb-3 flex items-center justify-between">
          <div className="ff-label">History</div>
          <button onClick={() => setSettingsOpen(true)} className="text-xs font-bold text-lime">
            Pact settings
          </button>
        </div>
        {props.history.length === 0 ? (
          <p className="py-2 text-sm text-slate">Nothing logged yet. The streak speaks for itself.</p>
        ) : (
          <ul className="space-y-2.5">
            {props.history.map((e) => (
              <li key={e.id} className="flex items-start gap-3">
                <span
                  className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${
                    e.type === 'SLIP' ? 'bg-coral' : 'bg-mint'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold text-cream">{EVENT_LABEL[e.type] ?? e.type}</div>
                  <div className="text-[11px] text-slate">{e.when}</div>
                  {e.note ? <div className="mt-0.5 text-xs text-slate">{e.note}</div> : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* honest logging — never framed as failure */}
      <button onClick={() => setConfirmSlip(true)} className="ff-btn-ghost w-full text-xs">
        I had a pop — log it honestly
      </button>

      <Sheet open={editReason} onClose={() => setEditReason(false)} title="Why I made the deal">
        <textarea
          className="ff-input min-h-[7rem] resize-none"
          value={reasonDraft}
          onChange={(e) => setReasonDraft(e.target.value)}
        />
        <button
          onClick={async () => {
            if (await post({ action: 'update_reason', reason: reasonDraft }, 'Saved')) setEditReason(false);
          }}
          className="ff-btn-primary mt-3 w-full"
        >
          Save
        </button>
      </Sheet>

      <Sheet open={settingsOpen} onClose={() => setSettingsOpen(false)} title="Pact settings">
        <label className="ff-label mb-2 block">Start date</label>
        <input
          type="date"
          className="ff-input"
          value={startDraft}
          onChange={(e) => setStartDraft(e.target.value)}
        />
        <p className="mt-2 text-xs text-slate">Changing this resets the current streak to the new start date.</p>
        <button
          onClick={async () => {
            if (await post({ action: 'set_start', startDate: startDraft }, 'Updated')) setSettingsOpen(false);
          }}
          className="ff-btn-primary mt-4 w-full"
        >
          Save start date
        </button>
      </Sheet>

      <ConfirmDialog
        open={confirmSlip}
        title="Log a pop"
        body="This records the date and restarts the streak. No judgment — the history is just data, and today can be day one again."
        confirmLabel="Log it"
        onCancel={() => setConfirmSlip(false)}
        onConfirm={async () => {
          setConfirmSlip(false);
          await post({ action: 'slip' });
        }}
      />
    </div>
  );
}
