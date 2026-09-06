import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';

const schema = z.object({
  presetId: z.string().optional(),
  name: z.string().min(1).max(80).optional(),
  servings: z.number().positive().max(50).default(1),
  sodiumMg: z.number().nonnegative().nullable().optional(),
  potassiumMg: z.number().nonnegative().nullable().optional(),
  magnesiumMg: z.number().nonnegative().nullable().optional(),
  loggedAt: z.string().datetime().optional(),
  notes: z.string().max(500).optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const input = parsed.data;
    const when = input.loggedAt ? new Date(input.loggedAt) : new Date();

    let name = input.name ?? 'Electrolytes';
    let sodiumMg = input.sodiumMg ?? null;
    let potassiumMg = input.potassiumMg ?? null;
    let magnesiumMg = input.magnesiumMg ?? null;
    let customNutrients: unknown = null;

    if (input.presetId) {
      const preset = await prisma.electrolytePreset.findFirst({
        where: { id: input.presetId, userId: ctx.user.id },
      });
      if (!preset) throw new Error('That product no longer exists');
      name = preset.name;
      // Preset values are per serving; scale by how many were taken.
      sodiumMg = preset.sodiumMg !== null ? preset.sodiumMg * input.servings : null;
      potassiumMg = preset.potassiumMg !== null ? preset.potassiumMg * input.servings : null;
      magnesiumMg = preset.magnesiumMg !== null ? preset.magnesiumMg * input.servings : null;
      customNutrients = preset.customNutrients;
    }

    const entry = await prisma.electrolyteEntry.create({
      data: {
        userId: ctx.user.id,
        presetId: input.presetId ?? null,
        name,
        servings: input.servings,
        sodiumMg,
        potassiumMg,
        magnesiumMg,
        customNutrients: (customNutrients ?? undefined) as never,
        loggedAt: when,
        notes: input.notes ?? null,
      },
    });

    await logTimeline({
      userId: ctx.user.id,
      type: 'ELECTROLYTES',
      occurredAt: when,
      title: 'Electrolytes',
      detail: `${input.servings} serving${input.servings === 1 ? '' : 's'} · ${name}`,
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
    await prisma.electrolyteEntry.deleteMany({ where: { id, userId: ctx.user.id } });
    await removeTimelineFor('ELECTROLYTES', id);
    return { ok: true };
  });
}
