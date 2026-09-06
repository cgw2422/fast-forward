export function LogoMark({ size = 44 }: { size?: number }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src="/icons/icon.svg" alt="" width={size} height={size} className="rounded-[22%]" />
  );
}

export function Wordmark({ className = '' }: { className?: string }) {
  return (
    // Scales with the viewport so "FORWARD" never runs off a narrow phone.
    <div className={`select-none leading-[0.88] ${className}`}>
      <div className="text-[clamp(1.9rem,9vw,2.5rem)] font-black italic tracking-tight text-cream">FAST</div>
      <div className="text-[clamp(1.9rem,9vw,2.5rem)] font-black italic tracking-tight text-lime">
        FORWARD
        <span className="align-super text-[0.55rem] not-italic tracking-normal text-slate">™</span>
      </div>
    </div>
  );
}

export function Tagline({ className = '' }: { className?: string }) {
  return (
    <p className={`text-sm font-semibold text-slate ${className}`}>
      Small choices. Kept promises. <span className="text-lime">More life.</span>
    </p>
  );
}
