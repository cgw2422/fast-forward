import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { requireOwnerUser, NotFoundError } from '@/lib/authz';
import { handler, fail } from '@/lib/api';
import { deletePhotoAndObject } from '@/lib/photos';
import {
  buildPhotoKey,
  isAllowedImageType,
  MAX_PHOTO_BYTES,
  sniffImageType,
  storage,
} from '@/lib/storage';
import { displayToKg } from '@/lib/units';

export const dynamic = 'force-dynamic';

/** Upload. Owner-only by construction — getContext rejects viewer accounts. */
export async function POST(request: Request) {
  return handler(async () => {
    const ctx = await getContext();
    const form = await request.formData();

    const file = form.get('file');
    if (!(file instanceof File)) throw new Error('No image was uploaded');
    if (file.size > MAX_PHOTO_BYTES) {
      throw new Error(`Images must be under ${Math.round(MAX_PHOTO_BYTES / 1024 / 1024)} MB`);
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    // Trust the bytes, not the declared content type.
    const sniffed = sniffImageType(buffer);
    if (!sniffed || !isAllowedImageType(sniffed)) {
      throw new Error('Only JPEG, PNG and WebP images are supported');
    }

    const angle = String(form.get('angle') ?? 'FRONT');
    const visibility = String(form.get('visibility') ?? 'OWNER_ONLY');
    if (!['FRONT', 'SIDE', 'BACK', 'CUSTOM'].includes(angle)) throw new Error('Invalid angle');
    if (!['OWNER_ONLY', 'ADULTS', 'FAMILY'].includes(visibility)) throw new Error('Invalid visibility');

    const capturedRaw = form.get('capturedAt');
    const capturedAt = capturedRaw ? new Date(String(capturedRaw)) : new Date();
    if (Number.isNaN(capturedAt.getTime())) throw new Error('Invalid capture date');

    const weightRaw = form.get('weight');
    const weightKg = weightRaw ? displayToKg(Number(weightRaw), ctx.prefs.weightUnit) : null;

    const key = buildPhotoKey(ctx.user.id, sniffed);
    await storage().put(key, buffer, sniffed);

    const photo = await prisma.progressPhoto.create({
      data: {
        userId: ctx.user.id,
        angle: angle as 'FRONT' | 'SIDE' | 'BACK' | 'CUSTOM',
        customAngle: form.get('customAngle') ? String(form.get('customAngle')).slice(0, 60) : null,
        capturedAt,
        weightKg: weightKg && Number.isFinite(weightKg) ? weightKg : null,
        notes: form.get('notes') ? String(form.get('notes')).slice(0, 1000) : null,
        visibility: visibility as 'OWNER_ONLY' | 'ADULTS' | 'FAMILY',
        isMilestone: form.get('isMilestone') === 'true',
        storageKey: key,
        mimeType: sniffed,
        sizeBytes: buffer.length,
      },
    });

    return { ok: true, photoId: photo.id };
  });
}

const updateSchema = z.object({
  id: z.string(),
  angle: z.enum(['FRONT', 'SIDE', 'BACK', 'CUSTOM']).optional(),
  customAngle: z.string().max(60).nullable().optional(),
  capturedAt: z.string().datetime().optional(),
  weight: z.number().positive().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  visibility: z.enum(['OWNER_ONLY', 'ADULTS', 'FAMILY']).optional(),
  isMilestone: z.boolean().optional(),
  isFavorite: z.boolean().optional(),
});

/** Metadata and visibility edits. Only the owning account may change these. */
export async function PATCH(request: Request) {
  const parsed = updateSchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) return fail(parsed.error.issues[0].message, 422);

  return handler(async () => {
    const ctx = await getContext();
    const { id, ...fields } = parsed.data;

    const existing = await prisma.progressPhoto.findFirst({ where: { id, userId: ctx.user.id } });
    if (!existing) throw new NotFoundError();

    await prisma.progressPhoto.update({
      where: { id },
      data: {
        angle: fields.angle ?? undefined,
        customAngle: fields.customAngle === undefined ? undefined : fields.customAngle,
        capturedAt: fields.capturedAt ? new Date(fields.capturedAt) : undefined,
        weightKg:
          fields.weight === undefined
            ? undefined
            : fields.weight === null
              ? null
              : displayToKg(fields.weight, ctx.prefs.weightUnit),
        notes: fields.notes === undefined ? undefined : fields.notes,
        visibility: fields.visibility ?? undefined,
        isMilestone: fields.isMilestone ?? undefined,
        isFavorite: fields.isFavorite ?? undefined,
      },
    });

    return { ok: true };
  });
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get('id');
  if (!id) return fail('Missing id');

  return handler(async () => {
    const owner = await requireOwnerUser();
    await deletePhotoAndObject(id, owner.id);
    return { ok: true };
  });
}
