'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroup, Row } from './Controls';
import { useToast } from '@/components/ui/Toast';

/** A short list covering the common US zones plus whatever the device reports. */
function timezoneOptions(current: string): string[] {
  const base = [
    'America/New_York',
    'America/Chicago',
    'America/Denver',
    'America/Phoenix',
    'America/Los_Angeles',
    'America/Anchorage',
    'Pacific/Honolulu',
    'UTC',
  ];
  const detected = typeof Intl !== 'undefined' ? Intl.DateTimeFormat().resolvedOptions().timeZone : null;
  return Array.from(new Set([current, detected, ...base].filter(Boolean) as string[]));
}

export function ProfileSettings({
  name,
  email,
  timezone,
}: {
  name: string;
  email: string;
  timezone: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [draftName, setDraftName] = useState(name);
  const [draftTz, setDraftTz] = useState(timezone);
  const [busy, setBusy] = useState(false);

  async function save() {
    setBusy(true);
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'profile', name: draftName.trim(), timezone: draftTz }),
    });
    setBusy(false);
    if (response.ok) {
      toast('Profile saved');
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  return (
    <div className="animate-fade-up pb-4">
      <SettingsGroup title="You">
        <Row>
          <div className="flex-1 text-sm font-semibold text-cream">Name</div>
          <input
            className="w-40 rounded-lg border border-white/10 bg-midnight px-3 py-2 text-right text-sm font-semibold text-cream outline-none focus:border-lime/60"
            value={draftName}
            aria-label="Name"
            onChange={(e) => setDraftName(e.target.value)}
          />
        </Row>
        <Row>
          <div className="flex-1 text-sm font-semibold text-cream">Email</div>
          <span className="truncate text-sm text-slate">{email}</span>
        </Row>
        <Row>
          <div className="flex-1 text-sm font-semibold text-cream">Time zone</div>
          <select
            value={draftTz}
            aria-label="Time zone"
            onChange={(e) => setDraftTz(e.target.value)}
            className="max-w-[10rem] rounded-lg border border-white/10 bg-midnight px-3 py-2 text-sm font-semibold text-cream outline-none focus:border-lime/60"
          >
            {timezoneOptions(timezone).map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
        </Row>
      </SettingsGroup>

      <p className="mt-3 px-1 text-[11px] leading-relaxed text-slate">
        Your time zone decides when days roll over and when reminder windows open — worth getting right if you travel.
      </p>

      <button disabled={busy} onClick={save} className="ff-btn-primary mt-4 w-full py-3.5">
        Save
      </button>
    </div>
  );
}
