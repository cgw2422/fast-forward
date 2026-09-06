'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ConfirmDialog } from '@/components/ui/Sheet';

export function LogoutButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  return (
    <>
      <button onClick={() => setOpen(true)} className="ff-btn-secondary w-full py-3.5 text-coral">
        Sign out
      </button>
      <ConfirmDialog
        open={open}
        title="Sign out?"
        body="Your data stays right where it is. You'll just need to sign back in."
        confirmLabel="Sign out"
        destructive
        onCancel={() => setOpen(false)}
        onConfirm={logout}
      />
    </>
  );
}
