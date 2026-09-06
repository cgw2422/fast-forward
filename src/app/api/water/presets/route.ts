import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { displayToMl } from '@/lib/units';

const createSchema = z.object({
  label: z.string().min(1).max(60),
  amount: z.number().positive(),
  unit: z.enum(['OZ', 'ML', 'L']),
  icon: z.string().max(8).optional(),
});

export async function POST(request: Request) {
  const parsed = createSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const count = await prisma.waterPreset.count({ where: { userId: ctx.user.id } });
    const preset = await prisma.waterPreset.create({
      data: {
        userId: ctx.user.id,
        label: parsed.data.label,
        volumeMl: displayToMl(parsed.data.amount, parsed.data.unit),
        icon: parsed.data.icon || '🥤',
        sortOrder: count,
      },
    });
    return { ok: true, presetId: preset.id };
  });
}

const updateSchema = z.object({
  id: z.string(),
  label: z.string().min(1).max(60).optional(),
  amount: z.number().positive().optional(),
  unit: z.enum(['OZ', 'ML', 'L']).optional(),
  icon: z.string().max(8).optional(),
  sortOrder: z.number().int().optional(),
});

export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const { id, label, amount, unit, icon, sortOrder } = parsed.data;
    const existing = await prisma.waterPreset.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new Error('Container not found');

    await prisma.waterPreset.update({
      where: { id },
      data: {
        label: label ?? undefined,
        volumeMl: amount !== undefined ? displayToMl(amount, unit ?? ctx.prefs.volumeUnit) : undefined,
        icon: icon ?? undefined,
        sortOrder: sortOrder ?? undefined,
      },
    });
    return { ok: true };
  });
}

/** Reorder in one round trip so drag-to-sort doesn't fire N requests. */
export async function PUT(request: Request) {
  const parsed = z.object({ order: z.array(z.string()) }).safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail('Invalid order', 422);

  return handler(async () => {
    const ctx = await getContext();
    await prisma.$transaction(
      parsed.data.order.map((id, index) =>
        prisma.waterPreset.updateMany({ where: { id, userId: ctx.user.id }, data: { sortOrder: index } })
      )
    );
    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');

  return handler(async () => {
    const ctx = await getContext();
    await prisma.waterPreset.deleteMany({ where: { id, userId: ctx.user.id } });
    return { ok: true };
  });
}
