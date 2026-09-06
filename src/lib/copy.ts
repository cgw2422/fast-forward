/**
 * All user-facing personality lives here so it can be expanded without touching
 * feature code. Notification tone is chosen by (personality x nagLevel).
 */

export type Personality = 'PROFESSIONAL' | 'FRIENDLY' | 'DAD_JOKES' | 'UNHINGED';
export type NagLevel = 1 | 2 | 3 | 4 | 5;

export const NAG_LEVELS: Record<NagLevel, { label: string; blurb: string }> = {
  1: { label: 'Gentle', blurb: 'A light tap on the shoulder.' },
  2: { label: 'Normal', blurb: 'Friendly and to the point.' },
  3: { label: 'Pushy', blurb: 'Will mention the time elapsed.' },
  4: { label: 'Dad Mode', blurb: 'Mild, loving disappointment.' },
  5: { label: 'Absolutely Unhinged', blurb: 'You asked for this.' },
};

export const PERSONALITIES: Record<Personality, { label: string; blurb: string }> = {
  PROFESSIONAL: { label: 'Professional', blurb: 'Plain, factual reminders.' },
  FRIENDLY: { label: 'Friendly', blurb: 'Warm and encouraging.' },
  DAD_JOKES: { label: 'Dad Jokes', blurb: 'Groan-inducing by design.' },
  UNHINGED: { label: 'Unhinged', blurb: 'All caps energy.' },
};

type Pool = Record<Personality, string[]>;

function pick(pool: string[], seed: number): string {
  if (pool.length === 0) return '';
  return pool[Math.abs(seed) % pool.length];
}

/* ------------------------------------------------------------ water pools */

const WATER_BY_LEVEL: Record<NagLevel, Pool> = {
  1: {
    PROFESSIONAL: ["Don't forget your water."],
    FRIENDLY: ['Sip check. 💧', 'A little water would be nice.'],
    DAD_JOKES: ['Water you waiting for?', 'This message is 100% water-based. So are you.'],
    UNHINGED: ['psst. water.'],
  },
  2: {
    PROFESSIONAL: ['Hydration check-in.', 'Time to log some water.'],
    FRIENDLY: ['Hydration Station check-in. 💧', 'Good time for a glass of water.'],
    DAD_JOKES: ['Hydration Station calling. Time for some water! 💧', 'Be like a plant. Absorb the water. Ignore the rest.'],
    UNHINGED: ['WATER. NOW. (please)', 'The bottle is right there. RIGHT THERE.'],
  },
  3: {
    PROFESSIONAL: ['It has been a while since your last water entry.'],
    FRIENDLY: ["It's been a bit. Grab some water?"],
    DAD_JOKES: ["It's been a while. Your water bottle is starting to feel used.", 'Your hydration is currently in the group chat talking about you.'],
    UNHINGED: ["IT'S BEEN A WHILE. DRINK SOMETHING."],
  },
  4: {
    PROFESSIONAL: ['Water intake is behind your usual pace.'],
    FRIENDLY: ['Circling back on that water situation.'],
    DAD_JOKES: ['You own a water bottle. Perhaps we could use it.', "I'm not mad about the water. I'm just disappointed.", 'Back in my day we drank water. Also today. Today would be good.'],
    UNHINGED: ['THE BOTTLE IS RIGHT THERE, MY GUY.'],
  },
  5: {
    PROFESSIONAL: ['Water reminder: no intake logged recently.'],
    FRIENDLY: ['Okay this is the loud one. Water!'],
    DAD_JOKES: ['🚨 HYDRATION EMERGENCY. Well. Mild inconvenience. But still.'],
    UNHINGED: ['🚨 THE WATER. DRINK IT.', '🚨 EMERGENCY: MOUTH DRY. HAND EMPTY. FIX BOTH.', 'WATER WATER WATER WATER WATER'],
  },
};

export function waterReminderBody(personality: Personality, level: NagLevel, seed: number, firstName?: string): string {
  const pool = WATER_BY_LEVEL[level][personality];
  const line = pick(pool, seed);
  if (level === 5 && personality === 'UNHINGED' && firstName) {
    return `🚨 ${firstName.toUpperCase()}. THE WATER. DRINK IT.`;
  }
  return line;
}

/* ------------------------------------------------- smart / contextual water */

export const SMART_WATER = {
  noneByLateMorning: 'Well... this is awkward. Your water bottle would like a word.',
  behindPace: 'Hydration Station status: questionable.',
  nearlyDone: (remaining: string) => `${remaining} left. Finish him.`,
  goalReached: 'ABSOLUTELY DRENCHED. Daily goal reached. 💧',
};

