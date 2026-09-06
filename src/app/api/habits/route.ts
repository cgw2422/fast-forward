import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';

const habitFields = {
  name: z.string().min(1).max(80),
  identityStatement: z.string().max(300).nullable().optional(),
  cue: z.string().max(300).nullable().optional(),
  stack: z.string().max(300).nullable().optional(),
  goalLabel: z.string().max(120).nullable().optional(),
  tinyGoalLabel: z.string().max(120).nullable().optional(),
  scheduleDays: z.array(z.number().int().min(0).max(6)).optional(),
  reminderEnabled: z.boolean().optional(),
  reminderTime: z.string().regex(/^\d{2}:\d{2}$/).nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  active: z.boolean().optional(),
};

export async function POST(request: Request) {
  const parsed = z.object(habitFields).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const count = await prisma.habit.count({ where: { userId: ctx.user.id } });
    const habit = await prisma.habit.create({
      data: {
        userId: ctx.user.id,
        name: parsed.data.name,
        identityStatement: parsed.data.identityStatement ?? null,
        cue: parsed.data.cue ?? null,
        stack: parsed.data.stack ?? null,
        goalLabel: parsed.data.goalLabel ?? null,
        tinyGoalLabel: parsed.data.tinyGoalLabel ?? null,
        scheduleDays: parsed.data.scheduleDays ?? [0, 1, 2, 3, 4, 5, 6],
        reminderEnabled: parsed.data.reminderEnabled ?? false,
        reminderTime: parsed.data.reminderTime ?? null,
        notes: parsed.data.notes ?? null,
        sortOrder: count,
      },
    });
    return { ok: true, habitId: habit.id };
  });
}

export async function PATCH(request: Request) {
  const parsed = z
    .object({ id: z.string(), ...habitFields, name: habitFields.name.optional() })
    .safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const { id, ...fields } = parsed.data;
    const existing = await prisma.habit.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new Error('Habit not found');

    await prisma.habit.update({
      where: { id },
      data: {
        name: fields.name ?? undefined,
        identityStatement: fields.identityStatement === undefined ? undefined : fields.identityStatement,
        cue: fields.cue === undefined ? undefined : fields.cue,
        stack: fields.stack === undefined ? undefined : fields.stack,
        goalLabel: fields.goalLabel === undefined ? undefined : fields.goalLabel,
        tinyGoalLabel: fields.tinyGoalLabel === undefined ? undefined : fields.tinyGoalLabel,
        scheduleDays: fields.scheduleDays ?? undefined,
        reminderEnabled: fields.reminderEnabled ?? undefined,
        reminderTime: fields.reminderTime === undefined ? undefined : fields.reminderTime,
        notes: fields.notes === undefined ? undefined : fields.notes,
        active: fields.active ?? undefined,
      },
    });
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.habit.deleteMany({ where: { id, userId: ctx.user.id } });
    return { ok: true };
  });
}
