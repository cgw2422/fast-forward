import 'server-only';
import { randomBytes } from 'crypto';
import webpush from 'web-push';
import { prisma } from './prisma';

/**
 * Self-configuration. A fresh deploy generates its own VAPID keypair and
 * session secret and persists them, so the only variable anyone must set by
 * hand is DATABASE_URL. Environment variables still win when present, which
 * keeps the "bring your own keys" path open.
 *
 * Values are cached per process — these are read on nearly every request.
 */

const cache = new Map<string, string>();

async function getOrCreate(key: string, generate: () => string): Promise<string> {
  const cached = cache.get(key);
  if (cached) return cached;

  const existing = await prisma.appConfig.findUnique({ where: { key } });
  if (existing) {
    cache.set(key, existing.value);
    return existing.value;
  }

  const value = generate();
  try {
    await prisma.appConfig.create({ data: { key, value } });
    cache.set(key, value);
    return value;
  } catch {
    // Another instance won the race — take whatever it wrote so every instance
    // agrees on the same secret.
    const winner = await prisma.appConfig.findUniqueOrThrow({ where: { key } });
    cache.set(key, winner.value);
    return winner.value;
  }
}

export type VapidKeys = { publicKey: string; privateKey: string; subject: string };

export async function getVapidKeys(): Promise<VapidKeys> {
  const subject = process.env.VAPID_SUBJECT || 'mailto:admin@fastforward.app';

  const envPublic = process.env.VAPID_PUBLIC_KEY;
  const envPrivate = process.env.VAPID_PRIVATE_KEY;
  if (envPublic && envPrivate) {
    return { publicKey: envPublic, privateKey: envPrivate, subject };
  }

  // Generated as a pair — storing them separately could mismatch them.
  const serialized = await getOrCreate('vapid', () => {
    const generated = webpush.generateVAPIDKeys();
    return JSON.stringify({ publicKey: generated.publicKey, privateKey: generated.privateKey });
  });

  const parsed = JSON.parse(serialized) as { publicKey: string; privateKey: string };
  return { ...parsed, subject };
}

export async function getSessionSecret(): Promise<string> {
  const fromEnv = process.env.SESSION_SECRET;
  if (fromEnv && fromEnv.length >= 16) return fromEnv;
  return getOrCreate('session_secret', () => randomBytes(48).toString('base64'));
}

/** Called at boot so the first request never pays the generation cost. */
export async function ensureRuntimeConfig(): Promise<void> {
  const [keys] = await Promise.all([getVapidKeys(), getSessionSecret()]);
  const source = process.env.VAPID_PUBLIC_KEY ? 'environment' : 'database';
  console.log(`[config] push keys ready (${source}), public key ${keys.publicKey.slice(0, 12)}…`);
}
