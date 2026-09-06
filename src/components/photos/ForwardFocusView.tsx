'use client';

import { useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Sheet, ConfirmDialog } from '@/components/ui/Sheet';
import { useToast } from '@/components/ui/Toast';
import { weightLabel, type WeightUnit } from '@/lib/units';

export type Photo = {
  id: string;
  angle: string;
  customAngle: string | null;
  visibility: string;
  isMilestone: boolean;
  isFavorite: boolean;
  notes: string | null;
  when: string;
  dateKey: string;
  weight: number | null;
};

const ANGLES = ['FRONT', 'SIDE', 'BACK', 'CUSTOM'] as const;

const VISIBILITY_LABEL: Record<string, string> = {
  OWNER_ONLY: 'Only me',
  ADULTS: 'Adults',
  FAMILY: 'Family',
};

const VISIBILITY_BLURB: Record<string, string> = {
  OWNER_ONLY: 'Nobody else can see this — not even adult viewers.',
  ADULTS: 'Adult viewers can see it. Family viewers cannot.',
  FAMILY: 'Everyone you share with can see it.',
};

const FILTERS = [
  { key: 'ALL', label: 'All' },
  { key: 'FRONT', label: 'Front' },
  { key: 'SIDE', label: 'Side' },
  { key: 'BACK', label: 'Back' },
  { key: 'FAVORITES', label: '★' },
  { key: 'MILESTONES', label: 'Milestones' },
];

/** Downscale in the browser: phone photos are 4-5 MB and nothing needs that. */
async function compress(file: File, maxEdge = 1600): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxEdge / Math.max(bitmap.width, bitmap.height));
  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return file;
  context.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob ?? file), 'image/jpeg', 0.86);
  });
}

