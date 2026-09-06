import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { dayRange, formatTime } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { ElectrolytesView } from '@/components/ElectrolytesView';

export const dynamic = 'force-dynamic';

export default async function ElectrolytesPage() {
  const ctx = await getContext();
  const { start, end } = dayRange(new Date(), ctx.timezone);

  const [presets, entries] = await Promise.all([
    prisma.electrolytePreset.findMany({ where: { userId: ctx.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.electrolyteEntry.findMany({
      where: { userId: ctx.user.id, loggedAt: { gte: start, lt: end } },
      orderBy: { loggedAt: 'desc' },
    }),
  ]);

  const totals = entries.reduce(
    (acc, e) => ({
      sodium: acc.sodium + (e.sodiumMg ?? 0),
      potassium: acc.potassium + (e.potassiumMg ?? 0),
      magnesium: acc.magnesium + (e.magnesiumMg ?? 0),
      servings: acc.servings + e.servings,
    }),
    { sodium: 0, potassium: 0, magnesium: 0, servings: 0 }
  );

  return (
    <>
      <PageHeader title="Electrolytes" subtitle="Salt of the Earth." backHref="/today" />
      <ElectrolytesView
        totals={totals}
        presets={presets.map((p) => ({
          id: p.id,
          name: p.name,
          servingSize: p.servingSize,
          sodiumMg: p.sodiumMg,
          potassiumMg: p.potassiumMg,
          magnesiumMg: p.magnesiumMg,
          notes: p.notes,
        }))}
        entries={entries.map((e) => ({
          id: e.id,
          name: e.name,
          servings: e.servings,
          sodiumMg: e.sodiumMg,
          potassiumMg: e.potassiumMg,
          magnesiumMg: e.magnesiumMg,
          time: formatTime(e.loggedAt, ctx.timezone, ctx.prefs.use24Hour),
        }))}
      />
    </>
  );
}
