import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { AuthForm } from '@/components/AuthForm';

export const dynamic = 'force-dynamic';

export default async function SignupPage() {
  if (await getSessionUser()) redirect('/today');
  return <AuthForm mode="signup" />;
}