export function ForwardFocusView({
  photos,
  weightUnit,
  nowInput,
  suggestedWeight,
}: {
  photos: Photo[];
  weightUnit: WeightUnit;
  nowInput: string;
  suggestedWeight: number | null;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const fileInput = useRef<HTMLInputElement>(null);

  const [filter, setFilter] = useState('ALL');
  const [uploadOpen, setUploadOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [editing, setEditing] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    angle: 'FRONT',
    customAngle: '',
    visibility: 'OWNER_ONLY',
    capturedAt: nowInput,
    weight: suggestedWeight !== null ? String(suggestedWeight) : '',
    notes: '',
    isMilestone: false,
  });

  const visible = useMemo(() => {
    if (filter === 'ALL') return photos;
    if (filter === 'FAVORITES') return photos.filter((p) => p.isFavorite);
    if (filter === 'MILESTONES') return photos.filter((p) => p.isMilestone);
    return photos.filter((p) => p.angle === filter);
  }, [photos, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, Photo[]>();
    for (const photo of visible) {
      const list = map.get(photo.when) ?? [];
      list.push(photo);
      map.set(photo.when, list);
    }
    return Array.from(map.entries());
  }, [visible]);

  async function upload() {
    if (!pendingFile) return;
    setBusy(true);
    try {
      const blob = await compress(pendingFile);
      const body = new FormData();
      body.append('file', new File([blob], 'photo.jpg', { type: 'image/jpeg' }));
      body.append('angle', form.angle);
      if (form.angle === 'CUSTOM') body.append('customAngle', form.customAngle);
      body.append('visibility', form.visibility);
      body.append('capturedAt', new Date(form.capturedAt).toISOString());
      if (form.weight) body.append('weight', form.weight);
      if (form.notes) body.append('notes', form.notes);
      body.append('isMilestone', String(form.isMilestone));

      const response = await fetch('/api/photos', { method: 'POST', body });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? 'Upload failed');

      toast('Photo saved');
      setPendingFile(null);
      setUploadOpen(false);
      setForm({ ...form, notes: '', isMilestone: false });
      router.refresh();
    } catch (error) {
      toast(error instanceof Error ? error.message : 'Upload failed', 'error');
    } finally {
      setBusy(false);
    }
  }

  async function patch(body: Record<string, unknown>, success?: string) {
    const response = await fetch('/api/photos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      if (success) toast(success);
      router.refresh();
      return true;
    }
    toast('Could not save', 'error');
    return false;
  }

  async function remove(id: string) {
    const response = await fetch(`/api/photos?id=${id}`, { method: 'DELETE' });
    setConfirmDelete(null);
    setEditing(null);
    if (response.ok) {
      toast('Deleted', 'info');
      router.refresh();
    }
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      <input
        ref={fileInput}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setPendingFile(file);
          setUploadOpen(true);
          e.target.value = '';
        }}
      />

      {photos.length === 0 ? (
        <div className="ff-card py-8 text-center">
          <div className="text-3xl">📸</div>
          <h2 className="mt-3 text-lg font-extrabold tracking-tight text-cream">Take the picture now.</h2>
          <p className="mx-auto mt-2 max-w-[19rem] text-[13px] leading-relaxed text-slate">
            You may not love taking it today, but someday you may be incredibly glad you have it.
          </p>
          <p className="mx-auto mt-3 max-w-[19rem] text-[11px] text-slate/70">
            Completely optional, and private by default — new photos start visible to you alone.
          </p>
        </div>
      ) : (
        <div className="flex gap-1 overflow-x-auto rounded-xl bg-surface p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`shrink-0 rounded-lg px-3 py-2 text-xs font-bold transition ${
                filter === f.key ? 'bg-lime text-midnight' : 'text-slate'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      <button onClick={() => fileInput.current?.click()} className="ff-btn-primary w-full py-4 text-base">
        + Add photo
      </button>

      {grouped.map(([date, items]) => (
        <div key={date} className="ff-card">
          <div className="mb-3 flex items-baseline justify-between">
            <div className="ff-label">{date}</div>
            {items[0].weight !== null ? (
              <span className="text-xs font-bold text-slate">
                {items[0].weight} {weightLabel(weightUnit)}
              </span>
            ) : null}
          </div>
          <div className="grid grid-cols-3 gap-2">
            {items.map((photo) => (
              <button key={photo.id} onClick={() => setEditing(photo)} className="group relative text-left">
                <div className="overflow-hidden rounded-xl bg-midnight">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`/api/photos/${photo.id}/file`}
                    alt={`${photo.angle} on ${photo.when}`}
                    className="aspect-[3/4] w-full object-cover transition group-active:scale-95"
                    loading="lazy"
                  />
                </div>
                <div className="mt-1 flex items-center gap-1">
                  <span className="text-[9px] font-bold uppercase tracking-wide text-slate">
                    {photo.angle === 'CUSTOM' ? (photo.customAngle ?? 'Custom') : photo.angle}
                  </span>
                  {photo.isFavorite ? <span className="text-[9px]">★</span> : null}
                  {photo.isMilestone ? <span className="text-[9px]">🏆</span> : null}
                </div>
                <div className="text-[9px] text-slate/70">{VISIBILITY_LABEL[photo.visibility]}</div>
              </button>
            ))}
          </div>
        </div>
      ))}

      {/* ---------------------------------------------------------- upload */}
      <Sheet
        open={uploadOpen}
        onClose={() => {
          setUploadOpen(false);
          setPendingFile(null);
        }}
        title="New progress photo"
      >
        <div className="space-y-3">
          <div>
            <label className="ff-label mb-2 block">Angle</label>
            <div className="grid grid-cols-4 gap-2">
              {ANGLES.map((angle) => (
                <button
                  key={angle}
                  onClick={() => setForm({ ...form, angle })}
                  className={`rounded-xl py-2.5 text-[11px] font-bold transition ${
                    form.angle === angle ? 'bg-lime text-midnight' : 'bg-midnight text-slate'
                  }`}
                >
                  {angle === 'CUSTOM' ? 'Other' : angle[0] + angle.slice(1).toLowerCase()}
                </button>
              ))}
            </div>
          </div>

          {form.angle === 'CUSTOM' ? (
            <input
              className="ff-input"
              placeholder="Label this angle"
              value={form.customAngle}
              onChange={(e) => setForm({ ...form, customAngle: e.target.value })}
            />
          ) : null}

          <div>
            <label className="ff-label mb-2 block">Who can see it</label>
            <div className="space-y-2">
              {(['OWNER_ONLY', 'ADULTS', 'FAMILY'] as const).map((v) => (
                <button
                  key={v}
                  onClick={() => setForm({ ...form, visibility: v })}
                  className={`w-full rounded-xl border p-3 text-left transition ${
                    form.visibility === v ? 'border-lime bg-lime/[0.08]' : 'border-white/10 bg-midnight'
                  }`}
                >
                  <div className={`text-sm font-bold ${form.visibility === v ? 'text-lime' : 'text-cream'}`}>
                    {VISIBILITY_LABEL[v]}
                  </div>
                  <div className="mt-0.5 text-[11px] text-slate">{VISIBILITY_BLURB[v]}</div>
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="ff-label mb-1.5 block">Taken</label>
              <input
                className="ff-input"
                type="datetime-local"
                value={form.capturedAt}
                onChange={(e) => setForm({ ...form, capturedAt: e.target.value })}
              />
            </div>
            <div>
              <label className="ff-label mb-1.5 block">Weight ({weightLabel(weightUnit)})</label>
              <input
                className="ff-input"
                type="number"
                inputMode="decimal"
                step="any"
                placeholder="Optional"
                value={form.weight}
                onChange={(e) => setForm({ ...form, weight: e.target.value })}
              />
            </div>
          </div>

          <textarea
            className="ff-input min-h-[4rem] resize-none"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />

          <label className="flex items-center justify-between rounded-xl bg-midnight px-4 py-3">
            <span className="text-sm font-semibold text-cream">Mark as milestone</span>
            <input
              type="checkbox"
              checked={form.isMilestone}
              onChange={(e) => setForm({ ...form, isMilestone: e.target.checked })}
              className="h-5 w-9 appearance-none rounded-full bg-white/15 transition checked:bg-lime"
            />
          </label>

          <button disabled={busy} onClick={upload} className="ff-btn-primary w-full py-3.5">
            {busy ? 'Uploading…' : 'Save photo'}
          </button>
        </div>
      </Sheet>

      {/* ------------------------------------------------------------ edit */}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} title={editing?.when ?? ''}>
        {editing ? (
          <div className="space-y-3">
            <div className="overflow-hidden rounded-2xl bg-midnight">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/photos/${editing.id}/file`}
                alt={`${editing.angle} on ${editing.when}`}
                className="max-h-[45vh] w-full object-contain"
              />
            </div>

            <div>
              <label className="ff-label mb-2 block">Who can see it</label>
              <div className="space-y-2">
                {(['OWNER_ONLY', 'ADULTS', 'FAMILY'] as const).map((v) => (
                  <button
                    key={v}
                    onClick={async () => {
                      if (await patch({ id: editing.id, visibility: v }, 'Visibility updated')) {
                        setEditing({ ...editing, visibility: v });
                      }
                    }}
                    className={`w-full rounded-xl border p-3 text-left transition ${
                      editing.visibility === v ? 'border-lime bg-lime/[0.08]' : 'border-white/10 bg-midnight'
                    }`}
                  >
                    <div className={`text-sm font-bold ${editing.visibility === v ? 'text-lime' : 'text-cream'}`}>
                      {VISIBILITY_LABEL[v]}
                    </div>
                    <div className="mt-0.5 text-[11px] text-slate">{VISIBILITY_BLURB[v]}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={async () => {
                  if (await patch({ id: editing.id, isFavorite: !editing.isFavorite })) {
                    setEditing({ ...editing, isFavorite: !editing.isFavorite });
                  }
                }}
                className="ff-btn-secondary flex-1 py-2.5 text-xs"
              >
                {editing.isFavorite ? '★ Favorited' : '☆ Favorite'}
              </button>
              <button
                onClick={async () => {
                  if (await patch({ id: editing.id, isMilestone: !editing.isMilestone })) {
                    setEditing({ ...editing, isMilestone: !editing.isMilestone });
                  }
                }}
                className="ff-btn-secondary flex-1 py-2.5 text-xs"
              >
                {editing.isMilestone ? '🏆 Milestone' : 'Mark milestone'}
              </button>
            </div>

            {editing.notes ? <p className="text-xs italic text-slate">{editing.notes}</p> : null}

            <button onClick={() => setConfirmDelete(editing.id)} className="ff-btn-ghost w-full text-xs">
              Delete photo
            </button>
          </div>
        ) : null}
      </Sheet>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this photo?"
        body="The image file is removed from storage permanently. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() => confirmDelete && remove(confirmDelete)}
      />
    </div>
  );
}
