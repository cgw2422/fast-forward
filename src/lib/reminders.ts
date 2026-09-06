import 'server-only';
import { prisma } from './prisma';
import { sendOnce, sendToUser, pushConfigured } from './push';
import { dayRange, isWithinWindow, minutesOfDay, parseHHMM, todayKey, ymd, formatTime } from './dates';
import { formatVolume, formatDurationShort, mlToDisplay } from './units';
import {
  waterReminderBody,
  SMART_WATER,
  MOVE_COPY,
  POP_COPY,
  FAST_COPY,
  FAST_MILESTONE_HOURS,
  EVENING_COPY,
  type NagLevel,
  type Personality,
} from './copy';
import { streakDays } from './poppact';

/* ------------------------------------------------------------------ helpers */

function inQuietHours(now: Date, timezone: string, quietStart: string, quietEnd: string): boolean {
  return isWithinWindow(minutesOfDay(now, timezone), parseHHMM(quietStart), parseHHMM(quietEnd));
}

/** "Has this clock time passed today?" — used by the fixed-time reminders. */
function timeHasPassed(now: Date, timezone: string, hhmm: string): boolean {
  return minutesOfDay(now, timezone) >= parseHHMM(hhmm);
}

export type WaterState = {
  goalMl: number;
  totalMl: number;
  lastAt: Date | null;
  nextReminderAt: Date | null;
  goalReached: boolean;
};

/**
 * The heart of the water engine: the next reminder is always
 * `lastWaterLoggedAt + interval`, never `lastNotificationSentAt + interval`.
 * Logging water at 1:45 with a 60-minute interval moves the next nudge to 2:45.
 */
export async function computeWaterState(
  userId: string,
  timezone: string,
  goalMl: number,
  intervalMinutes: number,
  windowStart: string,
  now = new Date()
): Promise<WaterState> {
  const { start, end } = dayRange(now, timezone);
  const entries = await prisma.waterEntry.findMany({
    where: { userId, loggedAt: { gte: start, lt: end } },
    orderBy: { loggedAt: 'desc' },
  });

  const totalMl = entries.reduce((sum, e) => sum + e.volumeMl, 0);
  const lastAt = entries[0]?.loggedAt ?? null;

  // With nothing logged yet, the clock starts at the window opening, not midnight.
  const windowOpen = new Date(start.getTime() + parseHHMM(windowStart) * 60_000);
  const anchor = lastAt ?? windowOpen;
  const nextReminderAt = new Date(anchor.getTime() + intervalMinutes * 60_000);

  return { goalMl, totalMl, lastAt, nextReminderAt, goalReached: totalMl >= goalMl };
}

/* ---------------------------------------------------------------- the tick */

export type TickResult = { checked: number; sent: number; details: string[] };

/**
 * Idempotent by construction: every send goes through `sendOnce` with a dedupe
 * key containing the calendar day (and, for water, the reminder slot), so a
 * every-minute cron and a manual trigger cannot double-send.
 */
