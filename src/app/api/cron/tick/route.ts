import { NextResponse } from 'next/server';
import { runReminderTick } from '@/lib/reminders';
import { safeEqual } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/**
 * External cron entry point. Protected by CRON_SECRET via either
 * `Authorization: Bearer <secret>` or `?secret=`.
 */
async function handle(request: Request): Promise<NextResponse> {
  const expected = process.env.CRON_SECRET;
  if (!expected) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 503 });
  }

  const url = new URL(request.url);
  const provided = request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ?? url.searchParams.get('secret') ?? '';

  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const result = await runReminderTick();
  return NextResponse.json({ ok: true, ...result });
}

export const GET = handle;
export const POST = handle;
