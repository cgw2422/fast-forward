import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/** Railway healthcheck. Confirms the database is actually reachable. */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, service: 'fast-forward' });
  } catch {
    return NextResponse.json({ ok: false, error: 'database unreachable' }, { status: 503 });
  }
}
