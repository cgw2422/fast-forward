import 'server-only';
import { prisma } from './prisma';
import type { TimelineType } from '@prisma/client';

/**
 * Single writer for the daily journal. Every logging action calls this so the
 * timeline is one cheap query instead of a union across a dozen tables.
 */
export async function logTimeline(params: {
  userId: string;
  type: TimelineType;
  occurredAt: Date;
  title: string;
  detail?: string | null;
  refId?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  await prisma.timelineEvent.create({
    data: {
      userId: params.userId,
      type: params.type,
      occurredAt: params.occurredAt,
      title: params.title,
      detail: params.detail ?? null,
      refId: params.refId ?? null,
      meta: (params.meta ?? undefined) as never,
    },
  });
}

/** Keeps the journal honest when a source row is deleted. */
export async function removeTimelineFor(type: TimelineType, refId: string) {
  await prisma.timelineEvent.deleteMany({ where: { type, refId } });
}
