import { NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { UnauthorizedError } from './auth';
import { ForbiddenError, NotFoundError } from './authz';

export function fail(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

/** Turns thrown errors into consistent JSON instead of a 500 HTML page. */
export async function handler<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data ?? { ok: true });
  } catch (error) {
    if (error instanceof UnauthorizedError) return fail('Not signed in', 401);
    if (error instanceof ForbiddenError) return fail(error.message, 403);
    // Deliberately 404: a viewer must not learn that a restricted resource exists.
    if (error instanceof NotFoundError) return fail('Not found', 404);
    if (error instanceof ZodError) {
      return fail(error.issues[0]?.message ?? 'Invalid input', 422);
    }
    console.error('[api]', error);
    const message = error instanceof Error ? error.message : 'Something went wrong';
    return fail(message, 500);
  }
}
