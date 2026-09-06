'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { weightLabel, distanceLabel, type WeightUnit, type DistanceUnit } from '@/lib/units';
import { EMPTY_STATES } from '@/lib/copy';

type Exercise = {
  id: string;
  name: string;
  category: string | null;
  tracksSets: boolean;
  tracksReps: boolean;
  tracksWeight: boolean;
  tracksDuration: boolean;
  tracksDistance: boolean;
};

type DraftSet = { reps: string; weight: string; durationSec: string; distance: string };
type DraftExercise = { exercise: Exercise; sets: DraftSet[] };

const EMPTY_SET: DraftSet = { reps: '', weight: '', durationSec: '', distance: '' };

const NEW_EXERCISE = {
  name: '',
  category: '',
  tracksSets: true,
  tracksReps: true,
  tracksWeight: true,
  tracksDuration: false,
  tracksDistance: false,
};

export function WorkoutsView({
  exercises,
  workouts,
  weightUnit,
  distanceUnit,
}: {
  exercises: Exercise[];
  workouts: {
    id: string;
    name: string;
    when: string;
    exercises: {
      name: string;
      sets: { reps: number | null; weight: number | null; durationSec: number | null; distance: number | null }[];
    }[];
  }[];
  weightUnit: WeightUnit;
  distanceUnit: DistanceUnit;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [building, setBuilding] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [newExerciseOpen, setNewExerciseOpen] = useState(false);
  const [newExercise, setNewExercise] = useState({ ...NEW_EXERCISE });
  const [name, setName] = useState('');
  const [draft, setDraft] = useState<DraftExercise[]>([]);
  const [busy, setBusy] = useState(false);

  function addExercise(exercise: Exercise) {
    setDraft([...draft, { exercise, sets: [{ ...EMPTY_SET }] }]);
    setPickerOpen(false);
  }

  function updateSet(exIndex: number, setIndex: number, field: keyof DraftSet, value: string) {
    const next = [...draft];
    next[exIndex] = {
      ...next[exIndex],
      sets: next[exIndex].sets.map((s, i) => (i === setIndex ? { ...s, [field]: value } : s)),
    };
    setDraft(next);
  }

  async function saveWorkout() {
    if (!name.trim()) {
      toast('Name the workout', 'error');
      return;
    }
    if (draft.length === 0) {
      toast('Add at least one exercise', 'error');
      return;
    }
    setBusy(true);
    const response = await fetch('/api/workouts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: name.trim(),
        exercises: draft.map((d) => ({
          exerciseId: d.exercise.id,
          sets: d.sets.map((s) => ({
            reps: s.reps ? Number(s.reps) : null,
            weight: s.weight ? Number(s.weight) : null,
            durationSec: s.durationSec ? Math.round(Number(s.durationSec) * 60) : null,
            distance: s.distance ? Number(s.distance) : null,
          })),
        })),
      }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Workout logged 🏋️');
      setBuilding(false);
      setDraft([]);
      setName('');
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not save', 'error');
    }
  }

  async function createExercise() {
    if (!newExercise.name.trim()) return;
    setBusy(true);
    const response = await fetch('/api/exercises', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...newExercise, name: newExercise.name.trim(), category: newExercise.category || null }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Exercise added');
      setNewExercise({ ...NEW_EXERCISE });
      setNewExerciseOpen(false);
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not save', 'error');
    }
  }

  if (building) {
    return (
      <div className="animate-fade-up space-y-3 pt-2 pb-4">
        <input
          className="ff-input text-lg font-bold"
          placeholder="Workout name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
        />

        {draft.map((item, exIndex) => (
          <div key={`${item.exercise.id}-${exIndex}`} className="ff-card">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-sm font-bold text-cream">{item.exercise.name}</span>
              <button
                onClick={() => setDraft(draft.filter((_, i) => i !== exIndex))}
                className="text-xs font-bold text-slate hover:text-coral"
              >
                Remove
              </button>
            </div>

            <div className="space-y-2">
              {item.sets.map((set, setIndex) => (
                <div key={setIndex} className="flex items-center gap-2">
                  <span className="w-5 shrink-0 text-xs font-bold text-slate">{setIndex + 1}</span>
                  {/* Only the fields this exercise actually tracks. */}
                  {item.exercise.tracksReps ? (
                    <input
                      className="ff-input px-2 py-2 text-center text-sm"
                      type="number"
                      inputMode="numeric"
                      placeholder="reps"
                      value={set.reps}
                      onChange={(e) => updateSet(exIndex, setIndex, 'reps', e.target.value)}
                    />
                  ) : null}
                  {item.exercise.tracksWeight ? (
                    <input
                      className="ff-input px-2 py-2 text-center text-sm"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder={weightLabel(weightUnit)}
                      value={set.weight}
                      onChange={(e) => updateSet(exIndex, setIndex, 'weight', e.target.value)}
                    />
                  ) : null}
                  {item.exercise.tracksDuration ? (
                    <input
                      className="ff-input px-2 py-2 text-center text-sm"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder="min"
                      value={set.durationSec}
                      onChange={(e) => updateSet(exIndex, setIndex, 'durationSec', e.target.value)}
                    />
                  ) : null}
                  {item.exercise.tracksDistance ? (
                    <input
                      className="ff-input px-2 py-2 text-center text-sm"
                      type="number"
                      inputMode="decimal"
                      step="any"
                      placeholder={distanceLabel(distanceUnit)}
                      value={set.distance}
                      onChange={(e) => updateSet(exIndex, setIndex, 'distance', e.target.value)}
                    />
                  ) : null}
                </div>
              ))}
            </div>

            {item.exercise.tracksSets ? (
              <button
                onClick={() => {
                  const next = [...draft];
                  next[exIndex] = { ...item, sets: [...item.sets, { ...EMPTY_SET }] };
                  setDraft(next);
                }}
                className="mt-3 w-full rounded-xl border border-white/10 py-2 text-xs font-bold text-slate"
              >
                + Add set
              </button>
            ) : null}
          </div>
        ))}

        <button onClick={() => setPickerOpen(true)} className="ff-btn-secondary w-full py-3.5">
          + Add exercise
        </button>
        <button disabled={busy} onClick={saveWorkout} className="ff-btn-primary w-full py-3.5">
          Save workout
        </button>
        <button
          onClick={() => {
            setBuilding(false);
            setDraft([]);
          }}
          className="ff-btn-ghost w-full text-xs"
        >
          Cancel
        </button>

        <ExercisePicker
          open={pickerOpen}
          onClose={() => setPickerOpen(false)}
          exercises={exercises}
          onPick={addExercise}
          onCreate={() => {
            setPickerOpen(false);
            setNewExerciseOpen(true);
          }}
        />
        <NewExerciseSheet
          open={newExerciseOpen}
          onClose={() => setNewExerciseOpen(false)}
          value={newExercise}
          onChange={setNewExercise}
          onSave={createExercise}
          busy={busy}
        />
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      <button onClick={() => setBuilding(true)} className="ff-btn-primary w-full py-4 text-base">
        Log a workout
      </button>

      {workouts.length === 0 ? (
        <div className="ff-card flex flex-col items-center gap-3 py-12 text-center">
          <span className="text-3xl">🏋️</span>
          <p className="max-w-[15rem] text-sm text-slate">{EMPTY_STATES.workouts}</p>
        </div>
      ) : (
        <ul className="space-y-2.5">
          {workouts.map((workout) => (
            <li key={workout.id} className="ff-card">
              <div className="flex items-baseline justify-between">
                <span className="text-sm font-bold text-cream">{workout.name}</span>
                <span className="text-[11px] text-slate">{workout.when}</span>
              </div>
              <ul className="mt-2 space-y-1">
                {workout.exercises.map((exercise, index) => (
                  <li key={index} className="text-[12px] text-slate">
                    <span className="font-semibold text-cream/85">{exercise.name}</span>{' '}
                    {exercise.sets
                      .map((set) =>
                        [
                          set.reps !== null ? `${set.reps}` : null,
                          set.weight !== null ? `×${set.weight}${weightLabel(weightUnit)}` : null,
                          set.durationSec !== null ? `${Math.round(set.durationSec / 60)}min` : null,
                          set.distance !== null ? `${set.distance}${distanceLabel(distanceUnit)}` : null,
                        ]
                          .filter(Boolean)
                          .join(' ')
                      )
                      .filter(Boolean)
                      .join(', ')}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      )}

      <button onClick={() => setNewExerciseOpen(true)} className="ff-btn-secondary w-full py-3">
        Manage exercises ({exercises.length})
      </button>

      <NewExerciseSheet
        open={newExerciseOpen}
        onClose={() => setNewExerciseOpen(false)}
        value={newExercise}
        onChange={setNewExercise}
        onSave={createExercise}
        busy={busy}
      />
    </div>
  );
}

function ExercisePicker({
  open,
  onClose,
  exercises,
  onPick,
  onCreate,
}: {
  open: boolean;
  onClose: () => void;
  exercises: Exercise[];
  onPick: (exercise: Exercise) => void;
  onCreate: () => void;
}) {
  const [query, setQuery] = useState('');
  const filtered = exercises.filter((e) => e.name.toLowerCase().includes(query.toLowerCase()));

  return (
    <Sheet open={open} onClose={onClose} title="Pick an exercise">
      <input
        className="ff-input mb-3"
        placeholder="Search…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <ul className="max-h-[45vh] space-y-1.5 overflow-y-auto">
        {filtered.map((exercise) => (
          <li key={exercise.id}>
            <button
              onClick={() => onPick(exercise)}
              className="w-full rounded-xl bg-midnight px-4 py-3 text-left transition active:scale-[0.99]"
            >
              <div className="text-sm font-bold text-cream">{exercise.name}</div>
              <div className="mt-0.5 text-[11px] text-slate">
                {[
                  exercise.tracksSets ? 'sets' : null,
                  exercise.tracksReps ? 'reps' : null,
                  exercise.tracksWeight ? 'weight' : null,
                  exercise.tracksDuration ? 'duration' : null,
                  exercise.tracksDistance ? 'distance' : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </div>
            </button>
          </li>
        ))}
      </ul>
      <button onClick={onCreate} className="ff-btn-secondary mt-3 w-full py-3">
        + New exercise
      </button>
    </Sheet>
  );
}

function NewExerciseSheet({
  open,
  onClose,
  value,
  onChange,
  onSave,
  busy,
}: {
  open: boolean;
  onClose: () => void;
  value: typeof NEW_EXERCISE;
  onChange: (value: typeof NEW_EXERCISE) => void;
  onSave: () => void;
  busy: boolean;
}) {
  const FIELDS = [
    { key: 'tracksSets', label: 'Sets' },
    { key: 'tracksReps', label: 'Reps' },
    { key: 'tracksWeight', label: 'Weight' },
    { key: 'tracksDuration', label: 'Duration' },
    { key: 'tracksDistance', label: 'Distance' },
  ] as const;

  return (
    <Sheet open={open} onClose={onClose} title="New exercise">
      <input
        className="ff-input"
        placeholder="Bench Press"
        value={value.name}
        onChange={(e) => onChange({ ...value, name: e.target.value })}
      />
      <input
        className="ff-input mt-3"
        placeholder="Category (optional)"
        value={value.category}
        onChange={(e) => onChange({ ...value, category: e.target.value })}
      />

      <label className="ff-label mb-2 mt-4 block">Which fields apply?</label>
      <div className="grid grid-cols-2 gap-2">
        {FIELDS.map((field) => (
          <button
            key={field.key}
            onClick={() => onChange({ ...value, [field.key]: !value[field.key] })}
            className={`rounded-xl py-2.5 text-xs font-bold transition ${
              value[field.key] ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
            }`}
          >
            {field.label}
          </button>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate">
        A plank only needs duration. Walking needs duration and distance. Don&apos;t force sets and reps onto
        everything.
      </p>

      <button disabled={busy} onClick={onSave} className="ff-btn-primary mt-4 w-full py-3.5">
        Add exercise
      </button>
    </Sheet>
  );
}
