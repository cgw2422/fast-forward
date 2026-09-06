// Canonical storage: volume = mL, weight = kg, distance = meters.
// Everything the user sees goes through here.

export type WeightUnit = 'LB' | 'KG';
export type VolumeUnit = 'OZ' | 'ML' | 'L';
export type DistanceUnit = 'MI' | 'KM';

const ML_PER_OZ = 29.5735295625;
const KG_PER_LB = 0.45359237;
const M_PER_MI = 1609.344;

/* ------------------------------------------------------------------ volume */

export function mlToDisplay(ml: number, unit: VolumeUnit): number {
  if (unit === 'OZ') return ml / ML_PER_OZ;
  if (unit === 'L') return ml / 1000;
  return ml;
}

export function displayToMl(value: number, unit: VolumeUnit): number {
  if (unit === 'OZ') return value * ML_PER_OZ;
  if (unit === 'L') return value * 1000;
  return value;
}

export function volumeLabel(unit: VolumeUnit): string {
  return unit === 'OZ' ? 'oz' : unit === 'L' ? 'L' : 'mL';
}

/** Rounded for display: oz/mL to whole numbers, L to one decimal. */
export function formatVolume(ml: number, unit: VolumeUnit, withUnit = true): string {
  const v = mlToDisplay(ml, unit);
  const n = unit === 'L' ? v.toFixed(1) : Math.round(v).toString();
  return withUnit ? `${n} ${volumeLabel(unit)}` : n;
}

/* ------------------------------------------------------------------ weight */

export function kgToDisplay(kg: number, unit: WeightUnit): number {
  return unit === 'LB' ? kg / KG_PER_LB : kg;
}

export function displayToKg(value: number, unit: WeightUnit): number {
  return unit === 'LB' ? value * KG_PER_LB : value;
}

export function weightLabel(unit: WeightUnit): string {
  return unit === 'LB' ? 'lb' : 'kg';
}

export function formatWeight(kg: number, unit: WeightUnit, withUnit = true): string {
  const v = kgToDisplay(kg, unit).toFixed(1);
  return withUnit ? `${v} ${weightLabel(unit)}` : v;
}

/* ---------------------------------------------------------------- distance */

export function metersToDisplay(m: number, unit: DistanceUnit): number {
  return unit === 'MI' ? m / M_PER_MI : m / 1000;
}

export function displayToMeters(value: number, unit: DistanceUnit): number {
  return unit === 'MI' ? value * M_PER_MI : value * 1000;
}

export function distanceLabel(unit: DistanceUnit): string {
  return unit === 'MI' ? 'mi' : 'km';
}

export function formatDistance(m: number, unit: DistanceUnit, withUnit = true): string {
  const v = metersToDisplay(m, unit).toFixed(2).replace(/\.?0+$/, '');
  return withUnit ? `${v} ${distanceLabel(unit)}` : v;
}

/* ---------------------------------------------------------------- duration */

/** 18:42:17 — the fasting clock. */
export function formatElapsedClock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

/** 91h 18m — history-friendly. */
export function formatDurationShort(ms: number): string {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}m`;
  return `${h}h ${m}m`;
}

/** Extended fasts read as "Day 4" rather than a four-digit hour count. */
export function fastDayNumber(ms: number): number {
  return Math.floor(ms / 86_400_000) + 1;
}
