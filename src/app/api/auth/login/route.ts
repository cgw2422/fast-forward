import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, setSessionCookie, verifyPassword } from '@/lib/auth';
import { handler, fail } from '@/lib/api';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(1, 'Enter your password'),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const user = await prisma.user.findUnique({ where: { email: parsed.data.email.trim().toLowerCase() } });
    // Same message either way so the form can't be used to enumerate accounts.
    const invalid = new Error('Email or password is incorrect');
    if (!user) throw invalid;
    if (!(await verifyPassword(parsed.data.password, user.passwordHash))) throw invalid;

    const jwt = await createSession(user.id, request.headers.get('user-agent') ?? undefined);
    await setSessionCookie(jwt);
    return { ok: true };
  });
}
