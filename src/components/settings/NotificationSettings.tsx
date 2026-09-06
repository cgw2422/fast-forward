'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SettingsGroup, Toggle, SelectRow, SegmentedRow, Row, TimeRangeRow, TimeRow } from './Controls';
import { useToast } from '@/components/ui/Toast';
import { enablePush, disablePush, inspectPushSupport, type PushSupport } from '@/lib/push-client';
import { NAG_LEVELS, PERSONALITIES, waterReminderBody, type NagLevel, type Personality } from '@/lib/copy';

type Settings = {
  enabled: boolean;
  nagLevel: number;
  personality: string;
  quietStart: string;
  quietEnd: string;
  waterEnabled: boolean;
  waterIntervalMinutes: number;
  waterWindowStart: string;
  waterWindowEnd: string;
  waterIdleMinutes: number;
  waterStopAfterGoal: boolean;
  popEnabled: boolean;
  popTime: string;
  moveEnabled: boolean;
  moveTime: string;
  fastMilestonesEnabled: boolean;
  habitStackEnabled: boolean;
  familyMessagesEnabled: boolean;
  eveningCheckEnabled: boolean;
  eveningCheckTime: string;
};

const CATEGORIES = ['Water', 'Pop', 'Move', 'All'] as const;

export function NotificationSettings({
  initial,
  deviceCount,
  vapidPublicKey,
  firstName,
}: {
  initial: Settings;
  deviceCount: number;
  vapidPublicKey: string;
  firstName: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [settings, setSettings] = useState(initial);
  const [support, setSupport] = useState<PushSupport | null>(null);
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('Water');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setSupport(inspectPushSupport());
  }, []);

  async function patch(changes: Partial<Settings>) {
    const next = { ...settings, ...changes };
    setSettings(next);
    const response = await fetch('/api/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ section: 'notifications', ...changes }),
    });
    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      toast(data.error ?? 'Could not save', 'error');
      setSettings(settings);
    }
  }

  async function turnOnReminders() {
    setBusy(true);
    const result = await enablePush(vapidPublicKey);
    setBusy(false);
    if (!result.ok) {
      toast(result.error ?? 'Could not enable', 'error');
      return;
    }
    setSettings({ ...settings, enabled: true });
    toast('Reminders enabled ⏩');
    router.refresh();
  }

  async function turnOff() {
    setBusy(true);
    await disablePush();
    await patch({ enabled: false });
    setBusy(false);
    toast('Reminders off', 'info');
    router.refresh();
  }

  async function sendTest() {
    setBusy(true);
    const response = await fetch('/api/push/test', { method: 'POST' });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    toast(response.ok ? 'Test sent — check your device' : (data.error ?? 'Could not send'), response.ok ? 'success' : 'error');
  }

  const previewBody = waterReminderBody(
    settings.personality as Personality,
    Math.min(5, Math.max(1, settings.nagLevel)) as NagLevel,
    7,
    firstName
  );

  const needsInstall = support?.requiresInstall ?? false;
  const canEnable = Boolean(support?.supported) && !needsInstall && vapidPublicKey.length > 0;

  return (
    <div className="animate-fade-up pb-4">
      {/* master switch */}
      <SettingsGroup title="Reminders">
        {settings.enabled && deviceCount > 0 ? (
          <>
            <Toggle
              label="Enable Notifications"
              hint={`${deviceCount} device${deviceCount === 1 ? '' : 's'} registered`}
              checked
              onChange={() => void turnOff()}
            />
            <Row>
              <button onClick={sendTest} disabled={busy} className="ff-btn-secondary w-full py-2.5 text-xs">
                Send a test notification
              </button>
            </Row>
          </>
        ) : (
          <div className="px-4 py-4">
            <p className="text-sm font-semibold text-cream">Enable Reminders</p>
            <p className="mt-1 text-[12px] leading-relaxed text-slate">
              {needsInstall
                ? 'On iPhone, add Fast Forward to your Home Screen first (Share → Add to Home Screen), then come back here. Safari can only deliver notifications to an installed app.'
                : !vapidPublicKey
                  ? 'Push is not configured on the server yet — VAPID keys are missing.'
                  : 'Water, movement, Pop Pact and daily check reminders, delivered even when the app is closed.'}
            </p>
            <button
              onClick={turnOnReminders}
              disabled={busy || !canEnable}
              className="ff-btn-primary mt-3 w-full py-3"
            >
              Enable Reminders
            </button>
          </div>
        )}
      </SettingsGroup>

      {/* category filter — mirrors the concept art */}
      <div className="mt-5 flex gap-1 rounded-xl bg-surface p-1">
        {CATEGORIES.map((c) => (
          <button
            key={c}
            onClick={() => setCategory(c)}
            className={`flex-1 rounded-lg py-2 text-xs font-bold transition ${
              category === c ? 'bg-lime text-midnight' : 'text-slate'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {category === 'Water' || category === 'All' ? (
        <SettingsGroup title="Water Reminders">
          <Toggle
            label="Water Reminders"
            checked={settings.waterEnabled}
            onChange={(v) => patch({ waterEnabled: v })}
          />
          <SelectRow
            label="Remind every"
            value={String(settings.waterIntervalMinutes)}
            options={[30, 45, 60, 90, 120, 180].map((m) => ({ value: String(m), label: `${m} minutes` }))}
            onChange={(v) => patch({ waterIntervalMinutes: Number(v) })}
          />
          <TimeRangeRow
            label="Between"
            start={settings.waterWindowStart}
            end={settings.waterWindowEnd}
            onStartChange={(v) => patch({ waterWindowStart: v })}
            onEndChange={(v) => patch({ waterWindowEnd: v })}
          />
          <SelectRow
            label="Only if no water logged"
            hint="Reminders count from your last drink, not the clock."
            value={String(settings.waterIdleMinutes)}
            options={[0, 30, 45, 60, 90, 120].map((m) => ({
              value: String(m),
              label: m === 0 ? 'Always' : `${m} min`,
            }))}
            onChange={(v) => patch({ waterIdleMinutes: Number(v) })}
          />
          <Toggle
            label="Stop after daily goal"
            hint="No nagging once you've hit your number."
            checked={settings.waterStopAfterGoal}
            onChange={(v) => patch({ waterStopAfterGoal: v })}
          />
        </SettingsGroup>
      ) : null}

      {category === 'Pop' || category === 'All' ? (
        <SettingsGroup title="Pop Pact">
          <Toggle label="Daily streak reminder" checked={settings.popEnabled} onChange={(v) => patch({ popEnabled: v })} />
          <TimeRow label="Time" value={settings.popTime} onChange={(v) => patch({ popTime: v })} />
        </SettingsGroup>
      ) : null}

      {category === 'Move' || category === 'All' ? (
        <SettingsGroup title="Movement">
          <Toggle
            label="Movement nudge"
            hint="Only if you haven't hit your walking goal."
            checked={settings.moveEnabled}
            onChange={(v) => patch({ moveEnabled: v })}
          />
          <TimeRow label="Time" value={settings.moveTime} onChange={(v) => patch({ moveTime: v })} />
        </SettingsGroup>
      ) : null}

      {category === 'All' ? (
        <>
          <SettingsGroup title="Fasting & Stacks">
            <Toggle
              label="Fast milestones"
              hint="Informational only — never encouragement to keep going."
              checked={settings.fastMilestonesEnabled}
              onChange={(v) => patch({ fastMilestonesEnabled: v })}
            />
            <Toggle
              label="Habit stack reminders"
              hint="&ldquo;You did Part 1. Finish the stack.&rdquo;"
              checked={settings.habitStackEnabled}
              onChange={(v) => patch({ habitStackEnabled: v })}
            />
          </SettingsGroup>

          <SettingsGroup title="Family">
            <Toggle
              label="Family messages"
              hint="Sent as soon as they arrive, including during quiet hours."
              checked={settings.familyMessagesEnabled}
              onChange={(v) => patch({ familyMessagesEnabled: v })}
            />
          </SettingsGroup>

          <SettingsGroup title="Evening Daily Check">
            <Toggle
              label="Daily recap"
              checked={settings.eveningCheckEnabled}
              onChange={(v) => patch({ eveningCheckEnabled: v })}
            />
            <TimeRow
              label="Time"
              value={settings.eveningCheckTime}
              onChange={(v) => patch({ eveningCheckTime: v })}
            />
          </SettingsGroup>

          <SettingsGroup title="Quiet Hours">
            <TimeRangeRow
              label="No notifications between"
              hint="Fast milestones are recorded either way — they just stay silent."
              start={settings.quietStart}
              end={settings.quietEnd}
              onStartChange={(v) => patch({ quietStart: v })}
              onEndChange={(v) => patch({ quietEnd: v })}
            />
          </SettingsGroup>
        </>
      ) : null}

      {/* personality */}
      <SettingsGroup title="Notification Personality">
        <SelectRow
          label="Style"
          hint={PERSONALITIES[settings.personality as Personality]?.blurb}
          value={settings.personality}
          options={Object.entries(PERSONALITIES).map(([value, meta]) => ({ value, label: meta.label }))}
          onChange={(v) => patch({ personality: v })}
        />
        <SegmentedRow
          label={`Nag Level — ${NAG_LEVELS[settings.nagLevel as NagLevel]?.label ?? ''}`}
          value={String(settings.nagLevel)}
          options={[1, 2, 3, 4, 5].map((n) => ({ value: String(n), label: String(n) }))}
          onChange={(v) => patch({ nagLevel: Number(v) })}
        />
        <div className="px-4 pb-4 pt-1">
          <p className="mb-2 text-[11px] text-slate">
            {NAG_LEVELS[settings.nagLevel as NagLevel]?.blurb}
          </p>
          <div className="flex items-start gap-3 rounded-xl bg-midnight p-3">
            <span className="text-lg">💧</span>
            <div className="min-w-0">
              <div className="text-xs font-bold text-cream">Hydration Station</div>
              <div className="mt-0.5 text-xs text-slate">{previewBody}</div>
            </div>
          </div>
        </div>
      </SettingsGroup>

      {support && !support.supported ? (
        <p className="mt-4 px-1 text-xs text-slate">
          This browser doesn&apos;t support push notifications. Everything else in the app still works.
        </p>
      ) : null}
    </div>
  );
}
