import Link from 'next/link';

export function TimelineNav({
  prev,
  next,
  isToday,
}: {
  prev: string;
  next: string | null;
  isToday: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <Link href={`/timeline?date=${prev}`} className="ff-btn-secondary px-3 py-2 text-xs">
        ← Previous
      </Link>
      {isToday ? (
        <span className="text-xs font-bold uppercase tracking-widest text-lime">Today</span>
      ) : (
        <Link href="/timeline" className="text-xs font-bold uppercase tracking-widest text-lime">
          Jump to today
        </Link>
      )}
      {next ? (
        <Link href={`/timeline?date=${next}`} className="ff-btn-secondary px-3 py-2 text-xs">
          Next →
        </Link>
      ) : (
        <span className="w-[4.9rem]" />
      )}
    </div>
  );
}
