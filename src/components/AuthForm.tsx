'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LogoMark, Wordmark, Tagline } from '@/components/brand/Logo';

const BENEFITS = [
  { icon: '⚡', title: 'Build better habits.' },
  { icon: '❤️', title: 'More energy for what matters.' },
  { icon: '👨‍👦', title: 'Be there for the moments.' },
];

export function AuthForm({
  mode,
  invite,
}: {
  mode: 'login' | 'signup';
  invite?: { code: string; ownerName: string; name: string; role: string } | null;
}) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState(invite?.name ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isSignup = mode === 'signup';

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);

    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const response = await fetch(`/api/auth/${mode}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        isSignup ? { email, password, name, timezone, inviteCode: invite?.code } : { email, password }
      ),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong');
      setBusy(false);
      return;
    }

    router.push(invite ? '/family' : '/today');
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 pb-10 pt-14">
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <LogoMark size={48} />
          <Wordmark className="min-w-0 flex-1" />
        </div>
        <Tagline className="mt-4" />

        {invite ? (
          <div className="mt-6 rounded-2xl border border-lime/25 bg-lime/[0.07] p-4">
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-lime">You&apos;ve been invited</p>
            <p className="mt-1.5 text-[15px] font-semibold text-cream">
              {invite.ownerName} wants you to follow their progress.
            </p>
            <p className="mt-1 text-xs text-slate">
              You&apos;ll get a read-only view{' '}
              {invite.role === 'FAMILY_VIEWER' ? 'of what they choose to share' : 'of their shared progress'} — and you
              can cheer them on.
            </p>
          </div>
        ) : null}

        <ul className="mt-8 space-y-4">
          {(invite ? BENEFITS.slice(1) : BENEFITS).map((b) => (
            <li key={b.title} className="flex items-center gap-3">
              <span className="grid h-9 w-9 place-items-center rounded-xl bg-raised text-base">{b.icon}</span>
              <span className="text-[15px] font-semibold text-cream">{b.title}</span>
            </li>
          ))}
        </ul>
      </div>

      <form onSubmit={submit} className="mt-10 space-y-3">
        {isSignup ? (
          <input
            className="ff-input"
            placeholder="Your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
          />
        ) : null}
        <input
          className="ff-input"
          type="email"
          inputMode="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoComplete="email"
          required
        />
        <input
          className="ff-input"
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete={isSignup ? 'new-password' : 'current-password'}
          required
        />

        {error ? (
          <p className="rounded-xl bg-coral/10 px-4 py-3 text-sm font-medium text-coral">{error}</p>
        ) : null}

        <button type="submit" disabled={busy} className="ff-btn-primary w-full py-4 text-base">
          {busy ? 'One sec…' : isSignup ? 'Create account' : "Let's Go ⏩"}
        </button>

        <p className="pt-2 text-center text-sm text-slate">
          {isSignup ? 'Already have an account? ' : 'Need an account? '}
          <Link href={isSignup ? '/login' : '/signup'} className="font-bold text-lime">
            {isSignup ? 'Sign in' : 'Sign up'}
          </Link>
        </p>
        <p className="pt-3 text-center text-xs text-slate/70">
          A healthier you for a more awesome tomorrow.
        </p>
      </form>
    </main>
  );
}
