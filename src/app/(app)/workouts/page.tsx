import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { WorkoutsView } from '@/components/WorkoutsView';
import { kgToDisplay, metersToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function WorkoutsPage() {
  const ctx = await getContext();

  const [exercises, workouts] = await Promise.all([
    prisma.exercise.findMany({
      where: { userId: ctx.user.id, archived: false },
      orderBy: { name: 'asc' },
    }),
    prisma.workout.findMany({
      where: { userId: ctx.user.id },
      orderBy: { startedAt: 'desc' },
      take: 20,
      include: {
        exercises: { include: { exercise: true, sets: true }, orderBy: { sortOrder: 'asc' } },
      },
    }),
  ]);

  return (
    <>
      <PageHeader title="Workouts" subtitle="Muscles await instructions." backHref="/move" />
      <WorkoutsView
        weightUnit={ctx.prefs.weightUnit}
        distanceUnit={ctx.prefs.distanceUnit}
        exercises={exercises.map((e) => ({
          id: e.id,
          name: e.name,
          category: e.category,
          tracksSets: e.tracksSets,
          tracksReps: e.tracksReps,
          tracksWeight: e.tracksWeight,
          tracksDuration: e.tracksDuration,
          tracksDistance: e.tracksDistance,
        }))}
        workouts={workouts.map((w) => ({
          id: w.id,
          name: w.name,
          when: formatDate(w.startedAt, ctx.timezone, 'MMM d, yyyy'),
          exercises: w.exercises.map((we) => ({
            name: we.exercise.name,
            sets: we.sets
              .sort((a, b) => a.setNumber - b.setNumber)
              .map((s) => ({
                reps: s.reps,
                weight: s.weightKg !== null ? Number(kgToDisplay(s.weightKg, ctx.prefs.weightUnit).toFixed(1)) : null,
                durationSec: s.durationSec,
                distance:
                  s.distanceM !== null ? Number(metersToDisplay(s.distanceM, ctx.prefs.distanceUnit).toFixed(2)) : null,
              })),
          })),
        }))}
      />
    </>
  );
}
