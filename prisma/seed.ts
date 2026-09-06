/**
 * Creates the first account with sensible defaults and the Pop Pact already
 * started. Safe to run repeatedly — it updates rather than duplicates.
 *
 *   SEED_EMAIL=you@example.com SEED_PASSWORD=... npm run db:seed
 */
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const POP_PACT_START = '2026-09-06';
const POP_PACT_REASON =
  'I made this promise to my son so I can be healthier, have more energy, and actually play with him.';

const POP_PACT_REASONS = [
  'Play with my son without getting worn out.',
  'Be active with my kids as they grow up.',
  'Have more energy.',
  'Keep the promise I made.',
  'Become someone who follows through.',
];

const WATER_PRESETS = [
  { label: '8 oz', oz: 8, icon: '💧' },
  { label: '16 oz', oz: 16, icon: '💧' },
  { label: 'Bottle (24 oz)', oz: 24, icon: '🧴' },
  { label: "Big Honkin' Cup (44 oz)", oz: 44, icon: '🥤' },
];

const FAST_PRESETS = [
  { label: '16:8', hours: 16 },
  { label: '18:6', hours: 18 },
  { label: '20:4', hours: 20 },
  { label: 'OMAD', hours: 23 },
  { label: '24 hours', hours: 24 },
  { label: '36 hours', hours: 36 },
  { label: '48 hours', hours: 48 },
];

const HABITS = [
  {
    name: 'No pop',
    identityStatement: 'I keep promises to myself and my family.',
    cue: 'When I open the fridge.',
    goalLabel: 'Keep the promise',
    tinyGoalLabel: 'Drink water instead',
  },
  {
    name: 'Log morning weight',
    identityStatement: 'I am someone who tells himself the truth.',
    cue: 'After I wake up.',
    stack: 'After I get out of bed → step on the scale → log it.',
    goalLabel: 'Start the day with truth',
    tinyGoalLabel: 'Step on the scale',
  },
  {
    name: 'Drink first water',
    identityStatement: 'I take care of the basics before anything else.',
    cue: 'After I weigh myself.',
    stack: 'After I weigh myself → drink 32 oz of water.',
    goalLabel: '32 oz',
    tinyGoalLabel: 'One glass',
  },
  {
    name: 'Take a 30-minute walk',
    identityStatement: 'I am a dad who has the energy to get outside and play with his kids.',
    cue: 'When I get home from work.',
    stack: 'After I change clothes → put on my walking shoes → walk.',
    goalLabel: '30 minutes',
    tinyGoalLabel: '5 minutes',
  },
  {
    name: 'Workout',
    identityStatement: 'I build a body that can keep up.',
    cue: 'After dinner is cleaned up.',
    goalLabel: 'Full session',
    tinyGoalLabel: 'One set of anything',
  },
];

const EXERCISES = [
  { name: 'Bench Press', category: 'Push', tracksSets: true, tracksReps: true, tracksWeight: true },
  { name: 'Squat', category: 'Legs', tracksSets: true, tracksReps: true, tracksWeight: true },
  { name: 'Row', category: 'Pull', tracksSets: true, tracksReps: true, tracksWeight: true },
  {
    name: 'Plank',
    category: 'Core',
    tracksSets: true,
    tracksReps: false,
    tracksWeight: false,
    tracksDuration: true,
  },
  {
    name: 'Walking',
    category: 'Cardio',
    tracksSets: false,
    tracksReps: false,
    tracksWeight: false,
    tracksDuration: true,
    tracksDistance: true,
  },
];

const ML_PER_OZ = 29.5735295625;

async function main() {
  const email = (process.env.SEED_EMAIL ?? 'you@example.com').toLowerCase();
  const password = process.env.SEED_PASSWORD ?? 'changeme123';
  const name = process.env.SEED_NAME ?? 'Friend';
  const timezone = process.env.SEED_TIMEZONE ?? 'America/Chicago';

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, timezone },
    create: { email, name, timezone, passwordHash: await bcrypt.hash(password, 12) },
  });
  console.log(`✔ user ${email}`);

  await prisma.userPreference.upsert({ where: { userId: user.id }, update: {}, create: { userId: user.id } });
  await prisma.notificationPreference.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  const modules = [
    'FASTING', 'WATER', 'ELECTROLYTES', 'WEIGHT', 'WALKING', 'STEPS', 'WORKOUTS',
    'POP_PACT', 'HABITS', 'DAILY_CHECKIN',
  ] as const;
  const optional = ['MEASUREMENTS', 'CALORIES', 'SLEEP', 'BLOOD_PRESSURE', 'BLOOD_GLUCOSE', 'KETONES'] as const;

  await prisma.moduleSetting.createMany({
    data: [
      ...modules.map((module, i) => ({ userId: user.id, module, enabled: true, sortOrder: i })),
      ...optional.map((module, i) => ({
        userId: user.id,
        module,
        enabled: false,
        sortOrder: modules.length + i,
      })),
    ],
    skipDuplicates: true,
  });
  console.log('✔ tracking modules');

  if ((await prisma.waterPreset.count({ where: { userId: user.id } })) === 0) {
    await prisma.waterPreset.createMany({
      data: WATER_PRESETS.map((p, i) => ({
        userId: user.id,
        label: p.label,
        volumeMl: p.oz * ML_PER_OZ,
        icon: p.icon,
        sortOrder: i,
      })),
    });
    console.log('✔ water containers');
  }

  if ((await prisma.fastPreset.count({ where: { userId: user.id } })) === 0) {
    await prisma.fastPreset.createMany({
      data: FAST_PRESETS.map((p, i) => ({ userId: user.id, ...p, sortOrder: i, isSystem: true })),
    });
    console.log('✔ fasting presets');
  }

  if ((await prisma.habit.count({ where: { userId: user.id } })) === 0) {
    for (const [index, habit] of HABITS.entries()) {
      await prisma.habit.create({ data: { userId: user.id, sortOrder: index, ...habit } });
    }
    console.log('✔ tiny wins');
  }

  await prisma.exercise.createMany({
    data: EXERCISES.map((e) => ({ userId: user.id, ...e })),
    skipDuplicates: true,
  });

  if ((await prisma.habitStackRule.count({ where: { userId: user.id } })) === 0) {
    await prisma.habitStackRule.create({
      data: {
        userId: user.id,
        name: 'Weigh in → drink water',
        trigger: 'WEIGHT_LOGGED',
        target: 'WATER_LOGGED',
        withinMinutes: 30,
        message: 'You did Part 1. Finish the stack: drink your water.',
      },
    });
    console.log('✔ habit stack rule');
  }

  const start = new Date(`${POP_PACT_START}T00:00:00.000Z`);
  const pact = await prisma.popPact.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id, startDate: start, streakStart: start, reason: POP_PACT_REASON },
  });
  if ((await prisma.popPactReason.count({ where: { pactId: pact.id } })) === 0) {
    await prisma.popPactReason.createMany({
      data: POP_PACT_REASONS.map((text, i) => ({ pactId: pact.id, text, sortOrder: i })),
    });
  }
  console.log(`✔ pop pact — day 1 is ${POP_PACT_START}`);
  console.log('\nSeed complete. Sign in and get moving. ⏩');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
