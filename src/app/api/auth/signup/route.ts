import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { createSession, hashPassword, setSessionCookie } from '@/lib/auth';
import { handler, fail } from '@/lib/api';
import { getOrCreatePact } from '@/lib/poppact';
import { seedNewUserDefaults } from '@/lib/onboarding';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  name: z.string().min(1, 'Tell us your name'),
  timezone: z.string().optional(),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  const { email, password, name, timezone } = parsed.data;
  const normalizedEmail = email.trim().toLowerCase();

  return handler(async () => {
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) throw new Error('An account with that email already exists');

    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        name: name.trim(),
        passwordHash: await hashPassword(password),
        timezone: timezone || 'America/Chicago',
      },
    });

    await seedNewUserDefaults(user.id);
    await getOrCreatePact(user.id);

    const jwt = await createSession(user.id, request.headers.get('user-agent') ?? undefined);
    await setSessionCookie(jwt);
    return { ok: true };
  });
}
