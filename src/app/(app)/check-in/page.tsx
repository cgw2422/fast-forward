import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { todayKey, formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { CheckInView } from '@/components/CheckInView';

export const dynamic = 'force-dynamic';

export default async function CheckInPage() {
  const ctx = await getContext();
  const date = todayKey(ctx.timezone);

  const [today, recent] = await Promise.all([
    prisma.dailyCheckIn.findUnique({ where: { userId_date: { userId: ctx.user.id, date } } }),
    prisma.dailyCheckIn.findMany({
      where: { userId: ctx.user.id, date: { lt: date } },
      orderBy: { date: 'desc' },
      take: 7,
    }),
  ]);

  return (
    <>
      <PageHeader title="Daily Check-In" subtitle="How did today actually go?" backHref="/today" />
      <CheckInView
        initial={{
          energy: today?.energy ?? null,
          hunger: today?.hunger ?? null,
          sleep: today?.sleep ?? null,
          mood: today?.mood ?? null,
          notes: today?.notes ?? '',
        }}
        recent={recent.map((r) => ({
          id: r.id,
          date: formatDate(r.date, 'UTC', 'EEE, MMM d'),
          energy: r.energy,
          hunger: r.hunger,
          sleep: r.sleep,
          mood: r.mood,
          notes: r.notes,
        }))}
      />
    </>
  );
}
