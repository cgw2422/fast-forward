import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1).max(80),
  category: z.string().max(40).nullable().optional(),
  tracksSets: z.boolean().default(true),
  tracksReps: z.boolean().default(true),
  tracksWeight: z.boolean().default(true),
  tracksDuration: z.boolean().default(false),
  tracksDistance: z.boolean().default(false),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const exercise = await prisma.exercise.create({
      data: { userId: ctx.user.id, ...parsed.data, category: parsed.data.category ?? null, notes: parsed.data.notes ?? null },
    });
    return { ok: true, exerciseId: exercise.id };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.exercise.deleteMany({ where: { id, userId: ctx.user.id } });
    return { ok: true };
  });
}
