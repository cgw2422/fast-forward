import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { displayToKg, displayToMeters } from '@/lib/units';

const setSchema = z.object({
  reps: z.number().int().nonnegative().nullable().optional(),
  weight: z.number().nonnegative().nullable().optional(),
  durationSec: z.number().int().nonnegative().nullable().optional(),
  distance: z.number().nonnegative().nullable().optional(),
  notes: z.string().max(200).nullable().optional(),
});

const schema = z.object({
  name: z.string().min(1).max(80),
  templateId: z.string().nullable().optional(),
  startedAt: z.string().datetime().optional(),
  endedAt: z.string().datetime().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  exercises: z
    .array(
      z.object({
        exerciseId: z.string(),
        notes: z.string().max(200).nullable().optional(),
        sets: z.array(setSchema),
      })
    )
    .default([]),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const input = parsed.data;
    const startedAt = input.startedAt ? new Date(input.startedAt) : new Date();

    // Guards against a client sending someone else's exercise ids.
    const ids = input.exercises.map((e) => e.exerciseId);
    if (ids.length > 0) {
      const owned = await prisma.exercise.count({ where: { id: { in: ids }, userId: ctx.user.id } });
      if (owned !== new Set(ids).size) throw new Error('Unknown exercise in this workout');
    }

    const workout = await prisma.workout.create({
      data: {
        userId: ctx.user.id,
        templateId: input.templateId ?? null,
        name: input.name,
        startedAt,
        endedAt: input.endedAt ? new Date(input.endedAt) : new Date(),
        notes: input.notes ?? null,
        exercises: {
          create: input.exercises.map((exercise, index) => ({
            exerciseId: exercise.exerciseId,
            sortOrder: index,
            notes: exercise.notes ?? null,
            sets: {
              create: exercise.sets.map((set, setIndex) => ({
                setNumber: setIndex + 1,
                reps: set.reps ?? null,
                weightKg: set.weight != null ? displayToKg(set.weight, ctx.prefs.weightUnit) : null,
                durationSec: set.durationSec ?? null,
                distanceM: set.distance != null ? displayToMeters(set.distance, ctx.prefs.distanceUnit) : null,
                notes: set.notes ?? null,
              })),
            },
          })),
        },
      },
    });

    const setCount = input.exercises.reduce((sum, e) => sum + e.sets.length, 0);
    await logTimeline({
      userId: ctx.user.id,
      type: 'WORKOUT',
      occurredAt: startedAt,
      title: input.name,
      detail: `${input.exercises.length} exercise${input.exercises.length === 1 ? '' : 's'} · ${setCount} set${setCount === 1 ? '' : 's'}`,
      refId: workout.id,
    });

    return { ok: true, workoutId: workout.id };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.workout.deleteMany({ where: { id, userId: ctx.user.id } });
    await removeTimelineFor('WORKOUT', id);
    return { ok: true };
  });
}
