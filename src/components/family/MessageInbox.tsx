'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/ui/Toast';
import { ConfirmDialog } from '@/components/ui/Sheet';

type Message = {
  id: string;
  sender: string;
  body: string;
  pinned: boolean;
  unread: boolean;
  when: string;
};

export function MessageInbox({ messages }: { messages: Message[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const unreadCount = messages.filter((m) => m.unread).length;

  async function patch(body: Record<string, unknown>, success?: string) {
    const response = await fetch('/api/family/messages', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.ok) {
      if (success) toast(success);
      router.refresh();
    } else {
      toast('Could not save', 'error');
    }
  }

  if (messages.length === 0) {
    return (
      <div className="animate-fade-up pt-2">
        <div className="ff-card py-12 text-center">
          <div className="text-3xl">💚</div>
          <p className="mx-auto mt-3 max-w-[16rem] text-sm text-slate">
            No messages yet. Once family members are set up, anything they send lands here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-up space-y-3 pt-2 pb-4">
      {unreadCount > 0 ? (
        <button
          onClick={() => patch({ action: 'mark_all_read' }, 'All caught up')}
          className="ff-btn-secondary w-full py-2.5 text-xs"
        >
          Mark all {unreadCount} as read
        </button>
      ) : null}

      <ul className="space-y-2.5">
        {messages.map((message) => (
          <li
            key={message.id}
            className={`ff-card ${message.pinned ? 'border-lime/30 bg-lime/[0.04]' : ''}`}
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-midnight text-xs font-bold text-lime">
                {message.sender.slice(0, 1).toUpperCase()}
              </span>
              <span className="text-sm font-bold text-cream">{message.sender}</span>
              {message.unread ? <span className="h-2 w-2 rounded-full bg-lime" aria-label="Unread" /> : null}
              {message.pinned ? <span className="text-xs">📌</span> : null}
              <span className="ml-auto text-[11px] text-slate">{message.when}</span>
            </div>

            <p className="mt-2.5 text-[15px] leading-relaxed text-cream">{message.body}</p>

            <div className="mt-3 flex gap-2 border-t border-white/[0.06] pt-2.5">
              <button
                onClick={() => patch({ action: 'set_pinned', messageId: message.id, pinned: !message.pinned })}
                className="text-[11px] font-bold text-lime"
              >
                {message.pinned ? 'Unpin' : 'Pin this'}
              </button>
              {message.unread ? (
                <button
                  onClick={() => patch({ action: 'mark_read', messageId: message.id })}
                  className="text-[11px] font-bold text-slate"
                >
                  Mark read
                </button>
              ) : null}
              <button
                onClick={() => setConfirmDelete(message.id)}
                className="ml-auto text-[11px] font-bold text-slate hover:text-coral"
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>

      <p className="px-1 text-[11px] leading-relaxed text-slate">
        Pinned messages can show up when you need them — on the craving screen, or late in the day when the walk
        hasn&apos;t happened yet.
      </p>

      <ConfirmDialog
        open={confirmDelete !== null}
        title="Delete this message?"
        body="It's removed from your inbox for good. The sender won't be told."
        confirmLabel="Delete"
        destructive
        onCancel={() => setConfirmDelete(null)}
        onConfirm={async () => {
          if (!confirmDelete) return;
          await patch({ action: 'delete', messageId: confirmDelete }, 'Deleted');
          setConfirmDelete(null);
        }}
      />
    </div>
  );
}
