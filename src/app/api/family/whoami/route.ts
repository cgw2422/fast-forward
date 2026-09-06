import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/auth';
import { handler } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** Returns only the caller's own identity — no lookup of anyone else. */
export async function GET() {
  return handler(async () => {
    const user = await requireUser();
    return { id: user.id, name: user.name, accountType: user.accountType };
  });
}
