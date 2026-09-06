'use client';

import type { ReactNode } from 'react';

export function SettingsGroup({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-2">
      <h2 className="ff-label mb-2 px-1">{title}</h2>
      <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-surface">{children}</div>
    </section>
  );
}

export function Row({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex items-center gap-3 border-b border-white/[0.05] px-4 py-3 last:border-0 ${className}`}>
      {children}
    </div>
  );
}

export function Toggle({
  label,
  hint,
  checked,
  onChange,
  disabled,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <Row className={disabled ? 'opacity-50' : ''}>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-slate">{hint}</div> : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${checked ? 'bg-mint' : 'bg-white/15'}`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all ${
            checked ? 'left-[1.4rem]' : 'left-0.5'
          }`}
        />
      </button>
    </Row>
  );
}

export function SelectRow({
  label,
  hint,
  value,
  options,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-slate">{hint}</div> : null}
      </div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className="rounded-lg border border-white/10 bg-midnight px-3 py-2 text-sm font-semibold text-cream outline-none focus:border-lime/60"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Row>
  );
}

export function InputRow({
  label,
  hint,
  value,
  onChange,
  type = 'text',
  suffix,
  placeholder,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  suffix?: string;
  placeholder?: string;
}) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-slate">{hint}</div> : null}
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <input
          type={type}
          value={value}
          placeholder={placeholder}
          onChange={(e) => onChange(e.target.value)}
          aria-label={label}
          inputMode={type === 'number' ? 'decimal' : undefined}
          className="w-24 rounded-lg border border-white/10 bg-midnight px-3 py-2 text-right text-sm font-semibold text-cream outline-none focus:border-lime/60"
        />
        {suffix ? <span className="text-xs font-semibold text-slate">{suffix}</span> : null}
      </div>
    </Row>
  );
}

export function SegmentedRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-white/[0.05] px-4 py-3 last:border-0">
      <div className="mb-2 text-sm font-semibold text-cream">{label}</div>
      <div className="flex gap-1 rounded-lg bg-midnight p-1">
        {options.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`flex-1 rounded-md py-2 text-xs font-bold transition ${
              value === option.value ? 'bg-lime text-midnight' : 'text-slate'
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function TimeRangeRow({
  label,
  hint,
  start,
  end,
  onStartChange,
  onEndChange,
}: {
  label: string;
  hint?: string;
  start: string;
  end: string;
  onStartChange: (value: string) => void;
  onEndChange: (value: string) => void;
}) {
  return (
    <div className="border-b border-white/[0.05] px-4 py-3 last:border-0">
      <div className="text-sm font-semibold text-cream">{label}</div>
      {hint ? <div className="mt-0.5 text-[11px] text-slate">{hint}</div> : null}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="time"
          aria-label={`${label} start`}
          value={start}
          onChange={(e) => onStartChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-midnight px-3 py-2 text-sm font-semibold text-cream outline-none focus:border-lime/60"
        />
        <span className="shrink-0 text-slate">to</span>
        <input
          type="time"
          aria-label={`${label} end`}
          value={end}
          onChange={(e) => onEndChange(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-white/10 bg-midnight px-3 py-2 text-sm font-semibold text-cream outline-none focus:border-lime/60"
        />
      </div>
    </div>
  );
}

export function TimeRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <Row>
      <div className="min-w-0 flex-1">
        <div className="text-sm font-semibold text-cream">{label}</div>
        {hint ? <div className="mt-0.5 text-[11px] text-slate">{hint}</div> : null}
      </div>
      <input
        type="time"
        aria-label={label}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="shrink-0 rounded-lg border border-white/10 bg-midnight px-3 py-2 text-sm font-semibold text-cream outline-none focus:border-lime/60"
      />
    </Row>
  );
}
