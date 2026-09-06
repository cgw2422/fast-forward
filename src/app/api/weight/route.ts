import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { displayToKg, formatWeight } from '@/lib/units';
import { WEIGHT_COPY } from '@/lib/copy';

const schema = z.object({
  weight: z.number().positive().max(2000),
  loggedAt: z.string().datetime().optional(),
  note: z.string().max(300).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const when = parsed.data.loggedAt ? new Date(parsed.data.loggedAt) : new Date();
    const weightKg = displayToKg(parsed.data.weight, ctx.prefs.weightUnit);

    const entry = await prisma.weightEntry.create({
      data: { userId: ctx.user.id, weightKg, loggedAt: when, note: parsed.data.note ?? null },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'WEIGHT',
      occurredAt: when,
      title: 'Weight',
      detail: formatWeight(weightKg, ctx.prefs.weightUnit),
      refId: entry.id,
    });

    // Deliberately never comments on direction — an up day is not a failure.
    return { ok: true, entryId: entry.id, message: WEIGHT_COPY.neutral };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.weightEntry.deleteMany({ where: { id, userId: ctx.user.id } });
    await removeTimelineFor('WEIGHT', id);
    return { ok: true };
  });
}
