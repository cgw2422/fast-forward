import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { logTimeline, removeTimelineFor } from '@/lib/timeline';
import { todayKey } from '@/lib/dates';

const rating = z.number().int().min(1).max(5).nullable().optional();

const schema = z.object({
  date: z.string().optional(),
  energy: rating,
  hunger: rating,
  sleep: rating,
  mood: rating,
  notes: z.string().max(2000).nullable().optional(),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const date = parsed.data.date ? new Date(`${parsed.data.date}T00:00:00.000Z`) : todayKey(ctx.timezone);
    const { energy, hunger, sleep, mood, notes } = parsed.data;

    const entry = await prisma.dailyCheckIn.upsert({
      where: { userId_date: { userId: ctx.user.id, date } },
      update: { energy, hunger, sleep, mood, notes },
      create: { userId: ctx.user.id, date, energy, hunger, sleep, mood, notes },
    });

    // Replace rather than append, so editing today's check-in doesn't stack rows.
    await removeTimelineFor('CHECKIN', entry.id);
    const parts = [
      energy ? `Energy ${energy}/5` : null,
      hunger ? `Hunger ${hunger}/5` : null,
      sleep ? `Sleep ${sleep}/5` : null,
      mood ? `Mood ${mood}/5` : null,
    ].filter(Boolean);

    await logTimeline({
      userId: ctx.user.id,
      type: 'CHECKIN',
      occurredAt: new Date(),
      title: 'Daily Check-In',
      detail: parts.join(' · ') || null,
      refId: entry.id,
    });

    return { ok: true };
  });
}
