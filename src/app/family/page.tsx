import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { listWatchableOwners, resolveAccess } from '@/lib/authz';
import { getFamilySnapshot } from '@/lib/family-data';
import { FamilyDashboard } from '@/components/family/FamilyDashboard';
import { formatDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function FamilyPage({
  searchParams,
}: {
  searchParams: Promise<{ owner?: string }>;
}) {
  const user = await requireUser();
  const owners = await listWatchableOwners(user.id);

  // An owner with no viewer relationships belongs on their own dashboard.
  if (owners.length === 0) {
    if (user.accountType === 'OWNER') redirect('/today');
    return <NoAccess />;
  }

  const { owner: requested } = await searchParams;
  const selected = owners.find((o) => o.ownerId === requested) ?? owners[0];
  const scope = await resolveAccess(user.id, selected.ownerId);
  if (!scope) return <NoAccess />;

  const [snapshot, prefs, unreadFromMe] = await Promise.all([
    getFamilySnapshot(scope, user.timezone),
    prisma.userPreference.findUnique({ where: { userId: selected.ownerId } }),
    prisma.familyMessage.count({ where: { ownerId: selected.ownerId, senderId: user.id } }),
  ]);

  const firstName = selected.ownerName.split(' ')[0];

  return (
    <FamilyDashboard
      ownerId={selected.ownerId}
      ownerName={firstName}
      viewerName={user.name.split(' ')[0]}
      role={scope.role}
      owners={owners.map((o) => ({ id: o.ownerId, name: o.ownerName.split(' ')[0] }))}
      messagesSent={unreadFromMe}
      units={{
        weight: prefs?.weightUnit ?? 'LB',
        distance: prefs?.distanceUnit ?? 'MI',
      }}
      snapshot={{
        popStreak: snapshot.popStreak,
        promiseKeptToday: snapshot.promiseKeptToday,
        walkMinutes: snapshot.walkMinutes,
        walkMeters: snapshot.walkMeters,
        latestRuck: snapshot.latestRuck
          ? {
              packWeightKg: snapshot.latestRuck.packWeightKg,
              distanceMeters: snapshot.latestRuck.distanceMeters,
              durationMinutes: snapshot.latestRuck.durationMinutes,
              when: formatDate(snapshot.latestRuck.startedAt, user.timezone, 'MMM d'),
            }
          : null,
        packCurrentKg: snapshot.packStats?.currentKg ?? null,
        lostKg: snapshot.load?.lostKg ?? null,
        percentOfLoss: snapshot.load?.percentOfLoss ?? null,
        weightLostKg: snapshot.weightProgress?.lostKg ?? null,
        habits: snapshot.habits,
        votesCast: snapshot.votesCast,
        votesTotal: snapshot.votesTotal,
        achievements: snapshot.achievements.map((a) => ({
          id: a.id,
          label: a.label,
          when: formatDate(a.unlockedAt, user.timezone, 'MMM d'),
        })),
        photos: snapshot.photos.map((p) => ({
          id: p.id,
          when: formatDate(p.capturedAt, user.timezone, 'MMM d, yyyy'),
          angle: p.angle,
        })),
      }}
    />
  );
}

function NoAccess() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-4xl">⏩</div>
      <h1 className="text-xl font-extrabold tracking-tight text-cream">Nothing shared yet</h1>
      <p className="max-w-xs text-sm text-slate">
        Your access hasn&apos;t been set up, or it was paused. Ask them to check Family View in their settings.
      </p>
      <form action="/api/auth/logout" method="post">
        <button className="ff-btn-secondary mt-2 px-5 py-2.5 text-xs">Sign out</button>
      </form>
    </main>
  );
}
