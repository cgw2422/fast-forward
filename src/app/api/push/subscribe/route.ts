import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireUser } from '@/lib/auth';
import { handler, fail } from '@/lib/api';

const schema = z.object({
  endpoint: z.string().url(),
  keys: z.object({ p256dh: z.string(), auth: z.string() }),
});

export async function POST(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail('Invalid subscription', 422);

  return handler(async () => {
    const user = await requireUser();
    const { endpoint, keys } = parsed.data;

    // The endpoint is unique across users; re-registering on a shared device
    // should move the subscription rather than fail.
    await prisma.pushSubscription.upsert({
      where: { endpoint },
      update: {
        userId: user.id,
        p256dh: keys.p256dh,
        auth: keys.auth,
        failureCount: 0,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
      create: {
        userId: user.id,
        endpoint,
        p256dh: keys.p256dh,
        auth: keys.auth,
        userAgent: request.headers.get('user-agent') ?? undefined,
      },
    });

    // Enabling on a device implies the user wants reminders on.
    await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: { enabled: true },
      create: { userId: user.id, enabled: true },
    });

    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const endpoint = new URL(request.url).searchParams.get('endpoint');
  if (!endpoint) return fail('Missing endpoint');

  return handler(async () => {
    const user = await requireUser();
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId: user.id } });
    return { ok: true };
  });
}
