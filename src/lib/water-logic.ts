/**
 * Pure water-reminder scheduling. No database, no server-only imports — the
 * eligibility rules are the part most worth testing directly.
 */

export type WaterEligibilityInput = {
  now: Date;
  /** Start of the user's calendar day, as an instant. */
  dayStart: Date;
  lastWaterAt: Date | null;
  totalMl: number;
  goalMl: number;
  intervalMinutes: number;
  /** Minutes past local midnight when the reminder window opens. */
  windowStartMinutes: number;
  idleMinutes: number;
  stopAfterGoal: boolean;
};

export type WaterEligibility = {
  nextReminderAt: Date;
  goalReached: boolean;
  due: boolean;
  idleLongEnough: boolean;
  stopped: boolean;
  shouldNotify: boolean;
};

/**
 * The next reminder is anchored to the last logged drink, not to the last
 * notification or a bare timer tick. Water at 1:45 PM with a 60-minute interval
 * moves the next nudge to 2:45 PM, so a 2:00 PM cron pass stays quiet.
 *
 * With nothing logged yet, the anchor is when the reminder window opened.
 */
export function evaluateWaterReminder(input: WaterEligibilityInput): WaterEligibility {
  const windowOpen = new Date(input.dayStart.getTime() + input.windowStartMinutes * 60_000);
  const anchor = input.lastWaterAt ?? windowOpen;
  const nextReminderAt = new Date(anchor.getTime() + input.intervalMinutes * 60_000);

  const goalReached = input.goalMl > 0 && input.totalMl >= input.goalMl;
  const stopped = input.stopAfterGoal && goalReached;
  const due = input.now.getTime() >= nextReminderAt.getTime();
  const idleLongEnough =
    !input.lastWaterAt || input.now.getTime() - input.lastWaterAt.getTime() >= input.idleMinutes * 60_000;

  return {
    nextReminderAt,
    goalReached,
    due,
    idleLongEnough,
    stopped,
    shouldNotify: due && idleLongEnough && !stopped,
  };
}
