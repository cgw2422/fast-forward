'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactElement } from 'react';

type Tab = { href: string; label: string; match: string[]; icon: () => ReactElement };

const stroke = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

const TABS: Tab[] = [
  {
    href: '/today',
    label: 'Today',
    match: ['/today', '/timeline', '/check-in', '/family-messages'],
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
        <path d="m3 10 9-7 9 7v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <path d="M9 21v-8h6v8" />
      </svg>
    ),
  },
  {
    href: '/fast',
    label: 'Fast',
    match: ['/fast'],
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
        <circle cx="12" cy="13" r="8" />
        <path d="M12 9v4l2.5 2M9 2h6" />
      </svg>
    ),
  },
  {
    href: '/move',
    label: 'Move',
    match: ['/move', '/workouts', '/weight', '/ruck'],
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
        <circle cx="13" cy="4" r="1.6" />
        <path d="M8 21l3-6 3 2 1 4M11 15l-1-5 4-2 3 3 2 1" />
      </svg>
    ),
  },
  {
    href: '/habits',
    label: 'Habits',
    match: ['/habits'],
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" {...stroke}>
        <path d="M20 6 9 17l-5-5" />
        <path d="M20 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8" opacity="0.55" />
      </svg>
    ),
  },
  {
    href: '/more',
    label: 'More',
    match: ['/more', '/settings', '/hydration', '/pop-pact', '/electrolytes', '/forward-focus'],
    icon: () => (
      <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
        <circle cx="5" cy="12" r="2" />
        <circle cx="12" cy="12" r="2" />
        <circle cx="19" cy="12" r="2" />
      </svg>
    ),
  },
];

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/[0.07] bg-midnight/95 backdrop-blur-xl">
      <div className="mx-auto flex max-w-md items-stretch justify-around px-2 pb-[max(env(safe-area-inset-bottom),0.4rem)] pt-2">
        {TABS.map((tab) => {
          const active = tab.match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`flex min-w-[3.75rem] flex-col items-center gap-1 rounded-xl px-2 py-1.5 transition ${
                active ? 'text-lime' : 'text-slate'
              }`}
              aria-current={active ? 'page' : undefined}
            >
              {tab.icon()}
              <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
