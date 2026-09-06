import { formatInTimeZone, toZonedTime, fromZonedTime } from 'date-fns-tz';

/** Midnight-anchored calendar day in the user's timezone, stored as a UTC Date. */
export function dayKey(date: Date, timezone: string): Date {
  const ymd = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
  return new Date(`${ymd}T00:00:00.000Z`);
}

export function todayKey(timezone: string): Date {
  return dayKey(new Date(), timezone);
}

export function ymd(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, 'yyyy-MM-dd');
}

/** Start/end instants for a calendar day in the user's timezone. */
export function dayRange(date: Date, timezone: string): { start: Date; end: Date } {
  const key = formatInTimeZone(date, timezone, 'yyyy-MM-dd');
  const start = fromZonedTime(`${key} 00:00:00`, timezone);
  const end = new Date(start.getTime() + 86_400_000);
  return { start, end };
}

export function formatTime(date: Date, timezone: string, use24Hour: boolean): string {
  return formatInTimeZone(date, timezone, use24Hour ? 'HH:mm' : 'h:mm a');
}

export function formatDate(date: Date, timezone: string, pattern = 'EEE, MMM d, yyyy'): string {
  return formatInTimeZone(date, timezone, pattern);
}

/** Minutes since local midnight — the unit the reminder windows work in. */
export function minutesOfDay(date: Date, timezone: string): number {
  const [h, m] = formatInTimeZone(date, timezone, 'HH:mm').split(':').map(Number);
  return h * 60 + m;
}

export function parseHHMM(value: string): number {
  const [h, m] = value.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Handles windows that wrap past midnight (quiet hours 21:30 -> 07:00). */
export function isWithinWindow(nowMinutes: number, startMinutes: number, endMinutes: number): boolean {
  if (startMinutes <= endMinutes) return nowMinutes >= startMinutes && nowMinutes < endMinutes;
  return nowMinutes >= startMinutes || nowMinutes < endMinutes;
}

export function greeting(date: Date, timezone: string): string {
  const hour = Number(formatInTimeZone(date, timezone, 'H'));
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/** Day-of-week index, 0 = Sunday, in the user's timezone. */
export function weekdayIndex(date: Date, timezone: string): number {
  return Number(formatInTimeZone(date, timezone, 'i')) % 7;
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function localDateTimeInputValue(date: Date, timezone: string): string {
  return formatInTimeZone(date, timezone, "yyyy-MM-dd'T'HH:mm");
}

export function fromLocalDateTimeInput(value: string, timezone: string): Date {
  // <input type="datetime-local"> gives "yyyy-MM-ddTHH:mm" (seconds optional).
  const normalized = value.replace('T', ' ');
  const withSeconds = normalized.length <= 16 ? `${normalized}:00` : normalized;
  return fromZonedTime(withSeconds, timezone);
}

export { toZonedTime, fromZonedTime, formatInTimeZone };
