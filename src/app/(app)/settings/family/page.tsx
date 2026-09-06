import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { ALL_FAMILY_MODULES, FAMILY_MODULE_LABELS } from '@/lib/authz';
import { PageHeader } from '@/components/PageHeader';
import { FamilySettings } from '@/components/family/FamilySettings';
import { formatDate } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export default async function FamilySettingsPage() {
  const ctx = await getContext();

  const [relationships, invites] = await Promise.all([
    prisma.familyRelationship.findMany({
      where: { ownerId: ctx.user.id },
      include: { viewer: { select: { name: true, email: true } }, permissions: true },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.familyInvite.findMany({
      where: { ownerId: ctx.user.id, acceptedAt: null, expiresAt: { gt: new Date() } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <>
      <PageHeader title="Family View" subtitle="Who can see your progress." backHref="/more" />
      <FamilySettings
        modules={ALL_FAMILY_MODULES.map((m) => ({ key: m, label: FAMILY_MODULE_LABELS[m] }))}
        members={relationships.map((r) => ({
          id: r.id,
          name: r.viewer.name,
          email: r.viewer.email,
          role: r.role,
          enabled: r.enabled,
          permissions: Object.fromEntries(r.permissions.map((p) => [p.module, p.enabled])),
        }))}
        invites={invites.map((i) => ({
          id: i.id,
          name: i.name,
          role: i.role,
          code: i.code,
          expires: formatDate(i.expiresAt, ctx.timezone, 'MMM d'),
        }))}
      />
    </>
  );
}