export async function runReminderTick(now = new Date()): Promise<TickResult> {
  const result: TickResult = { checked: 0, sent: 0, details: [] };
  if (!pushConfigured()) {
    result.details.push('VAPID keys not configured — skipping.');
    return result;
  }

  const users = await prisma.user.findMany({
    where: { notificationPref: { enabled: true }, pushSubscriptions: { some: {} } },
    include: { notificationPref: true, preference: true, popPact: true },
  });

  for (const user of users) {
    const pref = user.notificationPref;
    const settings = user.preference;
    if (!pref || !settings) continue;

    result.checked += 1;
    const tz = user.timezone;
    const day = ymd(now, tz);
    const nowMinutes = minutesOfDay(now, tz);
    const quiet = inQuietHours(now, tz, pref.quietStart, pref.quietEnd);
    const level = Math.min(5, Math.max(1, pref.nagLevel)) as NagLevel;
    const personality = pref.personality as Personality;
    const firstName = user.name.split(' ')[0];

    /* ---------------------------------------------------------- water */
    if (pref.waterEnabled && !quiet) {
      const inWindow = isWithinWindow(nowMinutes, parseHHMM(pref.waterWindowStart), parseHHMM(pref.waterWindowEnd));
      if (inWindow) {
        const state = await computeWaterState(
          user.id,
          tz,
          settings.dailyWaterMl,
          pref.waterIntervalMinutes,
          pref.waterWindowStart,
          now
        );

        const stopped = pref.waterStopAfterGoal && state.goalReached;
        const idleLongEnough =
          !state.lastAt || now.getTime() - state.lastAt.getTime() >= pref.waterIdleMinutes * 60_000;
        const due = state.nextReminderAt !== null && now.getTime() >= state.nextReminderAt.getTime();

        if (!stopped && due && idleLongEnough) {
          const remainingMl = Math.max(0, state.goalMl - state.totalMl);
          const pctDone = state.goalMl > 0 ? state.totalMl / state.goalMl : 0;
          const unit = settings.volumeUnit;

          let body: string;
          if (state.totalMl === 0 && nowMinutes >= 11 * 60) {
            body = SMART_WATER.noneByLateMorning;
          } else if (pctDone >= 0.85) {
            body = SMART_WATER.nearlyDone(formatVolume(remainingMl, unit));
          } else if (pctDone < 0.35 && nowMinutes >= 14 * 60) {
            body = SMART_WATER.behindPace;
          } else {
            body = waterReminderBody(personality, level, nowMinutes, firstName);
          }

          // Slot the dedupe key so at most one nudge lands per interval bucket.
          const slot = Math.floor(nowMinutes / Math.max(15, pref.waterIntervalMinutes));
          const sent = await sendOnce(user.id, `water:${day}:${slot}`, {
            kind: 'water',
            title: 'Hydration Station',
            body,
            url: '/hydration',
            tag: 'ff-water',
            renotify: true,
          });
          if (sent) {
            result.sent += 1;
            result.details.push(`water -> ${user.email}`);
          }
        }
      }
    }

    /* -------------------------------------------------------- pop pact */
    if (pref.popEnabled && !quiet && user.popPact && timeHasPassed(now, tz, pref.popTime)) {
      const days = streakDays(user.popPact, tz);
      const sent = await sendOnce(user.id, `pop:${day}`, {
        kind: 'pop',
        title: POP_COPY.dailyTitle(days),
        body: POP_COPY.dailyBody,
        url: '/pop-pact',
        tag: 'ff-pop',
      });
      if (sent) {
        result.sent += 1;
        result.details.push(`pop -> ${user.email}`);
      }
    }

    /* ------------------------------------------------------- movement */
    if (pref.moveEnabled && !quiet && timeHasPassed(now, tz, pref.moveTime)) {
      const { start, end } = dayRange(now, tz);
      const walks = await prisma.walkEntry.aggregate({
        where: { userId: user.id, loggedAt: { gte: start, lt: end } },
        _sum: { minutes: true },
      });
      const minutes = walks._sum.minutes ?? 0;
      const goal = settings.dailyWalkMinutes;

      if (minutes === 0) {
        const sent = await sendOnce(user.id, `move:${day}`, {
          kind: 'move',
          title: 'Walk This Weigh',
          body: MOVE_COPY.notStarted,
          url: '/move',
          tag: 'ff-move',
        });
        if (sent) {
          result.sent += 1;
          result.details.push(`move -> ${user.email}`);
        }
      } else if (minutes < goal) {
        const sent = await sendOnce(user.id, `move:${day}`, {
          kind: 'move',
          title: 'Walk This Weigh',
          body: MOVE_COPY.tinyWinNudge(settings.tinyWalkMinutes),
          url: '/move',
          tag: 'ff-move',
        });
        if (sent) {
          result.sent += 1;
          result.details.push(`move-tiny -> ${user.email}`);
        }
      }
    }

    /* ------------------------------------------------ fast milestones */
    if (pref.fastMilestonesEnabled) {
      const activeFast = await prisma.fast.findFirst({
        where: { userId: user.id, status: 'ACTIVE' },
        include: { milestones: true },
      });
      if (activeFast) {
        const elapsedHours = (now.getTime() - activeFast.startAt.getTime()) / 3_600_000;
        const targets = new Set<number>(FAST_MILESTONE_HOURS);
        if (activeFast.targetHours) targets.add(activeFast.targetHours);

        for (const hours of Array.from(targets).sort((a, b) => a - b)) {
          if (elapsedHours < hours) continue;
          if (activeFast.milestones.some((m) => m.hours === hours)) continue;

          await prisma.fastMilestone.create({
            data: {
              fastId: activeFast.id,
              hours,
              reachedAt: new Date(activeFast.startAt.getTime() + hours * 3_600_000),
              notified: true,
            },
          });
          await prisma.timelineEvent.create({
            data: {
              userId: user.id,
              type: 'FAST_MILESTONE',
              occurredAt: new Date(activeFast.startAt.getTime() + hours * 3_600_000),
              title: `${hours}-hour milestone reached`,
              detail: FAST_COPY.milestoneBody,
              refId: activeFast.id,
            },
          });

          // Informational only — never encouragement to keep going.
          if (!quiet) {
            const sent = await sendOnce(user.id, `fast:${activeFast.id}:${hours}`, {
              kind: 'fast_milestone',
              title: FAST_COPY.milestoneTitle(hours),
              body: FAST_COPY.milestoneBody,
              url: '/fast',
              tag: 'ff-fast',
            });
            if (sent) {
              result.sent += 1;
              result.details.push(`fast ${hours}h -> ${user.email}`);
            }
          }
        }
      }
    }

    /* ----------------------------------------------- habit stack rules */
    if (pref.habitStackEnabled && !quiet) {
      const sentStacks = await evaluateHabitStacks(user.id, tz, day, now);
      result.sent += sentStacks;
    }

    /* ------------------------------------------------- evening recap */
    if (pref.eveningCheckEnabled && timeHasPassed(now, tz, pref.eveningCheckTime)) {
      const summary = await buildEveningSummary(user.id, tz, now);
      const sent = await sendOnce(user.id, `evening:${day}`, {
        kind: 'evening',
        title: EVENING_COPY.title,
        body: summary,
        url: '/today',
        tag: 'ff-evening',
      });
      if (sent) {
        result.sent += 1;
        result.details.push(`evening -> ${user.email}`);
      }
    }
  }

  return result;
}

