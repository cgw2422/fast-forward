'use client';

import { useEffect, useState } from 'react';
import { formatElapsedClock, fastDayNumber } from '@/lib/units';

/** Ticks locally from a server-provided start so the fast clock never lags. */
export function FastClock({ startIso, className = '' }: { startIso: string; className?: string }) {
  const start = new Date(startIso).getTime();
  const [elapsed, setElapsed] = useState(() => Date.now() - start);

  useEffect(() => {
    const id = setInterval(() => setElapsed(Date.now() - start), 1000);
    return () => clearInterval(id);
  }, [start]);

  const days = fastDayNumber(elapsed);
  const showDay = elapsed >= 86_400_000;

  return (
    <div className={className}>
      {showDay ? <div className="ff-label mb-1 text-lime">Day {days}</div> : null}
      <div className="tabular-nums">{formatElapsedClock(elapsed)}</div>
    </div>
  );
}

export function useElapsed(startIso: string | null) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    if (!startIso) return;
    const start = new Date(startIso).getTime();
    const tick = () => setElapsed(Date.now() - start);
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startIso]);
  return elapsed;
}
