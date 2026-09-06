'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroup, InputRow, SelectRow } from './Controls';
import { useToast } from '@/components/ui/Toast';
import { volumeLabel, weightLabel, type VolumeUnit, type WeightUnit } from '@/lib/units';

type Props = {
  volumeUnit: VolumeUnit;
  weightUnit: WeightUnit;
  dailyWater: number;
  dailyWalkMinutes: number;
  tinyWalkMinutes: number;
  dailyStepGoal: number;
  defaultFastHours: number | null;
  goalWeight: number | null;
  weightTrendDays: number;
  weightComparePeriodDays: number;
  safetyNoticeHours: number;
};

export function GoalSettings(props: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    dailyWater: String(props.dailyWater),
    dailyWalkMinutes: String(props.dailyWalkMinutes),
    tinyWalkMinutes: String(props.tinyWalkMinutes),
    dailyStepGoal: String(props.dailyStepGoal),
    defaultFastHours: props.defaultFastHours !== null ? String(props.defaultFastHours) : '',
    goalWeight: props.goalWeight !== null ? String(props.goalWeight) : '',
    weightTrendDays: String(props.weightTrendDays),
    weightComparePeriodDays: String(props.weightComparePeriodDays),
    safetyNoticeHours: String(props.safetyNoticeHours),
  });
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        section: 'preferences',
        dailyWater: Number(form.dailyWater) || undefined,
        dailyWalkMinutes: Number(form.dailyWalkMinutes) || undefined,
        tinyWalkMinutes: Number(form.tinyWalkMinutes) || undefined,
        dailyStepGoal: Number(form.dailyStepGoal) || 0,
        defaultFastHours: form.defaultFastHours ? Number(form.defaultFastHours) : null,
        goalWeight: form.goalWeight ? Number(form.goalWeight) : null,
        weightTrendDays: Number(form.weightTrendDays) || undefined,
        weightComparePeriodDays: Number(form.weightComparePeriodDays) || undefined,
        safetyNoticeHours: Number(form.safetyNoticeHours) || undefined,
      }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Goals saved');
      router.refresh();
    } else {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not save', 'error');
    }
  }

  const set = (key: keyof typeof form) => (value: string) => setForm({ ...form, [key]: value });

  return (
    <div className="animate-fade-up pb-4">
      <SettingsGroup title="Daily Goals">
        <InputRow
          label="Water"
          value={form.dailyWater}
          onChange={set('dailyWater')}
          type="number"
          suffix={volumeLabel(props.volumeUnit)}
        />
        <InputRow label="Walking" value={form.dailyWalkMinutes} onChange={set('dailyWalkMinutes')} type="number" suffix="min" />
        <InputRow
          label="Tiny Win walk"
          hint="The minimum version that still counts."
          value={form.tinyWalkMinutes}
          onChange={set('tinyWalkMinutes')}
          type="number"
          suffix="min"
        />
        <InputRow label="Steps" value={form.dailyStepGoal} onChange={set('dailyStepGoal')} type="number" />
      </SettingsGroup>

      <SettingsGroup title="Weight">
        <InputRow
          label="Goal weight"
          value={form.goalWeight}
          onChange={set('goalWeight')}
          type="number"
          placeholder="Optional"
          suffix={weightLabel(props.weightUnit)}
        />
        <SelectRow
          label="Trend smoothing"
          hint="Higher smooths out daily swings more."
          value={form.weightTrendDays}
          options={[3, 5, 7, 10, 14, 21].map((d) => ({ value: String(d), label: `${d} days` }))}
          onChange={set('weightTrendDays')}
        />
        <SelectRow
          label="Compare against"
          value={form.weightComparePeriodDays}
          options={[7, 14, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} days ago` }))}
          onChange={set('weightComparePeriodDays')}
        />
      </SettingsGroup>

      <SettingsGroup title="Fasting">
        <InputRow
          label="Default target"
          hint="Pre-selected when you start a fast. Leave blank for none."
          value={form.defaultFastHours}
          onChange={set('defaultFastHours')}
          type="number"
          placeholder="None"
          suffix="h"
        />
        <SelectRow
          label="Show health notice after"
          hint="When a running fast starts showing the medical-supervision notice."
          value={form.safetyNoticeHours}
          options={[24, 36, 48, 72, 96].map((h) => ({ value: String(h), label: `${h} hours` }))}
          onChange={set('safetyNoticeHours')}
        />
      </SettingsGroup>

      <button disabled={busy} onClick={save} className="ff-btn-primary mt-4 w-full py-3.5">
        Save goals
      </button>
    </div>
  );
}
