import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';
import { peekInvite } from '@/lib/family';

export const dynamic = 'force-dynamic';

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ invite?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.accountType === 'VIEWER' ? '/family' : '/today');

  const { invite: code } = await searchParams;
  const invite = code ? await peekInvite(code) : null;

  return <AuthForm mode="signup" invite={invite ? { code: code as string, ...invite } : null} />;
}
