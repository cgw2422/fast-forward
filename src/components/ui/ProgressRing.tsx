'use client';

import type { ReactNode } from 'react';

export function ProgressRing({
  value,
  size = 200,
  stroke = 14,
  color = '#C7F43D',
  trackColor = 'rgba(255,255,255,0.07)',
  children,
}: {
  /** 0–1. Values above 1 are clamped so the ring never lies about itself. */
  value: number;
  size?: number;
  stroke?: number;
  color?: string;
  trackColor?: string;
  children?: ReactNode;
}) {
  const clamped = Math.max(0, Math.min(1, value));
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference * (1 - clamped);

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 600ms cubic-bezier(0.4, 0, 0.2, 1)' }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">{children}</div>
    </div>
  );
}

export function ProgressBar({
  value,
  color = '#C7F43D',
  className = '',
}: {
  value: number;
  color?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className={`h-1.5 w-full overflow-hidden rounded-full bg-white/[0.07] ${className}`}>
      <div
        className="h-full rounded-full transition-[width] duration-500 ease-out"
        style={{ width: `${pct}%`, backgroundColor: color }}
      />
    </div>
  );
}
