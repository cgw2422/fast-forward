import 'server-only';
import { prisma } from './prisma';
import { logTimeline } from './timeline';

/**
 * Unlocks are idempotent — the unique index does the deduping, so callers can
 * fire this on every log without checking first.
 * Returns the label when it is newly unlocked so the UI can celebrate once.
 */
export async function unlockAchievement(params: {
  userId: string;
  key: string;
  category: string;
  label: string;
}): Promise<string | null> {
  const existing = await prisma.achievement.findUnique({
    where: { userId_key: { userId: params.userId, key: params.key } },
  });
  if (existing) return null;

  await prisma.achievement.create({
    data: { userId: params.userId, key: params.key, category: params.category, label: params.label },
  });
  await logTimeline({
    userId: params.userId,
    type: 'ACHIEVEMENT',
    occurredAt: new Date(),
    title: params.label,
    detail: 'Achievement unlocked',
  });
  return params.label;
}
