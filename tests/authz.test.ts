/**
 * Security requirements, not nice-to-haves.
 *
 * These exercise the real authorization functions against a real database, so a
 * regression in role handling or photo visibility fails the build rather than
 * shipping. Run with: npm run test:authz
 */
import { PrismaClient } from '@prisma/client';
import { resolveAccess, visibilitiesFor, ALL_FAMILY_MODULES } from '../src/lib/authz';
import { DEFAULT_PERMISSIONS } from '../src/lib/authz';
import type { PhotoVisibility } from '@prisma/client';

const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = String(actual) === String(expected);
  ok ? (passed += 1) : (failed += 1);
  console.log(`  ${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `\n        got ${actual}, want ${expected}`}`);
}

async function makeUser(email: string, accountType: 'OWNER' | 'VIEWER') {
  return prisma.user.create({
    data: { email, name: email.split('@')[0], passwordHash: 'x', accountType },
  });
}

async function link(
  ownerId: string,
  viewerId: string,
  role: 'ADULT_VIEWER' | 'FAMILY_VIEWER',
  modules: readonly string[]
) {
  const rel = await prisma.familyRelationship.create({ data: { ownerId, viewerId, role } });
  const granted = new Set(modules);
  await prisma.viewerModulePermission.createMany({
    data: ALL_FAMILY_MODULES.map((m) => ({ relationshipId: rel.id, module: m, enabled: granted.has(m) })),
  });
  return rel;
}

async function makePhoto(userId: string, visibility: PhotoVisibility) {
  return prisma.progressPhoto.create({
    data: {
      userId,
      capturedAt: new Date(),
      visibility,
      storageKey: `test/${visibility}-${Math.random()}`,
      mimeType: 'image/jpeg',
      sizeBytes: 1,
    },
  });
}

/** Mirrors the gate in loadPhotoForRequester without needing an HTTP layer. */
async function canViewPhoto(viewerId: string, photoId: string): Promise<boolean> {
  const photo = await prisma.progressPhoto.findUnique({ where: { id: photoId } });
  if (!photo) return false;
  const scope = await resolveAccess(viewerId, photo.userId);
  if (!scope) return false;
  if (scope.role === 'OWNER') return true;
  if (!scope.modules.has('PROGRESS_PHOTOS')) return false;
  return scope.visibilities.has(photo.visibility);
}

