import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';

const schema = z.object({
  name: z.string().min(1).max(80),
  servingSize: z.string().max(80).nullable().optional(),
  sodiumMg: z.number().nonnegative().nullable().optional(),
  potassiumMg: z.number().nonnegative().nullable().optional(),
  magnesiumMg: z.number().nonnegative().nullable().optional(),
  customNutrients: z.record(z.string(), z.union([z.string(), z.number()])).nullable().optional(),
  notes: z.string().max(500).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const count = await prisma.electrolytePreset.count({ where: { userId: ctx.user.id } });
    const preset = await prisma.electrolytePreset.create({
      data: {
        userId: ctx.user.id,
        name: parsed.data.name,
        servingSize: parsed.data.servingSize ?? null,
        sodiumMg: parsed.data.sodiumMg ?? null,
        potassiumMg: parsed.data.potassiumMg ?? null,
        magnesiumMg: parsed.data.magnesiumMg ?? null,
        customNutrients: (parsed.data.customNutrients ?? undefined) as never,
        notes: parsed.data.notes ?? null,
        sortOrder: count,
      },
    });
    return { ok: true, presetId: preset.id };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');
  return handler(async () => {
    const ctx = await getContext();
    await prisma.electrolytePreset.deleteMany({ where: { id, userId: ctx.user.id } });
    return { ok: true };
  });
}