/* ---------------------------------------------------------------- movement */

export const MOVE_COPY = {
  notStarted: "Zero minutes today. Let's get five.",
  complete: 'LEGS: OPERATIONAL',
  tinyWinNudge: (minutes: number) => `Not feeling the full walk? ${minutes} minutes counts. Five beats zero.`,
  motto: 'Five beats zero.',
};

export const MOVE_ACHIEVEMENTS: { key: string; minutes: number; label: string }[] = [
  { key: 'move_first', minutes: 1, label: 'Look At You Go' },
  { key: 'move_goal', minutes: 30, label: 'Legs: Operational' },
  { key: 'move_60', minutes: 60, label: 'These Shoes Were Made for Something' },
  { key: 'move_120', minutes: 120, label: 'Forrest Gump Mode' },
];

/* ---------------------------------------------------------------- pop pact */

export const POP_ACHIEVEMENTS: { key: string; days: number; label: string }[] = [
  { key: 'pop_1', days: 1, label: 'Fizzless Wonder' },
  { key: 'pop_7', days: 7, label: 'Pop Dropper' },
  { key: 'pop_30', days: 30, label: 'Soda? Never Heard of Her.' },
  { key: 'pop_100', days: 100, label: 'Certified De-Fizzed' },
  { key: 'pop_365', days: 365, label: 'The Fizz Is History' },
];

export const POP_COPY = {
  dailyTitle: (days: number) => `THE POP PACT — DAY ${days}`,
  dailyBody: 'Another day to keep the deal.',
  goblinDenied: 'The Pop Goblin has requested visitation rights. Denied.',
  keepingPromise: 'Keeping the promise.',
  cravingTitle: 'FIZZ EMERGENCY',
  cravingSubtitle: 'The Pop Goblin has arrived.',
  notToday: "Not today, Goblin! 💪",
  slipRecorded: 'Logged. Streak restarts today — that is all it means.',
};

export const POP_DISTRACTIONS: string[] = [
  'Drink 12 oz of cold water. Slowly. Like a fancy person.',
  'Go outside for 4 minutes. Look at something far away.',
  'Do 10 squats. The Goblin hates cardio.',
  'Text your son one sentence about your day.',
  'Chew gum or brush your teeth. Instantly kills the craving.',
  'Put ice in a glass. Add sparkling water if you have it. Fizz without the deal-breaking.',
  'Set a 10-minute timer. Cravings usually lose interest before you do.',
  'Stand up and stretch. Yes, right now, in front of everyone.',
];

/* ----------------------------------------------------------------- fasting */

export const FAST_MILESTONE_HOURS = [12, 16, 18, 20, 24, 36, 48, 72, 96, 120];

export const FAST_COPY = {
  milestoneTitle: (hours: number) => `${hours} HOURS`,
  milestoneBody: 'You reached your selected milestone.',
  active: 'Fast currently active.',
  completed: (duration: string) => `Fast completed — ${duration}`,
  safety:
    'Prolonged fasting should be done with appropriate medical supervision. If you feel unwell, end your fast. This app tracks what you log; it does not give medical advice.',
  refeedNotice:
    'Ending an extended fast is worth taking slowly. Talk to a qualified professional about how to reintroduce food. This log is for your own observations only.',
};

/* ------------------------------------------------------------------ weight */

export const WEIGHT_COPY = {
  cheer: 'WEIGH TO GO!',
  neutral: 'Logged. Trend is what matters.',
};

/* ------------------------------------------------------------- daily check */

export const EVENING_COPY = {
  title: 'FAST FORWARD — DAILY CHECK',
  closingLine: (remaining: string) => `You're ${remaining} away from closing out the day.`,
  allDone: 'Everything you set out to do today — done.',
};

/* -------------------------------------------------------------- identity */

export const IDENTITY_LINES = [
  'Small choices. Kept promises. More life.',
  'Remember why. More energy. More movement. More time playing with your kids.',
];

/* ------------------------------------------------------------ empty states */

export const EMPTY_STATES = {
  workouts: 'Muscles currently awaiting instructions.',
  habits: 'No Tiny Wins yet. Start with something almost too easy.',
  water: 'Nothing logged yet today. The day is young and so is your bottle.',
  walks: 'No movement logged yet. Five beats zero.',
  weight: 'No weigh-ins yet. Step on, write it down, move on.',
  fasts: 'No fasts recorded yet.',
  timeline: 'Nothing logged yet today.',
  electrolytes: 'No electrolytes logged today.',
};

export { pick as pickFromPool };
