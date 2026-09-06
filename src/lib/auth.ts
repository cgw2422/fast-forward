import 'server-only';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { prisma } from './prisma';

const COOKIE_NAME = 'ff_session';
const SESSION_DAYS = 30;

function secret(): Uint8Array {
  const value = process.env.SESSION_SECRET;
  if (!value || value.length < 16) {
    throw new Error('SESSION_SECRET is missing or too short (need 16+ chars).');
  }
  return new TextEncoder().encode(value);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

/**
 * Two layers on purpose: a signed JWT so we can reject junk without a query,
 * and a DB row keyed by the token hash so logout actually revokes.
 */
export async function createSession(userId: string, userAgent?: string): Promise<string> {
  const token = randomBytes(32).toString('base64url');
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 86_400_000);

  await prisma.session.create({
    data: { userId, tokenHash: hashToken(token), expiresAt, userAgent },
  });

  return new SignJWT({ uid: userId, t: token })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(secret());
}

export async function setSessionCookie(jwt: string) {
  const store = await cookies();
  store.set(COOKIE_NAME, jwt, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_DAYS * 86_400,
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  timezone: string;
};

export async function getSessionUser(): Promise<SessionUser | null> {
  const store = await cookies();
  const jwt = store.get(COOKIE_NAME)?.value;
  if (!jwt) return null;

  let payload: { uid?: string; t?: string };
  try {
    ({ payload } = (await jwtVerify(jwt, secret())) as { payload: { uid?: string; t?: string } });
  } catch {
    return null;
  }
  if (!payload.uid || !payload.t) return null;

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(payload.t) },
    include: { user: { select: { id: true, email: true, name: true, timezone: true } } },
  });

  if (!session || session.userId !== payload.uid) return null;
  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id: session.id } }).catch(() => {});
    return null;
  }
  return session.user;
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

export class UnauthorizedError extends Error {
  constructor() {
    super('Unauthorized');
    this.name = 'UnauthorizedError';
  }
}

export async function destroyCurrentSession() {
  const store = await cookies();
  const jwt = store.get(COOKIE_NAME)?.value;
  if (jwt) {
    try {
      const { payload } = (await jwtVerify(jwt, secret())) as { payload: { t?: string } };
      if (payload.t) {
        await prisma.session.deleteMany({ where: { tokenHash: hashToken(payload.t) } });
      }
    } catch {
      // Bad or expired token — nothing to revoke.
    }
  }
  await clearSessionCookie();
}

export function safeEqual(a: string, b: string): boolean {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  if (bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
