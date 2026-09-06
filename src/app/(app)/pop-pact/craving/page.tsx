import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { getOrCreatePact } from '@/lib/poppact';
import { CravingView } from '@/components/pop/CravingView';

export const dynamic = 'force-dynamic';

export default async function CravingPage() {
  const ctx = await getContext();
  const [pact, pinned] = await Promise.all([
    getOrCreatePact(ctx.user.id),
    // A pinned message from the person you made the promise to lands harder
    // than any copy we could write.
    prisma.familyMessage.findFirst({
      where: { ownerId: ctx.user.id, pinned: true },
      include: { sender: { select: { name: true } } },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  return (
    <CravingView
      reason={pact.reason}
      pinned={pinned ? { sender: pinned.sender.name.split(' ')[0], body: pinned.body } : null}
    />
  );
}
