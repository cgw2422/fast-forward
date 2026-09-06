import { prisma } from '@/lib/prisma';
import { getContext } from '@/lib/context';
import { formatDate } from '@/lib/dates';
import { PageHeader } from '@/components/PageHeader';
import { MessageInbox } from '@/components/family/MessageInbox';

export const dynamic = 'force-dynamic';

export default async function FamilyMessagesPage() {
  const ctx = await getContext();

  const messages = await prisma.familyMessage.findMany({
    where: { ownerId: ctx.user.id },
    include: { sender: { select: { name: true } } },
    orderBy: [{ pinned: 'desc' }, { createdAt: 'desc' }],
    take: 200,
  });

  return (
    <>
      <PageHeader title="Family Messages" subtitle="Cheers from the people you promised." backHref="/more" />
      <MessageInbox
        messages={messages.map((m) => ({
          id: m.id,
          sender: m.sender.name.split(' ')[0],
          body: m.body,
          pinned: m.pinned,
          unread: m.readAt === null,
          when: formatDate(m.createdAt, ctx.timezone, 'MMM d · h:mm a'),
        }))}
      />
    </>
  );
}
