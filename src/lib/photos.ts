import 'server-only';
import { prisma } from './prisma';
import { requireUser } from './auth';
import { resolveAccess, NotFoundError, type AccessScope } from './authz';
import { storage } from './storage';
import type { ProgressPhoto } from '@prisma/client';

/**
 * Resolves a photo for a specific requester, applying every gate in order:
 * authentication, relationship, module grant, then visibility level.
 *
 * Anything that fails raises NotFoundError, never Forbidden — a viewer must not
 * be able to tell a restricted photo apart from one that never existed. That is
 * why counts, thumbnails and placeholders are never emitted for hidden photos.
 */
export async function loadPhotoForRequester(
  photoId: string
): Promise<{ photo: ProgressPhoto; scope: AccessScope }> {
  const user = await requireUser();

  const photo = await prisma.progressPhoto.findUnique({ where: { id: photoId } });
  if (!photo) throw new NotFoundError();

  const scope = await resolveAccess(user.id, photo.userId);
  if (!scope) throw new NotFoundError();

  if (scope.role !== 'OWNER') {
    if (!scope.modules.has('PROGRESS_PHOTOS')) throw new NotFoundError();
    if (!scope.visibilities.has(photo.visibility)) throw new NotFoundError();
  }

  return { photo, scope };
}

/** The visibility levels a requester may list for an owner, or null if none. */
export async function listablePhotosFilter(viewerId: string, ownerId: string) {
  const scope = await resolveAccess(viewerId, ownerId);
  if (!scope) return null;
  if (scope.role !== 'OWNER' && !scope.modules.has('PROGRESS_PHOTOS')) return null;
  return { scope, visibilities: Array.from(scope.visibilities) };
}

export async function deletePhotoAndObject(photoId: string, ownerId: string) {
  const photo = await prisma.progressPhoto.findFirst({ where: { id: photoId, userId: ownerId } });
  if (!photo) throw new NotFoundError();
  await prisma.progressPhoto.delete({ where: { id: photo.id } });
  // Best-effort: a dangling object is better than a dangling database row.
  await storage().delete(photo.storageKey).catch(() => {});
}
