import { formatInTimeZone } from 'date-fns-tz';

const LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function WeekStrip({ timezone }: { timezone: string }) {
  const now = new Date();
  const todayIndex = Number(formatInTimeZone(now, timezone, 'i')) % 7;

  return (
    <div className="mb-4 flex items-center justify-between px-1">
      {LETTERS.map((letter, index) => {
        const isToday = index === todayIndex;
        const isPast = index < todayIndex;
        return (
          <div key={index} className="flex flex-col items-center gap-1.5">
            <span
              className={`grid h-7 w-7 place-items-center rounded-full text-xs font-bold ${
                isToday ? 'bg-lime text-midnight' : isPast ? 'text-cream' : 'text-slate/60'
              }`}
            >
              {letter}
            </span>
            <span className={`text-[8px] ${isToday ? 'text-lime' : 'text-transparent'}`}>◆</span>
          </div>
        );
      })}
    </div>
  );
}
