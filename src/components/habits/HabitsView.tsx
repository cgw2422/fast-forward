'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { EMPTY_STATES } from '@/lib/copy';

export type Habit = {
  id: string;
  name: string;
  identityStatement: string | null;
  cue: string | null;
  stack: string | null;
  goalLabel: string | null;
  tinyGoalLabel: string | null;
  scheduleDays: number[];
  reminderEnabled: boolean;
  reminderTime: string | null;
  notes: string | null;
  active: boolean;
  status: string | null;
  reps30: number;
};

const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const EMPTY_FORM = {
  name: '',
  identityStatement: '',
  cue: '',
  stack: '',
  goalLabel: '',
  tinyGoalLabel: '',
  scheduleDays: [0, 1, 2, 3, 4, 5, 6],
  reminderEnabled: false,
  reminderTime: '18:00',
  notes: '',
  active: true,
};

export function HabitsView({ habits, todayIndex }: { habits: Habit[]; todayIndex: number }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState<'today' | 'all'>('today');
  const [editing, setEditing] = useState<Habit | null>(null);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const scheduledToday = habits.filter((h) => h.active && h.scheduleDays.includes(todayIndex));
  const visible = tab === 'today' ? scheduledToday : habits;
  const votes = scheduledToday.filter((h) => h.status && h.status !== 'SKIPPED').length;

  async function setStatus(habit: Habit, status: string | null) {
    setBusy(true);
    const response = await fetch('/api/habits/complete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ habitId: habit.id, status }),
    });
    setBusy(false);
    if (response.ok) {
      if (status === 'TINY') toast('Tiny Win counts. ⚡');
      else if (status) toast('Vote cast. ⏩');
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  function openEdit(habit: Habit) {
    setForm({
      name: habit.name,
      identityStatement: habit.identityStatement ?? '',
      cue: habit.cue ?? '',
      stack: habit.stack ?? '',
      goalLabel: habit.goalLabel ?? '',
      tinyGoalLabel: habit.tinyGoalLabel ?? '',
      scheduleDays: habit.scheduleDays,
      reminderEnabled: habit.reminderEnabled,
      reminderTime: habit.reminderTime ?? '18:00',
      notes: habit.notes ?? '',
      active: habit.active,
    });
    setEditing(habit);
  }

  async function save() {
    if (!form.name.trim()) {
      toast('Give it a name', 'error');
      return;
    }
    setBusy(true);
    const payload = {
      ...(editing ? { id: editing.id } : {}),
      name: form.name.trim(),
      identityStatement: form.identityStatement || null,
      cue: form.cue || null,
      stack: form.stack || null,
      goalLabel: form.goalLabel || null,
      tinyGoalLabel: form.tinyGoalLabel || null,
      scheduleDays: form.scheduleDays,
      reminderEnabled: form.reminderEnabled,
      reminderTime: form.reminderEnabled ? form.reminderTime : null,
      notes: form.notes || null,
      active: form.active,
    };
    const response = await fetch('/api/habits', {
      method: editing ? 'PATCH' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setBusy(false);
    if (response.ok) {
      toast(editing ? 'Saved' : 'Habit added');
      setEditing(null);
      setCreating(false);
      setForm({ ...EMPTY_FORM });
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not save', 'error');
    }
  }

  async function remove(id: string) {
    const response = await fetch(`/api/habits?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    setEditing(null);
    if (response.ok) {
      toast('Deleted', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2">
      <div className="flex gap-1 rounded-xl bg-surface p-1">
        {(['today', 'all'] as const).map((key) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-bold transition ${
              tab === key ? 'bg-lime text-midnight' : 'text-slate'
            }`}
          >
            {key === 'today' ? 'Today' : 'All Habits'}
          </button>
        ))}
      </div>

      {tab === 'today' && scheduledToday.length > 0 ? (
        <p className="px-1 text-xs font-semibold text-slate">
          {votes} of {scheduledToday.length} votes cast today.
        </p>
      ) : null}

      {visible.length === 0 ? (
        <div className="ff-card py-10 text-center">
          <p className="text-sm text-slate">{EMPTY_STATES.habits}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {visible.map((habit) => {
            const done = habit.status === 'DONE' || habit.status === 'TINY';
            return (
              <li key={habit.id} className="ff-card">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => setStatus(habit, done ? null : 'DONE')}
                    disabled={busy}
                    aria-label={done ? 'Undo' : 'Mark complete'}
                    className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 transition ${
                      done ? 'border-mint bg-mint text-midnight' : 'border-white/15 text-transparent'
                    }`}
                  >
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </button>

                  <button onClick={() => openEdit(habit)} className="min-w-0 flex-1 text-left">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-cream">{habit.name}</span>
                      {habit.status === 'TINY' ? (
                        <span className="rounded-full bg-lime/15 px-2 py-0.5 text-[9px] font-black text-lime">
                          TINY WIN
                        </span>
                      ) : null}
                      {!habit.active ? (
                        <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold text-slate">
                          PAUSED
                        </span>
                      ) : null}
                    </div>
                    {habit.identityStatement ? (
                      <p className="mt-0.5 text-[11px] italic text-slate">&ldquo;{habit.identityStatement}&rdquo;</p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {habit.goalLabel ? (
                        <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate">
                          {habit.goalLabel}
                        </span>
                      ) : null}
                      {habit.tinyGoalLabel ? (
                        <span className="rounded-md bg-lime/10 px-2 py-0.5 text-[10px] font-semibold text-lime/90">
                          Tiny: {habit.tinyGoalLabel}
                        </span>
                      ) : null}
                      <span className="rounded-md bg-white/[0.06] px-2 py-0.5 text-[10px] font-semibold text-slate">
                        {habit.reps30}× in 30d
                      </span>
                    </div>
                    {habit.cue || habit.stack ? (
                      <div className="mt-2 space-y-0.5 border-t border-white/[0.05] pt-2">
                        {habit.cue ? <p className="text-[11px] text-slate/80">Cue: {habit.cue}</p> : null}
                        {habit.stack ? <p className="text-[11px] text-slate/80">Stack: {habit.stack}</p> : null}
                      </div>
                    ) : null}
                  </button>
                </div>

                {/* Never all-or-nothing: the minimum version is always one tap away. */}
                {!done && habit.tinyGoalLabel ? (
                  <button
                    onClick={() => setStatus(habit, 'TINY')}
                    disabled={busy}
                    className="mt-3 w-full rounded-xl border border-lime/25 bg-lime/[0.07] py-2 text-[12px] font-bold text-lime transition active:scale-[0.99]"
                  >
                    ⚡ Just the Tiny Win — {habit.tinyGoalLabel}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}

      <button
        onClick={() => {
          setForm({ ...EMPTY_FORM });
          setCreating(true);
        }}
        className="ff-btn-primary w-full py-3.5"
      >
        + Add Habit
      </button>

      <Sheet
        open={creating || editing !== null}
        onClose={() => {
          setCreating(false);
          setEditing(null);
        }}
        title={editing ? 'Edit habit' : 'New habit'}
      >
        <div className="space-y-3">
          <Field label="Name">
            <input
              className="ff-input"
              placeholder="Walk daily"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </Field>
          <Field label="Identity statement" hint="Who does this make you?">
            <input
              className="ff-input"
              placeholder="I'm a dad who has the energy to play with his kids."
              value={form.identityStatement}
              onChange={(e) => setForm({ ...form, identityStatement: e.target.value })}
            />
          </Field>
          <Field label="Cue" hint="When does it happen?">
            <input
              className="ff-input"
              placeholder="When I get home from work."
              value={form.cue}
              onChange={(e) => setForm({ ...form, cue: e.target.value })}
            />
          </Field>
          <Field label="Habit stack" hint="What does it attach to?">
            <input
              className="ff-input"
              placeholder="After I change clothes → put on shoes → walk."
              value={form.stack}
              onChange={(e) => setForm({ ...form, stack: e.target.value })}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Normal goal">
              <input
                className="ff-input"
                placeholder="30 minutes"
                value={form.goalLabel}
                onChange={(e) => setForm({ ...form, goalLabel: e.target.value })}
              />
            </Field>
            <Field label="Tiny Win">
              <input
                className="ff-input"
                placeholder="5 minutes"
                value={form.tinyGoalLabel}
                onChange={(e) => setForm({ ...form, tinyGoalLabel: e.target.value })}
              />
            </Field>
          </div>

          <Field label="Schedule">
            <div className="flex gap-1.5">
              {DAY_LETTERS.map((letter, index) => {
                const on = form.scheduleDays.includes(index);
                return (
                  <button
                    key={index}
                    type="button"
                    onClick={() =>
                      setForm({
                        ...form,
                        scheduleDays: on
                          ? form.scheduleDays.filter((d) => d !== index)
                          : [...form.scheduleDays, index].sort(),
                      })
                    }
                    className={`h-9 flex-1 rounded-lg text-xs font-bold transition ${
                      on ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
                    }`}
                  >
                    {letter}
                  </button>
                );
              })}
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-xl bg-midnight px-4 py-3">
            <span className="text-sm font-semibold text-cream">Reminder</span>
            <input
              type="checkbox"
              checked={form.reminderEnabled}
              onChange={(e) => setForm({ ...form, reminderEnabled: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-white/15 transition checked:bg-lime"
            />
          </label>
          {form.reminderEnabled ? (
            <input
              className="ff-input"
              type="time"
              value={form.reminderTime}
              onChange={(e) => setForm({ ...form, reminderTime: e.target.value })}
            />
          ) : null}

          <label className="flex items-center justify-between rounded-xl bg-midnight px-4 py-3">
            <span className="text-sm font-semibold text-cream">Active</span>
            <input
              type="checkbox"
              checked={form.active}
              onChange={(e) => setForm({ ...form, active: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-white/15 transition checked:bg-lime"
            />
          </label>

          <Field label="Notes">
            <textarea
              className="ff-input min-h-[4rem] resize-none"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </Field>

          <button disabled={busy} onClick={save} className="ff-btn-primary w-full py-3.5">
            {editing ? 'Save changes' : 'Add habit'}
          </button>
          {editing ? (
            <button onClick={() => setConfirmDelete(editing.id)} className="ff-btn-ghost w-full text-xs">
              Delete habit
            </button>
          ) : null}
        </div>
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this habit?"
        body="Its completion history goes with it. If you just want to stop tracking it for now, turn Active off instead."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="ff-label mb-1.5 block">
        {label}
        {hint ? <span className="ml-2 font-medium normal-case tracking-normal text-slate/70">{hint}</span> : null}
      </label>
      {children}
    </div>
  );
}
