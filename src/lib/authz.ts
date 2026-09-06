import 'server-only';
import { prisma } from './prisma';
import { requireUser, type SessionUser } from './auth';
import type { FamilyRole, FamilyModule, PhotoVisibility } from '@prisma/client';

/**
 * Single source of truth for who may see or change what.
 *
 * Two rules hold everywhere:
 *   1. Only an OWNER account may write health data. Viewer accounts are
 *      read-only for life — the check is on the account type, not the UI.
 *   2. A viewer sees exactly the modules their owner granted, and exactly the
 *      photo visibility levels their role allows. Nothing is filtered only in
 *      the client.
 */

export class ForbiddenError extends Error {
  constructor(message = 'You do not have permission to do that') {
    super(message);
    this.name = 'ForbiddenError';
  }
}

/** Restricted resources 404 rather than 403 so their existence stays hidden. */
export class NotFoundError extends Error {
  constructor(message = 'Not found') {
    super(message);
    this.name = 'NotFoundError';
  }
}

/* ------------------------------------------------------------ photo rules */

const VISIBILITY_BY_ROLE: Record<FamilyRole, PhotoVisibility[]> = {
  OWNER: ['OWNER_ONLY', 'ADULTS', 'FAMILY'],
  ADULT_VIEWER: ['ADULTS', 'FAMILY'],
  FAMILY_VIEWER: ['FAMILY'],
};

export function visibilitiesFor(role: FamilyRole): PhotoVisibility[] {
  return VISIBILITY_BY_ROLE[role];
}

/* ------------------------------------------------- default permission sets */

export const ALL_FAMILY_MODULES: FamilyModule[] = [
  'POP_PACT',
  'WEIGHT',
  'WEIGHT_TREND',
  'WALKING',
  'RUCKING',
  'WATER',
  'FASTING',
  'TINY_WINS',
  'WORKOUTS',
  'DAILY_CHECKIN',
  'MEASUREMENTS',
  'ELECTROLYTES',
  'PROGRESS_PHOTOS',
  'TIMELINE',
  'MILESTONES',
];

export const FAMILY_MODULE_LABELS: Record<FamilyModule, string> = {
  POP_PACT: 'Pop Pact',
  WEIGHT: 'Weight',
  WEIGHT_TREND: 'Weight trend',
  WALKING: 'Walking',
  RUCKING: 'Rucking',
  WATER: 'Water',
  FASTING: 'Fasting',
  TINY_WINS: 'Tiny Wins',
  WORKOUTS: 'Workouts',
  DAILY_CHECKIN: 'Daily check-in',
  MEASUREMENTS: 'Measurements',
  ELECTROLYTES: 'Electrolytes',
  PROGRESS_PHOTOS: 'Progress photos',
  TIMELINE: 'Timeline',
  MILESTONES: 'Milestones',
};

/**
 * Sensible starting points. A kid gets the encouraging, non-clinical view;
 * an adult gets more. The owner can change any of it afterwards.
 */
export const DEFAULT_PERMISSIONS: Record<'ADULT_VIEWER' | 'FAMILY_VIEWER', FamilyModule[]> = {
  ADULT_VIEWER: [
    'POP_PACT',
    'WEIGHT',
    'WEIGHT_TREND',
    'WALKING',
    'RUCKING',
    'WATER',
    'FASTING',
    'TINY_WINS',
    'WORKOUTS',
    'PROGRESS_PHOTOS',
    'MILESTONES',
  ],
  FAMILY_VIEWER: ['POP_PACT', 'WEIGHT', 'WALKING', 'RUCKING', 'TINY_WINS', 'MILESTONES', 'PROGRESS_PHOTOS'],
};

/* --------------------------------------------------------- owner contexts */

/**
 * Gate for every write and every owner-only page. Viewer accounts are rejected
 * here, which is why the individual mutation routes don't each need their own
 * role check.
 */
export async function requireOwnerUser(): Promise<SessionUser> {
  const user = await requireUser();
  if (user.accountType !== 'OWNER') {
    throw new ForbiddenError('This account is read-only.');
  }
  return user;
}

/* -------------------------------------------------------- viewer contexts */

export type AccessScope = {
  viewerId: string;
  ownerId: string;
  ownerName: string;
  role: FamilyRole;
  canWrite: boolean;
  modules: Set<FamilyModule>;
  visibilities: Set<PhotoVisibility>;
};

/**
 * Resolves what `viewerId` may see of `ownerId`. Returns null when there is no
 * usable relationship — callers turn that into a 404, never a 403.
 */
export async function resolveAccess(viewerId: string, ownerId: string): Promise<AccessScope | null> {
  if (viewerId === ownerId) {
    const owner = await prisma.user.findUnique({ where: { id: ownerId }, select: { name: true } });
    if (!owner) return null;
    return {
      viewerId,
      ownerId,
      ownerName: owner.name,
      role: 'OWNER',
      canWrite: true,
      modules: new Set(ALL_FAMILY_MODULES),
      visibilities: new Set(visibilitiesFor('OWNER')),
    };
  }

  const relationship = await prisma.familyRelationship.findUnique({
    where: { ownerId_viewerId: { ownerId, viewerId } },
    include: { permissions: true, owner: { select: { name: true } } },
  });

  if (!relationship || !relationship.enabled) return null;

  return {
    viewerId,
    ownerId,
    ownerName: relationship.owner.name,
    role: relationship.role,
    // A viewer never writes health data, whatever their role.
    canWrite: false,
    modules: new Set(relationship.permissions.filter((p) => p.enabled).map((p) => p.module)),
    visibilities: new Set(visibilitiesFor(relationship.role)),
  };
}

/** The owners a signed-in viewer is currently allowed to watch. */
export async function listWatchableOwners(viewerId: string) {
  const relationships = await prisma.familyRelationship.findMany({
    where: { viewerId, enabled: true },
    include: { owner: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'asc' },
  });
  return relationships.map((r) => ({ ownerId: r.owner.id, ownerName: r.owner.name, role: r.role }));
}

/**
 * Read gate for family-facing pages and APIs. Throws NotFoundError when the
 * relationship is missing, disabled, or the module was never granted — the
 * caller cannot tell those cases apart, which is the point.
 */
export async function requireViewAccess(ownerId: string, module?: FamilyModule): Promise<AccessScope> {
  const user = await requireUser();
  const scope = await resolveAccess(user.id, ownerId);
  if (!scope) throw new NotFoundError();
  if (module && !scope.modules.has(module)) throw new NotFoundError();
  return scope;
}

export function canSee(scope: AccessScope, module: FamilyModule): boolean {
  return scope.modules.has(module);
}

export function canSeePhoto(scope: AccessScope, visibility: PhotoVisibility): boolean {
  return scope.modules.has('PROGRESS_PHOTOS') && scope.visibilities.has(visibility);
}
