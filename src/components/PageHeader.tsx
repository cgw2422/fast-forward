import Link from 'next/link';
import type { ReactNode } from 'react';

/** Detail-screen header: back chevron, centered stacked title, optional action. */
export function PageHeader({
  title,
  subtitle,
  backHref = '/today',
  action,
}: {
  title: string;
  subtitle?: string;
  backHref?: string;
  action?: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 -mx-4 mb-2 border-b border-white/[0.06] bg-midnight/90 px-4 pb-3 pt-3 backdrop-blur-xl safe-top">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          aria-label="Back"
          className="-ml-2 rounded-full p-2 text-slate transition hover:text-cream"
        >
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m15 18-6-6 6-6" />
          </svg>
        </Link>
        <div className="flex-1 text-center">
          <h1 className="text-[13px] font-black uppercase tracking-[0.18em] text-cream">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-xs text-slate">{subtitle}</p> : null}
        </div>
        <div className="flex w-9 justify-end">{action}</div>
      </div>
    </header>
  );
}
