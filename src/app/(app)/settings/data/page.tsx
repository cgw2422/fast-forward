import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { SettingsGroup, Row } from '@/components/settings/Controls';

export const dynamic = 'force-dynamic';

export default async function DataSettingsPage() {
  const ctx = await getContext();

  const [fasts, water, weights, walks, habits, workouts] = await Promise.all([
    prisma.fast.count({ where: { userId: ctx.user.id } }),
    prisma.waterEntry.count({ where: { userId: ctx.user.id } }),
    prisma.weightEntry.count({ where: { userId: ctx.user.id } }),
    prisma.walkEntry.count({ where: { userId: ctx.user.id } }),
    prisma.habitCompletion.count({ where: { habit: { userId: ctx.user.id } } }),
    prisma.workout.count({ where: { userId: ctx.user.id } }),
  ]);

  const counts = [
    { label: 'Fasts', value: fasts },
    { label: 'Water entries', value: water },
    { label: 'Weigh-ins', value: weights },
    { label: 'Walks', value: walks },
    { label: 'Habit completions', value: habits },
    { label: 'Workouts', value: workouts },
  ];

  return (
    <>
      <PageHeader title="Data" backHref="/more" />
      <div className="animate-fade-up pb-4">
        <SettingsGroup title="What you've logged">
          {counts.map((c) => (
            <Row key={c.label}>
              <span className="flex-1 text-sm font-semibold text-cream">{c.label}</span>
              <span className="text-sm font-bold tabular-nums text-slate">{c.value.toLocaleString()}</span>
            </Row>
          ))}
        </SettingsGroup>

        <SettingsGroup title="Export">
          <div className="px-4 py-4">
            <p className="text-[12px] leading-relaxed text-slate">
              Download everything as JSON — every entry, preference and timeline event. It&apos;s your data.
            </p>
            <a href="/api/export" className="ff-btn-primary mt-3 w-full py-3">
              Download export
            </a>
          </div>
        </SettingsGroup>
      </div>
    </>
  );
}
