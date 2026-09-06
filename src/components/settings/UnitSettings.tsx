'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroup, SegmentedRow, Toggle } from './Controls';
import { useToast } from '@/components/ui/Toast';

export function UnitSettings({
  weightUnit,
  volumeUnit,
  distanceUnit,
  use24Hour,
}: {
  weightUnit: string;
  volumeUnit: string;
  distanceUnit: string;
  use24Hour: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState({ weightUnit, volumeUnit, distanceUnit, use24Hour });

  async function patch(changes: Partial<typeof state>) {
    const previous = state;
    setState({ ...state, ...changes });
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'preferences', ...changes }),
    });
    if (!response.ok) {
      setState(previous);
      toast('Could not save', 'error');
      return;
    }
    router.refresh();
  }

  return (
    <div className="animate-fade-up pb-4">
      <SettingsGroup title="Units">
        <SegmentedRow
          label="Weight"
          value={state.weightUnit}
          options={[
            { value: 'LB', label: 'lb' },
            { value: 'KG', label: 'kg' },
          ]}
          onChange={(v) => patch({ weightUnit: v })}
        />
        <SegmentedRow
          label="Volume"
          value={state.volumeUnit}
          options={[
            { value: 'OZ', label: 'oz' },
            { value: 'ML', label: 'mL' },
            { value: 'L', label: 'L' },
          ]}
          onChange={(v) => patch({ volumeUnit: v })}
        />
        <SegmentedRow
          label="Distance"
          value={state.distanceUnit}
          options={[
            { value: 'MI', label: 'miles' },
            { value: 'KM', label: 'km' },
          ]}
          onChange={(v) => patch({ distanceUnit: v })}
        />
      </SettingsGroup>

      <SettingsGroup title="Time">
        <Toggle
          label="24-hour time"
          hint={state.use24Hour ? '18:42' : '6:42 PM'}
          checked={state.use24Hour}
          onChange={(v) => patch({ use24Hour: v })}
        />
      </SettingsGroup>

      <SettingsGroup title="Appearance">
        <div className="px-4 py-4">
          <div className="flex items-center gap-3">
            <span className="h-9 w-9 rounded-xl bg-midnight ring-2 ring-lime" />
            <div>
              <div className="text-sm font-semibold text-cream">Midnight</div>
              <div className="text-[11px] text-slate">Dark mode is the signature look. Light mode isn&apos;t coming.</div>
            </div>
          </div>
        </div>
      </SettingsGroup>

      <p className="mt-4 px-1 text-[11px] leading-relaxed text-slate">
        Changing units converts everything already recorded — your history is stored in a neutral format, so nothing
        is lost or re-typed.
      </p>
    </div>
  );
}
