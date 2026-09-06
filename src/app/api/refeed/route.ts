import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { displayToKg, displayToMl } from '@/lib/units';

const schema = z.object({
  fastId: z.string().optional(),
  occurredAt: z.string().datetime().optional(),
  meal: z.string().min(1).max(300),
  amount: z.string().max(120).optional(),
  water: z.number().nonnegative().optional(),
  symptoms: z.string().max(500).optional(),
  weight: z.number().positive().optional(),
  notes: z.string().max(1000).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const when = parsed.data.occurredAt ? new Date(parsed.data.occurredAt) : new Date();

    const entry = await prisma.refeedEntry.create({
      data: {
        userId: ctx.user.id,
        fastId: parsed.data.fastId ?? null,
        occurredAt: when,
        meal: parsed.data.meal,
        amount: parsed.data.amount ?? null,
        waterMl: parsed.data.water ? displayToMl(parsed.data.water, ctx.prefs.volumeUnit) : null,
        symptoms: parsed.data.symptoms ?? null,
        weightKg: parsed.data.weight ? displayToKg(parsed.data.weight, ctx.prefs.weightUnit) : null,
        notes: parsed.data.notes ?? null,
      },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'REFEED',
      occurredAt: when,
      title: 'Refeeding log',
      detail: parsed.data.meal,
      refId: entry.id,
    });

    return { ok: true, entryId: entry.id };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.refeedEntry.deleteMany({ where: { id, userId: ctx.user.id } });
    await removeTimelineFor('REFEED', id);
    return { ok: true };
  });
}
