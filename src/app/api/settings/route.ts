import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { handler, fail } from '@/lib/api';
import { displayToKg, displayToMl } from '@/lib/units';

const hhmm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use HH:MM');

const notificationSchema = z.object({
  section: z.literal('notifications'),
  enabled: z.boolean().optional(),
  nagLevel: z.number().int().min(1).max(5).optional(),
  personality: z.enum(['PROFESSIONAL', 'FRIENDLY', 'DAD_JOKES', 'UNHINGED']).optional(),
  quietStart: hhmm.optional(),
  quietEnd: hhmm.optional(),
  waterEnabled: z.boolean().optional(),
  waterIntervalMinutes: z.number().int().min(15).max(480).optional(),
  waterWindowStart: hhmm.optional(),
  waterWindowEnd: hhmm.optional(),
  waterIdleMinutes: z.number().int().min(0).max(480).optional(),
  waterStopAfterGoal: z.boolean().optional(),
  popEnabled: z.boolean().optional(),
  popTime: hhmm.optional(),
  moveEnabled: z.boolean().optional(),
  moveTime: hhmm.optional(),
  fastMilestonesEnabled: z.boolean().optional(),
  habitStackEnabled: z.boolean().optional(),
  familyMessagesEnabled: z.boolean().optional(),
  eveningCheckEnabled: z.boolean().optional(),
  eveningCheckTime: hhmm.optional(),
});

const preferenceSchema = z.object({
  section: z.literal('preferences'),
  weightUnit: z.enum(['LB', 'KG']).optional(),
  volumeUnit: z.enum(['OZ', 'ML', 'L']).optional(),
  distanceUnit: z.enum(['MI', 'KM']).optional(),
  use24Hour: z.boolean().optional(),
  dailyWater: z.number().positive().optional(),
  dailyWalkMinutes: z.number().int().positive().max(1440).optional(),
  tinyWalkMinutes: z.number().int().positive().max(1440).optional(),
  dailyStepGoal: z.number().int().nonnegative().max(200000).optional(),
  defaultFastHours: z.number().positive().nullable().optional(),
  goalWeight: z.number().positive().nullable().optional(),
  weightTrendDays: z.number().int().min(1).max(60).optional(),
  weightComparePeriodDays: z.number().int().min(1).max(365).optional(),
  safetyNoticeHours: z.number().int().min(12).max(240).optional(),
});

const profileSchema = z.object({
  section: z.literal('profile'),
  name: z.string().min(1).max(80).optional(),
  timezone: z.string().min(1).max(80).optional(),
});

const modulesSchema = z.object({
  section: z.literal('modules'),
  modules: z.array(z.object({ module: z.string(), enabled: z.boolean() })),
});

const schema = z.discriminatedUnion('section', [
  notificationSchema,
  preferenceSchema,
  profileSchema,
  modulesSchema,
]);

export async function PATCH(request: Request) {
  const parsed = schema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const input = parsed.data;

    if (input.section === 'notifications') {
      const { section, ...fields } = input;
      void section;
      await prisma.notificationPreference.upsert({
        where: { userId: ctx.user.id },
        update: fields,
        create: { userId: ctx.user.id, ...fields },
      });
      return { ok: true };
    }

    if (input.section === 'preferences') {
      // Goals arrive in the user's display unit; store canonical.
      const volumeUnit = input.volumeUnit ?? ctx.prefs.volumeUnit;
      const weightUnit = input.weightUnit ?? ctx.prefs.weightUnit;

      await prisma.userPreference.update({
        where: { userId: ctx.user.id },
        data: {
          weightUnit: input.weightUnit ?? undefined,
          volumeUnit: input.volumeUnit ?? undefined,
          distanceUnit: input.distanceUnit ?? undefined,
          use24Hour: input.use24Hour ?? undefined,
          dailyWaterMl: input.dailyWater !== undefined ? displayToMl(input.dailyWater, volumeUnit) : undefined,
          dailyWalkMinutes: input.dailyWalkMinutes ?? undefined,
          tinyWalkMinutes: input.tinyWalkMinutes ?? undefined,
          dailyStepGoal: input.dailyStepGoal ?? undefined,
          defaultFastHours: input.defaultFastHours === undefined ? undefined : input.defaultFastHours,
          goalWeightKg:
            input.goalWeight === undefined
              ? undefined
              : input.goalWeight === null
                ? null
                : displayToKg(input.goalWeight, weightUnit),
          weightTrendDays: input.weightTrendDays ?? undefined,
          weightComparePeriodDays: input.weightComparePeriodDays ?? undefined,
          safetyNoticeHours: input.safetyNoticeHours ?? undefined,
        },
      });
      return { ok: true };
    }

    if (input.section === 'profile') {
      await prisma.user.update({
        where: { id: ctx.user.id },
        data: { name: input.name ?? undefined, timezone: input.timezone ?? undefined },
      });
      return { ok: true };
    }

    await prisma.$transaction(
      input.modules.map((m) =>
        prisma.moduleSetting.updateMany({
          where: { userId: ctx.user.id, module: m.module as never },
          data: { enabled: m.enabled },
        })
      )
    );
    return { ok: true };
  });
}
