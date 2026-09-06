/**
 * The Pop Goblin. Used sparingly on purpose — a mascot stops being funny the
 * moment it shows up on every screen.
 */
export function PopGoblin({
  size = 64,
  mood = 'smug',
}: {
  size?: number;
  mood?: 'smug' | 'angry' | 'defeated';
}) {
  const cupFill = mood === 'angry' ? '#FF655D' : mood === 'defeated' ? '#667085' : '#E8564E';
  const browAngle = mood === 'angry' ? 14 : mood === 'defeated' ? -10 : 6;

  return (
    <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" className="shrink-0">
      {/* straw */}
      <path d="M62 18 L70 6" stroke="#F7A8C4" strokeWidth="5" strokeLinecap="round" />
      <path d="M70 6 L78 10" stroke="#F7A8C4" strokeWidth="5" strokeLinecap="round" />
      {/* lid */}
      <rect x="26" y="20" width="48" height="9" rx="4.5" fill="#F2F0EA" />
      {/* cup */}
      <path d="M30 30 H70 L64 88 A4 4 0 0 1 60 91 H40 A4 4 0 0 1 36 88 Z" fill={cupFill} />
      <path d="M34 40 H66 L63 56 H37 Z" fill="#ffffff" opacity="0.13" />
      {/* eyes */}
      <ellipse cx="43" cy="50" rx="7" ry="8" fill="#F7F6F1" />
      <ellipse cx="58" cy="50" rx="7" ry="8" fill="#F7F6F1" />
      <circle cx="44" cy="52" r="3.4" fill="#101828" />
      <circle cx="59" cy="52" r="3.4" fill="#101828" />
      {/* brows */}
      <path
        d={`M36 ${42 - browAngle / 2} L49 ${42 + browAngle / 2}`}
        stroke="#101828"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      <path
        d={`M65 ${42 - browAngle / 2} L52 ${42 + browAngle / 2}`}
        stroke="#101828"
        strokeWidth="3.4"
        strokeLinecap="round"
      />
      {/* mouth */}
      {mood === 'defeated' ? (
        <path d="M42 71 Q50 65 58 71" stroke="#101828" strokeWidth="3" fill="none" strokeLinecap="round" />
      ) : (
        <path d="M41 66 Q50 75 59 66" stroke="#101828" strokeWidth="3" fill="none" strokeLinecap="round" />
      )}
      {/* arms */}
      <path d="M30 52 Q20 56 22 66" stroke={cupFill} strokeWidth="6" fill="none" strokeLinecap="round" />
      <path d="M70 52 Q80 56 78 66" stroke={cupFill} strokeWidth="6" fill="none" strokeLinecap="round" />
    </svg>
  );
}

export function GoblinSign({ text = 'NOT TODAY, GOBLIN.' }: { text?: string }) {
  return (
    <div className="inline-block -rotate-6 rounded-md bg-cream px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-midnight shadow-lg">
      {text}
    </div>
  );
}
