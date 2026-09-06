import 'server-only';
import { prisma } from './prisma';
import { type SessionUser } from './auth';
import { requireOwnerUser } from './authz';
import type { TrackingModule, UserPreference } from '@prisma/client';

export const DEFAULT_MODULES: { module: TrackingModule; enabled: boolean; label: string; group: string }[] = [
  { module: 'FASTING', enabled: true, label: 'Fasting', group: 'Core' },
  { module: 'WATER', enabled: true, label: 'Water', group: 'Core' },
  { module: 'ELECTROLYTES', enabled: true, label: 'Electrolytes', group: 'Core' },
  { module: 'WEIGHT', enabled: true, label: 'Weight', group: 'Core' },
  { module: 'WALKING', enabled: true, label: 'Walking', group: 'Core' },
  { module: 'STEPS', enabled: true, label: 'Steps', group: 'Core' },
  { module: 'WORKOUTS', enabled: true, label: 'Workouts', group: 'Core' },
  { module: 'POP_PACT', enabled: true, label: 'Pop Pact', group: 'Core' },
  { module: 'HABITS', enabled: true, label: 'Tiny Wins', group: 'Core' },
  { module: 'DAILY_CHECKIN', enabled: true, label: 'Daily Check-In', group: 'Core' },
  { module: 'MEASUREMENTS', enabled: false, label: 'Measurements', group: 'Optional' },
  { module: 'CALORIES', enabled: false, label: 'Calories', group: 'Optional' },
  { module: 'SLEEP', enabled: false, label: 'Sleep', group: 'Optional' },
  { module: 'BLOOD_PRESSURE', enabled: false, label: 'Blood Pressure', group: 'Optional' },
  { module: 'BLOOD_GLUCOSE', enabled: false, label: 'Blood Glucose', group: 'Optional' },
  { module: 'KETONES', enabled: false, label: 'Ketones', group: 'Optional' },
];

export type AppContext = {
  user: SessionUser;
  prefs: UserPreference;
  modules: Set<TrackingModule>;
  timezone: string;
};

/**
 * Every owner page and every health mutation starts here. It requires an OWNER
 * account, which is what makes viewer accounts read-only across the whole API
 * without each route repeating the check. Family-facing reads use
 * `requireViewAccess` in authz.ts instead.
 *
 * Creates preference + module rows lazily so a user created by any path
 * (signup, seed, invite) is always whole.
 */
export async function getContext(): Promise<AppContext> {
  const user = await requireOwnerUser();

  let prefs = await prisma.userPreference.findUnique({ where: { userId: user.id } });
  if (!prefs) {
    prefs = await prisma.userPreference.create({ data: { userId: user.id } });
  }

  let settings = await prisma.moduleSetting.findMany({ where: { userId: user.id } });
  if (settings.length === 0) {
    await prisma.moduleSetting.createMany({
      data: DEFAULT_MODULES.map((m, i) => ({
        userId: user.id,
        module: m.module,
        enabled: m.enabled,
        sortOrder: i,
      })),
      skipDuplicates: true,
    });
    settings = await prisma.moduleSetting.findMany({ where: { userId: user.id } });
  }

  return {
    user,
    prefs,
    timezone: user.timezone,
    modules: new Set(settings.filter((s) => s.enabled).map((s) => s.module)),
  };
}

export function moduleOn(ctx: AppContext, module: TrackingModule): boolean {
  return ctx.modules.has(module);
}
