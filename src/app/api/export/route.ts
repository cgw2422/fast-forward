import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { UnauthorizedError } from '@/lib/auth';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/** Full personal data export. It's the user's data — they should be able to take it. */
export async function GET() {
  try {
    const ctx = await getContext();
    const userId = ctx.user.id;

    const [
      fasts,
      waterEntries,
      electrolyteEntries,
      weightEntries,
      walkEntries,
      stepEntries,
      habits,
      habitCompletions,
      checkIns,
      workouts,
      popPact,
      refeeds,
      achievements,
      timeline,
    ] = await Promise.all([
      prisma.fast.findMany({ where: { userId }, orderBy: { startAt: 'asc' } }),
      prisma.waterEntry.findMany({ where: { userId }, orderBy: { loggedAt: 'asc' } }),
      prisma.electrolyteEntry.findMany({ where: { userId }, orderBy: { loggedAt: 'asc' } }),
      prisma.weightEntry.findMany({ where: { userId }, orderBy: { loggedAt: 'asc' } }),
      prisma.walkEntry.findMany({ where: { userId }, orderBy: { loggedAt: 'asc' } }),
      prisma.stepEntry.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      prisma.habit.findMany({ where: { userId } }),
      prisma.habitCompletion.findMany({ where: { habit: { userId } }, orderBy: { date: 'asc' } }),
      prisma.dailyCheckIn.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
      prisma.workout.findMany({
        where: { userId },
        include: { exercises: { include: { exercise: true, sets: true } } },
      }),
      prisma.popPact.findUnique({ where: { userId }, include: { events: true, reasons: true } }),
      prisma.refeedEntry.findMany({ where: { userId }, orderBy: { occurredAt: 'asc' } }),
      prisma.achievement.findMany({ where: { userId } }),
      prisma.timelineEvent.findMany({ where: { userId }, orderBy: { occurredAt: 'asc' } }),
    ]);

    const payload = {
      exportedAt: new Date().toISOString(),
      note: 'Volumes are mL, weights are kg, distances are meters.',
      profile: { name: ctx.user.name, email: ctx.user.email, timezone: ctx.user.timezone },
      preferences: ctx.prefs,
      fasts,
      waterEntries,
      electrolyteEntries,
      weightEntries,
      walkEntries,
      stepEntries,
      habits,
      habitCompletions,
      checkIns,
      workouts,
      popPact,
      refeeds,
      achievements,
      timeline,
    };

    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="fast-forward-export-${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (error) {
    if (error instanceof UnauthorizedError) {
      return NextResponse.json({ error: 'Not signed in' }, { status: 401 });
    }
    throw error;
  }
}
