/**
 * The water reminder rules, verified directly against the pure evaluator.
 * Run with: npm run test
 */
import { evaluateWaterReminder } from '../src/lib/water-logic';
import { isWithinWindow, parseHHMM } from '../src/lib/dates';

let failures = 0;
let checks = 0;

function check(label: string, actual: unknown, expected: unknown) {
  checks += 1;
  const ok = String(actual) === String(expected);
  if (!ok) failures += 1;
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got ${actual}, want ${expected}`}`);
}

/** Local-time helper for a fixed test day, treated as UTC for determinism. */
const DAY_START = new Date('2026-09-06T00:00:00.000Z');
const at = (hhmm: string) => new Date(`2026-09-06T${hhmm}:00.000Z`);
const hhmm = (date: Date) => date.toISOString().slice(11, 16);

const GOAL_ML = 3549.4; // 120 oz
const OZ = 29.5735295625;

const base = {
  dayStart: DAY_START,
  goalMl: GOAL_ML,
  intervalMinutes: 60,
  windowStartMinutes: parseHHMM('07:00'),
  idleMinutes: 60,
  stopAfterGoal: true,
};

console.log('\nWater reminders — anchored to the last drink, not the clock');

console.log('\n  Nothing logged yet');
{
  const r = evaluateWaterReminder({ ...base, now: at('09:30'), lastWaterAt: null, totalMl: 0 });
  check('anchors to window open + interval (08:00)', hhmm(r.nextReminderAt), '08:00');
  check('is due at 9:30 AM', r.due, true);
  check('notifies', r.shouldNotify, true);
}

console.log('\n  32 oz logged at 1:45 PM, 60-minute interval');
{
  const lastWaterAt = at('13:45');
  const totalMl = 32 * OZ;

  const at1400 = evaluateWaterReminder({ ...base, now: at('14:00'), lastWaterAt, totalMl });
  check('next reminder is 2:45 PM', hhmm(at1400.nextReminderAt), '14:45');
  check('NOT due at 2:00 PM', at1400.due, false);
  check('does not notify at 2:00 PM', at1400.shouldNotify, false);

  const at1446 = evaluateWaterReminder({ ...base, now: at('14:46'), lastWaterAt, totalMl });
  check('due at 2:46 PM', at1446.due, true);
  check('notifies at 2:46 PM', at1446.shouldNotify, true);
}

console.log('\n  Idle guard');
{
  // 30-minute interval makes it due at 2:20, but the idle guard wants 60
  // minutes since the last drink — so 2:25 is still too soon.
  const r = evaluateWaterReminder({
    ...base,
    intervalMinutes: 30,
    idleMinutes: 60,
    now: at('14:25'),
    lastWaterAt: at('13:50'),
    totalMl: 500,
  });
  check('due by interval', r.due, true);
  check('but not idle long enough', r.idleLongEnough, false);
  check('so it stays quiet', r.shouldNotify, false);
}

console.log('\n  Goal reached');
{
  const r = evaluateWaterReminder({
    ...base,
    now: at('17:00'),
    lastWaterAt: at('15:00'),
    totalMl: GOAL_ML,
  });
  check('goalReached', r.goalReached, true);
  check('stopped for the day', r.stopped, true);
  check('no further reminders', r.shouldNotify, false);

  const keepGoing = evaluateWaterReminder({
    ...base,
    stopAfterGoal: false,
    now: at('17:00'),
    lastWaterAt: at('15:00'),
    totalMl: GOAL_ML,
  });
  check('still reminds when the stop-at-goal setting is off', keepGoing.shouldNotify, true);
}

console.log('\nWindows');
{
  check('07:00–20:00 includes 13:00', isWithinWindow(parseHHMM('13:00'), parseHHMM('07:00'), parseHHMM('20:00')), true);
  check('07:00–20:00 excludes 21:00', isWithinWindow(parseHHMM('21:00'), parseHHMM('07:00'), parseHHMM('20:00')), false);
  // Quiet hours legitimately wrap past midnight.
  check('quiet 21:30–07:00 includes 23:00', isWithinWindow(parseHHMM('23:00'), parseHHMM('21:30'), parseHHMM('07:00')), true);
  check('quiet 21:30–07:00 includes 03:00', isWithinWindow(parseHHMM('03:00'), parseHHMM('21:30'), parseHHMM('07:00')), true);
  check('quiet 21:30–07:00 excludes 12:00', isWithinWindow(parseHHMM('12:00'), parseHHMM('21:30'), parseHHMM('07:00')), false);
}

console.log(
  failures === 0
    ? `\n${checks} checks passed.\n`
    : `\n${failures} of ${checks} checks FAILED.\n`
);
process.exit(failures === 0 ? 0 : 1);