/* --------------------------------------------------------- habit stacking */

/**
 * Event-based rather than time-based: "you did part 1, finish the stack".
 * Fires only once the trigger has happened and the target still has not,
 * within the configured window.
 */
async function evaluateHabitStacks(userId: string, timezone: string, day: string, now: Date): Promise<number> {
  const rules = await prisma.habitStackRule.findMany({ where: { userId, enabled: true } });
  if (rules.length === 0) return 0;

  const { start, end } = dayRange(now, timezone);
  let sent = 0;

  for (const rule of rules) {
    const triggerAt = await latestEventAt(userId, rule.trigger, start, end);
    if (!triggerAt) continue;

    const elapsedMinutes = (now.getTime() - triggerAt.getTime()) / 60_000;
    if (elapsedMinutes < rule.withinMinutes) continue;
    // Don't nag about a stack from many hours ago.
    if (elapsedMinutes > rule.withinMinutes + 120) continue;

    const targetAt = await latestEventAt(userId, rule.target, triggerAt, end);
    if (targetAt) continue;

    const didSend = await sendOnce(userId, `stack:${rule.id}:${day}`, {
      kind: 'habit_stack',
      title: 'Finish the stack',
      body: rule.message,
      url: '/today',
      tag: 'ff-stack',
    });
    if (didSend) sent += 1;
  }

  return sent;
}

type AnyEventKind =
  | 'WEIGHT_LOGGED'
  | 'WATER_LOGGED'
  | 'WALK_LOGGED'
  | 'FAST_STARTED'
  | 'FAST_ENDED'
  | 'ELECTROLYTES_LOGGED'
  | 'CHECKIN_LOGGED'
  | 'HABIT_COMPLETED';

