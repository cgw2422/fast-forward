import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline } from '@/lib/timeline';
import { todayKey } from '@/lib/dates';

const schema = z.object({
  habitId: z.string(),
  status: z.enum(['DONE', 'TINY', 'SKIPPED']).nullable(),
  date: z.string().optional(),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const habit = await prisma.habit.findFirst({
      where: { id: parsed.data.habitId, userId: ctx.user.id },
    });
    if (!habit) throw new Error('Habit not found');

    const date = parsed.data.date
      ? new Date(`${parsed.data.date}T00:00:00.000Z`)
      : todayKey(ctx.timezone);

    // null clears the vote — tapping a checked box unchecks it.
    if (parsed.data.status === null) {
      await prisma.habitCompletion.deleteMany({ where: { habitId: habit.id, date } });
      return { ok: true, status: null };
    }

    await prisma.habitCompletion.upsert({
      where: { habitId_date: { habitId: habit.id, date } },
      update: { status: parsed.data.status, completedAt: new Date(), note: parsed.data.note ?? null },
      create: {
        habitId: habit.id,
        date,
        status: parsed.data.status,
        note: parsed.data.note ?? null,
      },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'HABIT',
      occurredAt: new Date(),
      title: habit.name,
      detail: parsed.data.status === 'TINY' ? `Tiny Win — ${habit.tinyGoalLabel ?? 'minimum version'}` : 'Vote cast',
      refId: habit.id,
    });

    return { ok: true, status: parsed.data.status };
  });
}
