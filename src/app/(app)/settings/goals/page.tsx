import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { GoalSettings } from '@/components/settings/GoalSettings';
import { mlToDisplay, kgToDisplay } from '@/lib/units';

export const dynamic = 'force-dynamic';

export default async function GoalSettingsPage() {
  const ctx = await getContext();
  return (
    <>
      <PageHeader title="Goals & Fasting" backHref="/more" />
      <GoalSettings
        volumeUnit={ctx.prefs.volumeUnit}
        weightUnit={ctx.prefs.weightUnit}
        dailyWater={Math.round(mlToDisplay(ctx.prefs.dailyWaterMl, ctx.prefs.volumeUnit))}
        dailyWalkMinutes={ctx.prefs.dailyWalkMinutes}
        tinyWalkMinutes={ctx.prefs.tinyWalkMinutes}
        dailyStepGoal={ctx.prefs.dailyStepGoal}
        defaultFastHours={ctx.prefs.defaultFastHours}
        goalWeight={
          ctx.prefs.goalWeightKg !== null
            ? Number(kgToDisplay(ctx.prefs.goalWeightKg, ctx.prefs.weightUnit).toFixed(1))
            : null
        }
        weightTrendDays={ctx.prefs.weightTrendDays}
        weightComparePeriodDays={ctx.prefs.weightComparePeriodDays}
        safetyNoticeHours={ctx.prefs.safetyNoticeHours}
      />
    </>
  );
}
