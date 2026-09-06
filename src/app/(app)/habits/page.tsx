import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { todayKey, weekdayIndex } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { HabitsView } from '@/components/habits/HabitsView';

export const dynamic = 'force-dynamic';

export default async function HabitsPage() {
  const ctx = await getContext();
  const today = todayKey(ctx.timezone);
  const dow = weekdayIndex(new Date(), ctx.timezone);
  const since = new Date(today.getTime() - 29 * 86_400_000);

  const [habits, completions] = await Promise.all([
    prisma.habit.findMany({ where: { userId: ctx.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.habitCompletion.findMany({
      where: { habit: { userId: ctx.user.id }, date: { gte: since } },
    }),
  ]);

  const todayByHabit = new Map(
    completions.filter((c) => c.date.getTime() === today.getTime()).map((c) => [c.habitId, c.status])
  );

  // 30-day repetition count — the "successful reps" number that matters.
  const repsByHabit = new Map<string, number>();
  for (const c of completions) {
    if (c.status === 'SKIPPED') continue;
    repsByHabit.set(c.habitId, (repsByHabit.get(c.habitId) ?? 0) + 1);
  }

  return (
    <>
      <PageHeader title="Tiny Wins" subtitle="Small habits. Big change." backHref="/today" />
      <HabitsView
        todayIndex={dow}
        habits={habits.map((h) => ({
          id: h.id,
          name: h.name,
          identityStatement: h.identityStatement,
          cue: h.cue,
          stack: h.stack,
          goalLabel: h.goalLabel,
          tinyGoalLabel: h.tinyGoalLabel,
          scheduleDays: h.scheduleDays,
          reminderEnabled: h.reminderEnabled,
          reminderTime: h.reminderTime,
          notes: h.notes,
          active: h.active,
          status: todayByHabit.get(h.id) ?? null,
          reps30: repsByHabit.get(h.id) ?? 0,
        }))}
      />
    </>
  );
}