async function latestEventAt(userId: string, kind: AnyEventKind, from: Date, to: Date): Promise<Date | null> {
  const range = { gte: from, lt: to };
  switch (kind) {
    case 'WEIGHT_LOGGED': {
      const row = await prisma.weightEntry.findFirst({
        where: { userId, loggedAt: range },
        orderBy: { loggedAt: 'desc' },
      });
      return row?.loggedAt ?? null;
    }
    case 'WATER_LOGGED': {
      const row = await prisma.waterEntry.findFirst({
        where: { userId, loggedAt: range },
        orderBy: { loggedAt: 'desc' },
      });
      return row?.loggedAt ?? null;
    }
    case 'WALK_LOGGED': {
      const row = await prisma.walkEntry.findFirst({
        where: { userId, loggedAt: range },
        orderBy: { loggedAt: 'desc' },
      });
      return row?.loggedAt ?? null;
    }
    case 'ELECTROLYTES_LOGGED': {
      const row = await prisma.electrolyteEntry.findFirst({
        where: { userId, loggedAt: range },
        orderBy: { loggedAt: 'desc' },
      });
      return row?.loggedAt ?? null;
    }
    case 'FAST_STARTED': {
      const row = await prisma.fast.findFirst({ where: { userId, startAt: range }, orderBy: { startAt: 'desc' } });
      return row?.startAt ?? null;
    }
    case 'FAST_ENDED': {
      const row = await prisma.fast.findFirst({
        where: { userId, endAt: range },
        orderBy: { endAt: 'desc' },
      });
      return row?.endAt ?? null;
    }
    case 'CHECKIN_LOGGED': {
      const row = await prisma.dailyCheckIn.findFirst({
        where: { userId, createdAt: range },
        orderBy: { createdAt: 'desc' },
      });
      return row?.createdAt ?? null;
    }
    case 'HABIT_COMPLETED': {
      const row = await prisma.habitCompletion.findFirst({
        where: { habit: { userId }, completedAt: range },
        orderBy: { completedAt: 'desc' },
      });
      return row?.completedAt ?? null;
    }
    default:
      return null;
  }
}

/* ------------------------------------------------------- evening summary */

export async function buildEveningSummary(userId: string, timezone: string, now = new Date()): Promise<string> {
  const { start, end } = dayRange(now, timezone);
  const range = { gte: start, lt: end };

  const [prefs, pact, water, walks, electrolytes, activeFast, habits, completions] = await Promise.all([
    prisma.userPreference.findUnique({ where: { userId } }),
    prisma.popPact.findUnique({ where: { userId } }),
    prisma.waterEntry.aggregate({ where: { userId, loggedAt: range }, _sum: { volumeMl: true } }),
    prisma.walkEntry.aggregate({ where: { userId, loggedAt: range }, _sum: { minutes: true } }),
    prisma.electrolyteEntry.count({ where: { userId, loggedAt: range } }),
    prisma.fast.findFirst({ where: { userId, status: 'ACTIVE' } }),
    prisma.habit.findMany({ where: { userId, active: true } }),
    prisma.habitCompletion.findMany({
      where: { habit: { userId }, date: todayKey(timezone) },
    }),
  ]);

  if (!prefs) return 'Daily check ready.';

  const lines: string[] = [];

  if (pact) lines.push(`🤝 Pop Pact — ${streakDays(pact, timezone)} days`);

  const totalMl = water._sum.volumeMl ?? 0;
  lines.push(
    `💧 Water — ${formatVolume(totalMl, prefs.volumeUnit, false)} / ${formatVolume(prefs.dailyWaterMl, prefs.volumeUnit)}`
  );

  const minutes = walks._sum.minutes ?? 0;
  lines.push(`🚶 Walk — ${minutes} / ${prefs.dailyWalkMinutes} min`);

  if (activeFast) {
    lines.push(`⏱ Fast — ${formatDurationShort(now.getTime() - activeFast.startAt.getTime())}`);
  }
  if (electrolytes > 0) lines.push('⚡ Electrolytes — Logged');

  const done = completions.filter((c) => c.status !== 'SKIPPED').length;
  if (habits.length > 0) lines.push(`${done} of ${habits.length} votes cast today.`);

  const remainingMl = Math.max(0, prefs.dailyWaterMl - totalMl);
  if (remainingMl > 0 && mlToDisplay(remainingMl, prefs.volumeUnit) >= 1) {
    lines.push(EVENING_COPY.closingLine(formatVolume(remainingMl, prefs.volumeUnit)));
  } else {
    lines.push(EVENING_COPY.allDone);
  }

  return lines.join('\n');
}

export { sendToUser, formatTime };
