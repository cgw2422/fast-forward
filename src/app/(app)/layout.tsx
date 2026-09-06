import { redirect } from 'next/navigation';
import { getSessionUser } from '@/lib/auth';
import { BottomNav } from '@/components/BottomNav';

export const dynamic = 'force-dynamic';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect('/login');
  // Viewer accounts have their own read-only surface; they never see owner screens.
  if (user.accountType === 'VIEWER') redirect('/family');

  return (
    <div className="min-h-[100dvh] bg-midnight">
      <div className="mx-auto w-full max-w-md px-4 pb-28">{children}</div>
      <BottomNav />
    </div>
  );
}
