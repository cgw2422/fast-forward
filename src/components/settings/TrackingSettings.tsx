'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroup, Toggle } from './Controls';
import { useToast } from '@/components/ui/Toast';

type Module = { module: string; label: string; group: string; enabled: boolean };

export function TrackingSettings({ modules }: { modules: Module[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [state, setState] = useState(modules);

  async function toggle(module: string, enabled: boolean) {
    const previous = state;
    setState(state.map((m) => (m.module === module ? { ...m, enabled } : m)));

    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'modules', modules: [{ module, enabled }] }),
    });

    if (!response.ok) {
      setState(previous);
      toast('Could not save', 'error');
      return;
    }
    router.refresh();
  }

  const groups = Array.from(new Set(state.map((m) => m.group)));

  return (
    <div className="animate-fade-up pb-4">
      {groups.map((group) => (
        <SettingsGroup key={group} title={group}>
          {state
            .filter((m) => m.group === group)
            .map((m) => (
              <Toggle
                key={m.module}
                label={m.label}
                checked={m.enabled}
                onChange={(v) => toggle(m.module, v)}
              />
            ))}
        </SettingsGroup>
      ))}
      <p className="mt-4 px-1 text-[11px] leading-relaxed text-slate">
        Turning a module off hides it from the dashboard and stops its reminders. Nothing you&apos;ve already logged
        is deleted.
      </p>
    </div>
  );
}
