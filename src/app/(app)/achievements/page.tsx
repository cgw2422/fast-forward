import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { getOrCreatePact, streakDays } from '@/lib/poppact';
import { POP_ACHIEVEMENTS, MOVE_ACHIEVEMENTS } from '@/lib/copy';

export const dynamic = 'force-dynamic';

export default async function AchievementsPage() {
  const ctx = await getContext();

  const [unlocked, pact] = await Promise.all([
    prisma.achievement.findMany({ where: { userId: ctx.user.id }, orderBy: { unlockedAt: 'desc' } }),
    getOrCreatePact(ctx.user.id),
  ]);

  const unlockedKeys = new Set(unlocked.map((a) => a.key));
  const days = streakDays(pact, ctx.timezone);

  const locked = [
    ...POP_ACHIEVEMENTS.filter((m) => !unlockedKeys.has(m.key)).map((m) => ({
      label: m.label,
      hint: `${Math.max(0, m.days - days)} more pop-free days`,
    })),
    ...MOVE_ACHIEVEMENTS.slice(1).map((m) => ({
      label: m.label,
      hint: `${m.minutes} minutes of movement in a day`,
    })),
  ];

  return (
    <>
      <PageHeader title="Achievements" backHref="/more" />
      <div className="animate-fade-up space-y-3 pt-2 pb-4">
        <div className="ff-card">
          <div className="ff-label mb-3">Unlocked ({unlocked.length})</div>
          {unlocked.length === 0 ? (
            <p className="py-3 text-sm text-slate">
              Nothing yet. The first one shows up faster than you&apos;d think.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {unlocked.map((achievement) => (
                <li key={achievement.id} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lime/12 text-base">🏆</span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-cream">{achievement.label}</div>
                    <div className="text-[11px] capitalize text-slate">
                      {achievement.category.replace('_', ' ')} ·{' '}
                      {formatDate(achievement.unlockedAt, ctx.timezone, 'MMM d, yyyy')}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="ff-card">
          <div className="ff-label mb-3">Still locked</div>
          <ul className="space-y-2.5">
            {locked.map((item, index) => (
              <li key={index} className="flex items-center gap-3 opacity-55">
                <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-white/[0.05] text-base">
                  🔒
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-bold text-cream">{item.label}</div>
                  <div className="text-[11px] text-slate">{item.hint}</div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