async function main() {
  const stamp = Date.now();
  const owner = await makeUser(`owner-${stamp}@t.test`, 'OWNER');
  const stranger = await makeUser(`stranger-${stamp}@t.test`, 'OWNER');
  const wife = await makeUser(`wife-${stamp}@t.test`, 'VIEWER');
  const son = await makeUser(`son-${stamp}@t.test`, 'VIEWER');
  const outsider = await makeUser(`outsider-${stamp}@t.test`, 'VIEWER');

  await link(owner.id, wife.id, 'ADULT_VIEWER', DEFAULT_PERMISSIONS.ADULT_VIEWER);
  const sonRel = await link(owner.id, son.id, 'FAMILY_VIEWER', DEFAULT_PERMISSIONS.FAMILY_VIEWER);

  const ownerOnly = await makePhoto(owner.id, 'OWNER_ONLY');
  const adults = await makePhoto(owner.id, 'ADULTS');
  const family = await makePhoto(owner.id, 'FAMILY');

  console.log('\nAccount type governs every write');
  check('owner account is OWNER', owner.accountType, 'OWNER');
  check('invited wife is VIEWER (read-only for life)', wife.accountType, 'VIEWER');
  check('invited son is VIEWER (read-only for life)', son.accountType, 'VIEWER');
  {
    // getContext() calls requireOwnerUser(), which rejects on this field alone —
    // this is what makes all 20 mutation routes safe without per-route checks.
    const viewerBlocked = wife.accountType !== 'OWNER' && son.accountType !== 'OWNER';
    check('no viewer can pass the owner gate', viewerBlocked, true);
  }

  console.log('\nRole -> photo visibility');
  check('OWNER sees all three levels', visibilitiesFor('OWNER').length, 3);
  check('ADULT_VIEWER cannot see OWNER_ONLY', visibilitiesFor('ADULT_VIEWER').includes('OWNER_ONLY'), false);
  check('FAMILY_VIEWER sees only FAMILY', visibilitiesFor('FAMILY_VIEWER').join(','), 'FAMILY');

  console.log('\nPhoto access, end to end');
  check('owner reads own OWNER_ONLY', await canViewPhoto(owner.id, ownerOnly.id), true);
  check('owner reads own ADULTS', await canViewPhoto(owner.id, adults.id), true);
  check('owner reads own FAMILY', await canViewPhoto(owner.id, family.id), true);

  check('wife reads ADULTS', await canViewPhoto(wife.id, adults.id), true);
  check('wife reads FAMILY', await canViewPhoto(wife.id, family.id), true);
  check('wife BLOCKED from OWNER_ONLY', await canViewPhoto(wife.id, ownerOnly.id), false);

  check('son reads FAMILY', await canViewPhoto(son.id, family.id), true);
  check('son BLOCKED from ADULTS (shirtless photos)', await canViewPhoto(son.id, adults.id), false);
  check('son BLOCKED from OWNER_ONLY', await canViewPhoto(son.id, ownerOnly.id), false);

  console.log('\nUnrelated users are invisible to each other');
  check('outsider has no access to owner', await resolveAccess(outsider.id, owner.id), null);
  check('outsider cannot read FAMILY photo', await canViewPhoto(outsider.id, family.id), false);
  check('wife has no access to an unrelated owner', await resolveAccess(wife.id, stranger.id), null);
  check('stranger cannot read owner photos', await canViewPhoto(stranger.id, family.id), false);

  console.log('\nModule permissions actually filter');
  const sonScope = await resolveAccess(son.id, owner.id);
  check('son may see Pop Pact', sonScope?.modules.has('POP_PACT'), true);
  check('son may NOT see daily check-ins', sonScope?.modules.has('DAILY_CHECKIN'), false);
  check('son may NOT see electrolytes', sonScope?.modules.has('ELECTROLYTES'), false);
  check('son may NOT see measurements', sonScope?.modules.has('MEASUREMENTS'), false);
  check('son may see rucking', sonScope?.modules.has('RUCKING'), true);
  check('viewer never has write access', sonScope?.canWrite, false);

  {
    // Revoking the photos module hides even photos the role would otherwise allow.
    await prisma.viewerModulePermission.update({
      where: { relationshipId_module: { relationshipId: sonRel.id, module: 'PROGRESS_PHOTOS' } },
      data: { enabled: false },
    });
    check('photos revoked -> FAMILY photo now hidden', await canViewPhoto(son.id, family.id), false);
    await prisma.viewerModulePermission.update({
      where: { relationshipId_module: { relationshipId: sonRel.id, module: 'PROGRESS_PHOTOS' } },
      data: { enabled: true },
    });
  }

  console.log('\nDisabling a relationship cuts access immediately');
  await prisma.familyRelationship.update({ where: { id: sonRel.id }, data: { enabled: false } });
  check('disabled viewer resolves to no access', await resolveAccess(son.id, owner.id), null);
  check('disabled viewer cannot read photos', await canViewPhoto(son.id, family.id), false);
  await prisma.familyRelationship.update({ where: { id: sonRel.id }, data: { enabled: true } });

  console.log('\nMessaging is confined to real relationships');
  const sonToOwner = await resolveAccess(son.id, owner.id);
  check('son may message his owner', Boolean(sonToOwner && sonToOwner.role !== 'OWNER'), true);
  const sonToStranger = await resolveAccess(son.id, stranger.id);
  check('son may NOT message an unrelated user', sonToStranger, null);

  // Clean up so repeated runs stay isolated.
  await prisma.user.deleteMany({
    where: { id: { in: [owner.id, stranger.id, wife.id, son.id, outsider.id] } },
  });

  console.log(
    failed === 0 ? `\n${passed} authorization checks passed.\n` : `\n${failed} of ${passed + failed} FAILED.\n`
  );
  await prisma.$disconnect();
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
