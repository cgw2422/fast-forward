import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { dayRange, formatTime, formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { EMPTY_STATES } from '@/lib/copy';
import { TimelineNav } from '@/components/TimelineNav';
import type { TimelineType } from '@prisma/client';

export const dynamic = 'force-dynamic';

const ICONS: Record<TimelineType, string> = {
  WATER: '💧',
  ELECTROLYTES: '⚡',
  WEIGHT: '⚖️',
  WALK: '🚶',
  STEPS: '👟',
  WORKOUT: '🏋️',
  FAST_START: '⏱',
  FAST_END: '🏁',
  FAST_MILESTONE: '🚀',
  CHECKIN: '📝',
  HABIT: '✅',
  POP_PACT: '🤝',
  MEASUREMENT: '📏',
  REFEED: '🍲',
  ACHIEVEMENT: '🏆',
};

export default async function TimelinePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const ctx = await getContext();
  const { date } = await searchParams;

  // ?date=yyyy-MM-dd lets the day be navigated without extra state.
  const anchor = date ? new Date(`${date}T12:00:00.000Z`) : new Date();
  const { start, end } = dayRange(anchor, ctx.timezone);

  const events = await prisma.timelineEvent.findMany({
    where: { userId: ctx.user.id, occurredAt: { gte: start, lt: end } },
    orderBy: { occurredAt: 'asc' },
  });

  const dayString = formatDate(anchor, ctx.timezone, 'yyyy-MM-dd');
  const prev = formatDate(new Date(start.getTime() - 43_200_000), ctx.timezone, 'yyyy-MM-dd');
  const next = formatDate(new Date(end.getTime() + 43_200_000), ctx.timezone, 'yyyy-MM-dd');
  const isToday = dayString === formatDate(new Date(), ctx.timezone, 'yyyy-MM-dd');

  return (
    <>
      <PageHeader
        title="Timeline"
        subtitle={formatDate(anchor, ctx.timezone, 'EEEE, MMM d')}
        backHref="/today"
      />
      <div className="animate-fade-up pt-2">
        <TimelineNav prev={prev} next={isToday ? null : next} isToday={isToday} />

        {events.length === 0 ? (
          <div className="ff-card mt-3 py-10 text-center">
            <p className="text-sm text-slate">{EMPTY_STATES.timeline}</p>
          </div>
        ) : (
          <ol className="mt-3 space-y-0">
            {events.map((event, index) => (
              <li key={event.id} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-white/[0.07] bg-surface text-sm">
                    {ICONS[event.type] ?? '•'}
                  </span>
                  {index < events.length - 1 ? <span className="w-px flex-1 bg-white/[0.07]" /> : null}
                </div>
                <div className="min-w-0 flex-1 pb-5">
                  <div className="flex items-baseline gap-2">
                    <span className="text-xs font-bold tabular-nums text-slate">
                      {formatTime(event.occurredAt, ctx.timezone, ctx.prefs.use24Hour)}
                    </span>
                    <span className="text-sm font-bold text-cream">{event.title}</span>
                  </div>
                  {event.detail ? <p className="mt-0.5 text-[13px] text-slate">{event.detail}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        )}
      </div>
    </>
  );
}
