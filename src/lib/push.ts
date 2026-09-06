import 'server-only';
import webpush from 'web-push';
import { prisma } from './prisma';
import { getVapidKeys } from './runtime-config';

let configured = false;

async function configure(): Promise<boolean> {
  if (configured) return true;
  const { publicKey, privateKey, subject } = await getVapidKeys();
  if (!publicKey || !privateKey) return false;
  webpush.setVapidDetails(subject, publicKey, privateKey);
  configured = true;
  return true;
}

/** Keys are generated on demand, so this is only false if the database is down. */
export async function pushConfigured(): Promise<boolean> {
  try {
    const { publicKey, privateKey } = await getVapidKeys();
    return Boolean(publicKey && privateKey);
  } catch {
    return false;
  }
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  renotify?: boolean;
  requireInteraction?: boolean;
};

/**
 * Sends to every device the user has registered. 404/410 means the browser
 * dropped the subscription — prune it rather than retrying forever.
 */
export async function sendToUser(userId: string, payload: PushPayload): Promise<number> {
  if (!(await configure())) return 0;

  const subs = await prisma.pushSubscription.findMany({ where: { userId } });
  if (subs.length === 0) return 0;

  const body = JSON.stringify(payload);
  let delivered = 0;

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          { TTL: 3600, urgency: 'normal' }
        );
        delivered += 1;
        await prisma.pushSubscription.update({
          where: { id: sub.id },
          data: { lastSuccessAt: new Date(), failureCount: 0 },
        });
      } catch (error) {
        const status = (error as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => {});
        } else {
          await prisma.pushSubscription
            .update({ where: { id: sub.id }, data: { failureCount: { increment: 1 } } })
            .catch(() => {});
        }
      }
    })
  );

  return delivered;
}

/**
 * dedupeKey is scoped per user and normally carries the calendar day, so a cron
 * that ticks every minute cannot send the same nudge twice.
 */
export async function sendOnce(
  userId: string,
  dedupeKey: string,
  payload: PushPayload & { kind: string }
): Promise<boolean> {
  const existing = await prisma.notificationLog.findUnique({
    where: { userId_dedupeKey: { userId, dedupeKey } },
  });
  if (existing) return false;

  try {
    await prisma.notificationLog.create({
      data: {
        userId,
        dedupeKey,
        kind: payload.kind,
        title: payload.title,
        body: payload.body,
        url: payload.url ?? null,
      },
    });
  } catch {
    // Lost the race with a concurrent tick — the other one is sending it.
    return false;
  }

  await sendToUser(userId, payload);
  return true;
}
