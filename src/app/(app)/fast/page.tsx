import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { FastView } from '@/components/fast/FastView';
import { localDateTimeInputValue } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function FastPage() {
  const ctx = await getContext();

  const [activeFast, presets, recent] = await Promise.all([
    prisma.fast.findFirst({
      where: { userId: ctx.user.id, status: 'ACTIVE' },
      include: { milestones: { orderBy: { hours: 'asc' } } },
    }),
    prisma.fastPreset.findMany({ where: { userId: ctx.user.id }, orderBy: { sortOrder: 'asc' } }),
    prisma.fast.findMany({
      where: { userId: ctx.user.id, status: 'COMPLETED' },
      orderBy: { startAt: 'desc' },
      take: 5,
    }),
  ]);

  return (
    <>
      <PageHeader
        title="The Fast Lane"
        subtitle="Keep moving forward."
        backHref="/today"
        action={
          <Link href="/fast/history" className="text-xs font-bold text-lime">
            History
          </Link>
        }
      />
      <FastView
        activeFast={
          activeFast
            ? {
                id: activeFast.id,
                startIso: activeFast.startAt.toISOString(),
                targetHours: activeFast.targetHours,
                presetLabel: activeFast.presetLabel,
                notes: activeFast.notes,
                milestones: activeFast.milestones.map((m) => ({ hours: m.hours })),
              }
            : null
        }
        presets={presets.map((p) => ({ id: p.id, label: p.label, hours: p.hours }))}
        weightUnit={ctx.prefs.weightUnit}
        defaultTargetHours={ctx.prefs.defaultFastHours}
        safetyNoticeHours={ctx.prefs.safetyNoticeHours}
        nowInput={localDateTimeInputValue(new Date(), ctx.timezone)}
        timezone={ctx.timezone}
        recent={recent.map((f) => ({
          id: f.id,
          durationMs: (f.endAt ?? new Date()).getTime() - f.startAt.getTime(),
          startIso: f.startAt.toISOString(),
        }))}
      />
    </>
  );
}
