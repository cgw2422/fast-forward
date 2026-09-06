import 'server-only';
import { prisma } from './prisma';
import { DEFAULT_MODULES } from './context';
import { displayToMl } from './units';

export const DEFAULT_WATER_PRESETS = [
  { label: '8 oz', oz: 8, icon: '💧' },
  { label: '16 oz', oz: 16, icon: '💧' },
  { label: 'Bottle (24 oz)', oz: 24, icon: '🧴' },
  { label: "Big Honkin' Cup (44 oz)", oz: 44, icon: '🥤' },
];

export const DEFAULT_FAST_PRESETS = [
  { label: '16:8', hours: 16 },
  { label: '18:6', hours: 18 },
  { label: '20:4', hours: 20 },
  { label: 'OMAD', hours: 23 },
  { label: '24 hours', hours: 24 },
  { label: '36 hours', hours: 36 },
  { label: '48 hours', hours: 48 },
];

export const DEFAULT_HABITS = [
  {
    name: 'No pop',
    identityStatement: 'I keep promises to myself and my family.',
    cue: 'When I open the fridge.',
    goalLabel: 'Keep the promise',
    tinyGoalLabel: 'Drink water instead',
    sortOrder: 0,
  },
  {
    name: 'Log morning weight',
    identityStatement: 'I am someone who tells himself the truth.',
    cue: 'After I wake up.',
    stack: 'After I get out of bed → step on the scale → log it.',
    goalLabel: 'Start the day with truth',
    tinyGoalLabel: 'Step on the scale',
    sortOrder: 1,
  },
  {
    name: 'Drink first water',
    identityStatement: 'I take care of the basics before anything else.',
    cue: 'After I weigh myself.',
    stack: 'After I weigh myself → drink 32 oz of water.',
    goalLabel: '32 oz',
    tinyGoalLabel: 'One glass',
    sortOrder: 2,
  },
  {
    name: 'Take a 30-minute walk',
    identityStatement: 'I am a dad who has the energy to get outside and play with his kids.',
    cue: 'When I get home from work.',
    stack: 'After I change clothes → put on my walking shoes → walk.',
    goalLabel: '30 minutes',
    tinyGoalLabel: '5 minutes',
    sortOrder: 3,
  },
  {
    name: 'Workout',
    identityStatement: 'I build a body that can keep up.',
    cue: 'After dinner is cleaned up.',
    goalLabel: 'Full session',
    tinyGoalLabel: 'One set of anything',
    sortOrder: 4,
  },
];

/**
 * Everything a brand-new account needs to be immediately usable. Idempotent so
 * it can be re-run safely from the seed script.
 */
export async function seedNewUserDefaults(userId: string) {
  await prisma.userPreference.upsert({ where: { userId }, update: {}, create: { userId } });
  await prisma.notificationPreference.upsert({ where: { userId }, update: {}, create: { userId } });

  await prisma.moduleSetting.createMany({
    data: DEFAULT_MODULES.map((m, i) => ({ userId, module: m.module, enabled: m.enabled, sortOrder: i })),
    skipDuplicates: true,
  });

  if ((await prisma.waterPreset.count({ where: { userId } })) === 0) {
    await prisma.waterPreset.createMany({
      data: DEFAULT_WATER_PRESETS.map((p, i) => ({
        userId,
        label: p.label,
        volumeMl: displayToMl(p.oz, 'OZ'),
        icon: p.icon,
        sortOrder: i,
      })),
    });
  }

  if ((await prisma.fastPreset.count({ where: { userId } })) === 0) {
    await prisma.fastPreset.createMany({
      data: DEFAULT_FAST_PRESETS.map((p, i) => ({
        userId,
        label: p.label,
        hours: p.hours,
        sortOrder: i,
        isSystem: true,
      })),
    });
  }

  if ((await prisma.habit.count({ where: { userId } })) === 0) {
    for (const habit of DEFAULT_HABITS) {
      await prisma.habit.create({ data: { userId, ...habit } });
    }
  }

  if ((await prisma.habitStackRule.count({ where: { userId } })) === 0) {
    await prisma.habitStackRule.create({
      data: {
        userId,
        name: 'Weigh in → drink water',
        trigger: 'WEIGHT_LOGGED',
        target: 'WATER_LOGGED',
        withinMinutes: 30,
        message: 'You did Part 1. Finish the stack: drink your water.',
      },
    });
  }

  if ((await prisma.exercise.count({ where: { userId } })) === 0) {
    await prisma.exercise.createMany({
      data: [
        { userId, name: 'Bench Press', category: 'Push', tracksSets: true, tracksReps: true, tracksWeight: true },
        { userId, name: 'Squat', category: 'Legs', tracksSets: true, tracksReps: true, tracksWeight: true },
        { userId, name: 'Row', category: 'Pull', tracksSets: true, tracksReps: true, tracksWeight: true },
        {
          userId,
          name: 'Plank',
          category: 'Core',
          tracksSets: true,
          tracksReps: false,
          tracksWeight: false,
          tracksDuration: true,
        },
        {
          userId,
          name: 'Walking',
          category: 'Cardio',
          tracksSets: false,
          tracksReps: false,
          tracksWeight: false,
          tracksDuration: true,
          tracksDistance: true,
        },
      ],
      skipDuplicates: true,
    });
  }
}
