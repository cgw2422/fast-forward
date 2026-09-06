import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { getOrCreatePact, streakDays, nextMilestone, earnedMilestones, totalDaysSinceStart } from '@/lib/poppact';
import { formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { PopPactView } from '@/components/pop/PopPactView';

export const dynamic = 'force-dynamic';

export default async function PopPactPage() {
  const ctx = await getContext();
  const pact = await getOrCreatePact(ctx.user.id);

  const [reasons, events] = await Promise.all([
    prisma.popPactReason.findMany({ where: { pactId: pact.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.popPactEvent.findMany({ where: { pactId: pact.id }, orderBy: { occurredAt: 'desc' }, take: 40 }),
  ]);

  const days = streakDays(pact, ctx.timezone);

  return (
    <>
      <PageHeader title="The Pop Pact" backHref="/today" />
      <PopPactView
        days={days}
        totalDays={totalDaysSinceStart(pact, ctx.timezone)}
        startLabel={formatDate(pact.startDate, 'UTC', 'MMM d, yyyy')}
        startInput={pact.startDate.toISOString().slice(0, 10)}
        longestStreak={Math.max(pact.longestStreakDays, days)}
        reason={pact.reason}
        reasons={reasons.map((r) => ({ id: r.id, text: r.text }))}
        earned={earnedMilestones(days)}
        next={nextMilestone(days)}
        history={events.map((e) => ({
          id: e.id,
          type: e.type,
          when: formatDate(e.occurredAt, ctx.timezone, 'MMM d, yyyy · h:mm a'),
          note: e.note,
        }))}
      />
    </>
  );
}
