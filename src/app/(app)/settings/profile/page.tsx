import { getContext } from '@/lib/context';
import { PageHeader } from '@/components/PageHeader';
import { ProfileSettings } from '@/components/settings/ProfileSettings';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const ctx = await getContext();
  return (
    <>
      <PageHeader title="Profile" backHref="/more" />
      <ProfileSettings name={ctx.user.name} email={ctx.user.email} timezone={ctx.user.timezone} />
    </>
  );
}
