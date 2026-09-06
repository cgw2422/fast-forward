import Link from 'next/link';
import { getContext } from '@/lib/context';
import { LogoutButton } from '@/components/LogoutButton';
import { LogoMark } from '@/components/brand/Logo';

export const dynamic = 'force-dynamic';

const SECTIONS: { title: string; items: { href: string; label: string; icon: string; hint?: string }[] }[] = [
  {
    title: 'Track',
    items: [
      { href: '/hydration', label: 'Hydration Station', icon: '💧' },
      { href: '/electrolytes', label: 'Electrolytes', icon: '⚡' },
      { href: '/pop-pact', label: 'The Pop Pact', icon: '🤝' },
      { href: '/weight', label: 'Weight', icon: '⚖️' },
      { href: '/workouts', label: 'Workouts', icon: '🏋️' },
      { href: '/check-in', label: 'Daily Check-In', icon: '📝' },
    ],
  },
  {
    title: 'History',
    items: [
      { href: '/timeline', label: 'Daily Timeline', icon: '📋' },
      { href: '/fast/history', label: 'Fasting History', icon: '⏱' },
      { href: '/fast/refeed', label: 'Refeeding Log', icon: '🍲' },
      { href: '/achievements', label: 'Achievements', icon: '🏆' },
    ],
  },
  {
    title: 'Settings',
    items: [
      { href: '/settings/profile', label: 'Profile', icon: '👤' },
      { href: '/settings/notifications', label: 'Notifications', icon: '🔔' },
      { href: '/settings/goals', label: 'Goals & Fasting', icon: '🎯' },
      { href: '/settings/hydration', label: 'Water Containers', icon: '🥤' },
      { href: '/settings/tracking', label: 'Tracking Modules', icon: '🎛' },
      { href: '/settings/units', label: 'Units & Appearance', icon: '📐' },
      { href: '/settings/data', label: 'Data', icon: '💾' },
    ],
  },
];

export default async function MorePage() {
  const ctx = await getContext();

  return (
    <div className="animate-fade-up pb-4">
      <header className="flex items-center gap-3 pb-5 pt-7 safe-top">
        <LogoMark size={44} />
        <div className="min-w-0">
          <h1 className="text-xl font-extrabold tracking-tight text-cream">{ctx.user.name}</h1>
          <p className="truncate text-xs text-slate">{ctx.user.email}</p>
        </div>
      </header>

      {SECTIONS.map((section) => (
        <section key={section.title} className="mb-5">
          <h2 className="ff-label mb-2 px-1">{section.title}</h2>
          <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-surface">
            {section.items.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 border-b border-white/[0.05] px-4 py-3.5 transition last:border-0 active:bg-white/[0.03]"
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-midnight text-sm">
                  {item.icon}
                </span>
                <span className="flex-1 text-sm font-semibold text-cream">{item.label}</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" className="text-slate">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </Link>
            ))}
          </div>
        </section>
      ))}

      <LogoutButton />

      <p className="mt-6 text-center text-[11px] text-slate/60">
        Fast Forward — Small choices. Kept promises. More life.
      </p>
    </div>
  );
}
