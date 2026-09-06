'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { SettingsGroup, Toggle } from '@/components/settings/Controls';

type Member = {
  id: string;
  name: string;
  email: string;
  role: string;
  enabled: boolean;
  permissions: Record<string, boolean>;
};

type Invite = { id: string; name: string; role: string; code: string; expires: string };

const ROLE_LABEL: Record<string, string> = {
  ADULT_VIEWER: 'Adult Viewer',
  FAMILY_VIEWER: 'Family Viewer',
};

const ROLE_BLURB: Record<string, string> = {
  ADULT_VIEWER: 'Read only · Can view adult-shared photos',
  FAMILY_VIEWER: 'Read only · Adult/private photos hidden',
};

export function FamilySettings({
  members,
  invites,
  modules,
}: {
  members: Member[];
  invites: Invite[];
  modules: { key: string; label: string }[];
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'FAMILY_VIEWER' });
  const [editing, setEditing] = useState<Member | null>(null);
  const [confirmRemove, setConfirmRemove] = useState<Member | null>(null);
  const [newCode, setNewCode] = useState<string | null>(null);
  const [nameError, setNameError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const nameInput = useRef<HTMLInputElement>(null);

  async function post(body: Record<string, unknown>, success?: string) {
    setBusy(true);
    const response = await fetch('/api/family', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await response.json().catch(() => ({}));
    setBusy(false);
    if (!response.ok) {
      toast(data.error ?? 'Could not save', 'error');
      return null;
    }
    if (success) toast(success);
    router.refresh();
    return data;
  }

  async function createInvite() {
    if (!form.name.trim()) {
      // Show the error *at* the field and bring it back into view — the form is
      // taller than a phone screen, so a floating toast can refer to something
      // the user has scrolled past.
      setNameError('Who is this invite for?');
      nameInput.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
      nameInput.current?.focus({ preventScroll: true });
      return;
    }
    setNameError(null);
    const data = await post({
      action: 'invite',
      name: form.name.trim(),
      email: form.email || undefined,
      role: form.role,
    });
    if (data?.code) {
      setNewCode(data.code);
      setForm({ name: '', email: '', role: 'FAMILY_VIEWER' });
    }
  }

  const inviteLink = (code: string) =>
    typeof window === 'undefined' ? '' : `${window.location.origin}/signup?invite=${code}`;

  async function copyInvite(code: string) {
    const link = inviteLink(code);
    try {
      await navigator.clipboard.writeText(link);
      toast('Invite link copied');
    } catch {
      toast('Copy failed — long-press the code to select it', 'info');
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      {members.length === 0 && invites.length === 0 ? (
        <div className="ff-card py-8 text-center">
          <div className="text-3xl">👨‍👩‍👦</div>
          <p className="mx-auto mt-3 max-w-[17rem] text-sm text-slate">
            Nobody&apos;s watching yet. Invite the people you made promises to — they get a read-only view and a way
            to cheer you on.
          </p>
        </div>
      ) : null}

      {members.map((member) => {
        const shared = modules.filter((m) => member.permissions[m.key]).length;
        return (
          <div key={member.id} className="ff-card">
            <div className="flex items-start gap-3">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-midnight text-base font-bold text-lime">
                {member.name.slice(0, 1).toUpperCase()}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm font-bold text-cream">{member.name}</span>
                  {!member.enabled ? (
                    <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[9px] font-bold text-slate">
                      PAUSED
                    </span>
                  ) : null}
                </div>
                <p className="mt-0.5 text-xs font-semibold text-lime/85">{ROLE_LABEL[member.role] ?? member.role}</p>
                <p className="mt-0.5 text-[11px] text-slate">{ROLE_BLURB[member.role]}</p>
                <p className="mt-1 text-[11px] text-slate">
                  Sharing {shared} of {modules.length} modules
                </p>
              </div>
            </div>
            <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-3">
              <button onClick={() => setEditing(member)} className="ff-btn-secondary flex-1 py-2 text-xs">
                Configure
              </button>
              <button
                onClick={() => post({ action: 'set_enabled', relationshipId: member.id, enabled: !member.enabled })}
                className="ff-btn-secondary px-3 py-2 text-xs"
              >
                {member.enabled ? 'Pause' : 'Resume'}
              </button>
              <button onClick={() => setConfirmRemove(member)} className="ff-btn-danger px-3 py-2 text-xs">
                Remove
              </button>
            </div>
          </div>
        );
      })}

      {invites.length > 0 ? (
        <div className="ff-card">
          <div className="ff-label mb-3">Pending invites</div>
          <ul className="space-y-3">
            {invites.map((invite) => (
              <li key={invite.id}>
                <div className="flex items-center gap-2">
                  <span className="flex-1 text-sm font-bold text-cream">{invite.name}</span>
                  <span className="text-[11px] text-slate">expires {invite.expires}</span>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 select-all rounded-lg bg-midnight px-3 py-2 text-xs font-bold tracking-widest text-lime">
                    {invite.code}
                  </code>
                  <button onClick={() => copyInvite(invite.code)} className="ff-btn-secondary px-3 py-2 text-xs">
                    Copy link
                  </button>
                </div>
                <button
                  onClick={() => post({ action: 'revoke_invite', inviteId: invite.id }, 'Invite revoked')}
                  className="mt-1 text-[11px] font-bold text-slate hover:text-coral"
                >
                  Revoke
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <button onClick={() => setInviteOpen(true)} className="ff-btn-primary w-full py-3.5">
        + Invite family member
      </button>

      <p className="px-1 text-[11px] leading-relaxed text-slate">
        Family members can never change your data — not your fasts, water, weight, habits, goals, photos or settings.
        The only thing they can do is send you encouragement.
      </p>

      {/* ---------------------------------------------------------- invite */}
      <Sheet
        open={inviteOpen}
        onClose={() => {
          setInviteOpen(false);
          setNewCode(null);
          setNameError(null);
        }}
        title="Invite family member"
      >
        {newCode ? (
          <div className="space-y-4">
            <p className="text-sm text-slate">Send them this link. It works once and expires in 14 days.</p>
            <code className="block select-all break-all rounded-xl bg-midnight px-4 py-3 text-xs font-bold text-lime">
              {inviteLink(newCode)}
            </code>
            <button onClick={() => copyInvite(newCode)} className="ff-btn-primary w-full py-3">
              Copy link
            </button>
            <button
              onClick={() => {
                setNewCode(null);
                setInviteOpen(false);
              }}
              className="ff-btn-ghost w-full text-xs"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <div>
              <label htmlFor="invite-name" className="ff-label mb-1.5 block">
                Their name
              </label>
              <input
                id="invite-name"
                ref={nameInput}
                className={`ff-input ${nameError ? 'border-coral focus:border-coral focus:ring-coral/20' : ''}`}
                placeholder="Brittnee"
                value={form.name}
                autoFocus
                aria-invalid={nameError ? true : undefined}
                aria-describedby={nameError ? 'invite-name-error' : undefined}
                onChange={(e) => {
                  setForm({ ...form, name: e.target.value });
                  if (nameError) setNameError(null);
                }}
              />
              {nameError ? (
                <p id="invite-name-error" className="mt-1.5 text-xs font-semibold text-coral">
                  {nameError}
                </p>
              ) : null}
            </div>
            <div>
              <label className="ff-label mb-1.5 block">Email (optional)</label>
              <input
                className="ff-input"
                type="email"
                placeholder="For your reference only"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div>
              <label className="ff-label mb-2 block">Role</label>
              <div className="space-y-2">
                {(['ADULT_VIEWER', 'FAMILY_VIEWER'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setForm({ ...form, role })}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      form.role === role ? 'border-lime bg-lime/[0.08]' : 'border-white/10 bg-midnight'
                    }`}
                  >
                    <div className={`text-sm font-bold ${form.role === role ? 'text-lime' : 'text-cream'}`}>
                      {ROLE_LABEL[role]}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate">{ROLE_BLURB[role]}</div>
                  </button>
                ))}
              </div>
            </div>
            <button disabled={busy} onClick={createInvite} className="ff-btn-primary w-full py-3.5">
              Create invite
            </button>
          </div>
        )}
      </Sheet>

      {/* --------------------------------------------------- permissions */}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.name ?? ''}>
        {editing ? (
          <div className="space-y-4">
            <div>
              <label className="ff-label mb-2 block">Role</label>
              <div className="flex gap-1 rounded-lg bg-midnight p-1">
                {(['ADULT_VIEWER', 'FAMILY_VIEWER'] as const).map((role) => (
                  <button
                    key={role}
                    onClick={async () => {
                      await post({ action: 'set_role', relationshipId: editing.id, role });
                      setEditing({ ...editing, role });
                    }}
                    className={`flex-1 rounded-md py-2 text-[11px] font-bold transition ${
                      editing.role === role ? 'bg-lime text-midnight' : 'text-slate'
                    }`}
                  >
                    {ROLE_LABEL[role]}
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] text-slate">{ROLE_BLURB[editing.role]}</p>
            </div>

            <SettingsGroup title="What they can see">
              {modules.map((m) => (
                <Toggle
                  key={m.key}
                  label={m.label}
                  checked={Boolean(editing.permissions[m.key])}
                  onChange={async (enabled) => {
                    const next = { ...editing.permissions, [m.key]: enabled };
                    setEditing({ ...editing, permissions: next });
                    await post({
                      action: 'set_permissions',
                      relationshipId: editing.id,
                      permissions: [{ module: m.key, enabled }],
                    });
                  }}
                />
              ))}
            </SettingsGroup>

            <p className="text-[11px] leading-relaxed text-slate">
              Turning a module off hides it completely — no placeholder, no count, no hint that anything is there.
            </p>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmRemove !== null}
        title={`Remove ${confirmRemove?.name ?? ''}?`}
        body="They lose access immediately and their saved permissions are deleted. Messages they already sent you are kept."
        confirmLabel="Remove"
        destructive
        onCancel={() => setConfirmRemove(null)}
        onConfirm={async () => {
          if (!confirmRemove) return;
          await post({ action: 'remove', relationshipId: confirmRemove.id }, 'Removed');
          setConfirmRemove(null);
        }}
      />
    </div>
  );
}
