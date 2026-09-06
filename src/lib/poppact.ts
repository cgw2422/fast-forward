import 'server-only';
import { prisma } from './prisma';
import { daysBetween, todayKey } from './dates';
import { POP_ACHIEVEMENTS } from './copy';
import type { PopPact } from '@prisma/client';

export const POP_PACT_DEFAULT_START = '2026-09-06';
export const POP_PACT_DEFAULT_REASON =
  'I made this promise to my son so I can be healthier, have more energy, and actually play with him.';

export const POP_PACT_DEFAULT_REASONS = [
  'Play with my son without getting worn out.',
  'Be active with my kids as they grow up.',
  'Have more energy.',
  'Keep the promise I made.',
  'Become someone who follows through.',
];

/**
 * Day 1 is the start day itself — Sep 6 2026 reads as "1 day pop-free", which is
 * how a person counts it, not zero-indexed like a computer would.
 * Returns 0 while the start date is still in the future.
 */
export function streakDays(pact: Pick<PopPact, 'streakStart'>, timezone: string): number {
  const diff = daysBetween(pact.streakStart, todayKey(timezone));
  return diff < 0 ? 0 : diff + 1;
}

export function totalDaysSinceStart(pact: Pick<PopPact, 'startDate'>, timezone: string): number {
  const diff = daysBetween(pact.startDate, todayKey(timezone));
  return diff < 0 ? 0 : diff + 1;
}

/** True when the pact is scheduled but hasn't begun yet. */
export function isPending(pact: Pick<PopPact, 'startDate'>, timezone: string): boolean {
  return daysBetween(pact.startDate, todayKey(timezone)) < 0;
}

export function nextMilestone(days: number): { days: number; label: string } | null {
  const next = POP_ACHIEVEMENTS.find((m) => m.days > days);
  return next ? { days: next.days, label: next.label } : null;
}

export function earnedMilestones(days: number) {
  return POP_ACHIEVEMENTS.filter((m) => m.days <= days);
}

export async function getOrCreatePact(userId: string): Promise<PopPact> {
  const existing = await prisma.popPact.findUnique({ where: { userId } });
  if (existing) return existing;

  const start = new Date(`${POP_PACT_DEFAULT_START}T00:00:00.000Z`);
  const pact = await prisma.popPact.create({
    data: { userId, startDate: start, streakStart: start, reason: POP_PACT_DEFAULT_REASON },
  });
  await prisma.popPactReason.createMany({
    data: POP_PACT_DEFAULT_REASONS.map((text, i) => ({ pactId: pact.id, text, sortOrder: i })),
  });
  return pact;
}

/** A slip resets the streak to today and records history. Never a failure state. */
export async function recordSlip(pactId: string, timezone: string, note?: string) {
  const pact = await prisma.popPact.findUniqueOrThrow({ where: { id: pactId } });
  const priorStreak = streakDays(pact, timezone);
  const today = todayKey(timezone);

  await prisma.popPactEvent.create({
    data: { pactId, type: 'SLIP', note: note ?? null, meta: { streakEnded: priorStreak } },
  });
  await prisma.popPact.update({
    where: { id: pactId },
    data: {
      streakStart: today,
      longestStreakDays: Math.max(pact.longestStreakDays, priorStreak),
    },
  });
}

