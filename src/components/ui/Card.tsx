import Link from 'next/link';
import type { ReactNode } from 'react';

export function Card({
  children,
  className = '',
  href,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  href?: string;
  onClick?: () => void;
}) {
  const cls = `ff-card ${href || onClick ? 'ff-pressable' : ''} ${className}`;
  if (href) {
    return (
      <Link href={href} className={`block ${cls}`}>
        {children}
      </Link>
    );
  }
  if (onClick) {
    return (
      <button type="button" onClick={onClick} className={`w-full text-left ${cls}`}>
        {children}
      </button>
    );
  }
  return <div className={cls}>{children}</div>;
}

export function CardLabel({ children, accent }: { children: ReactNode; accent?: string }) {
  return (
    <div className="ff-label" style={accent ? { color: accent } : undefined}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-2 mt-6 flex items-end justify-between px-1">
      <h2 className="text-[13px] font-bold uppercase tracking-[0.16em] text-slate">{title}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, message, action }: { icon?: string; message: string; action?: ReactNode }) {
  return (
    <div className="ff-card flex flex-col items-center gap-3 py-10 text-center">
      {icon ? <div className="text-3xl opacity-70">{icon}</div> : null}
      <p className="max-w-[16rem] text-sm text-slate">{message}</p>
      {action}
    </div>
  );
}
