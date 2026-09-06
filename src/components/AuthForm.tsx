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

export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
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
      body: JSON.stringify(isSignup ? { email, password, name, timezone } : { email, password }),
    });

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? 'Something went wrong');
      setBusy(false);
      return;
    }

    router.push('/today');
    router.refresh();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-between px-6 pb-10 pt-14">
      <div className="animate-fade-up">
        <div className="flex items-center gap-3">
          <LogoMark size={52} />
          <Wordmark />
        </div>
        <Tagline className="mt-4" />

        <ul className="mt-8 space-y-4">
          {BENEFITS.map((b) => (
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
