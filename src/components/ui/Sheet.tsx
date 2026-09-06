'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';

/**
 * Modals render into document.body via a portal.
 *
 * Without it, `position: fixed` resolves against the nearest ancestor that has
 * a transform — and our page wrappers use `animate-fade-up`, whose `both` fill
 * mode leaves an identity transform behind after the animation. An identity
 * matrix still establishes a containing block, so overlays were being sized and
 * positioned inside the page content instead of the viewport.
 */
function Portal({ children }: { children: ReactNode }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;
  return createPortal(children, document.body);
}

/** Bottom sheet — the phone-native way to present a short form. */
export function Sheet({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    // Always open at the top: a sheet that appears mid-scroll hides the first
    // field, so the user can't see what a validation error refers to.
    panel.current?.scrollTo({ top: 0 });
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
        {/*
        dvh, not vh: on Android and iOS the visual viewport shrinks when the
        keyboard opens, and static vh keeps the old height — which pushes the
        form's first fields off-screen while it still looks scrolled to the top.
      */}
        <div
          ref={panel}
          className="relative z-10 flex max-h-[88vh] max-h-[88dvh] w-full max-w-md animate-fade-up flex-col overflow-y-auto overscroll-contain rounded-t-3xl border-t border-white/10 bg-surface p-5 pb-[max(env(safe-area-inset-bottom),1.5rem)] sm:rounded-3xl sm:border"
        >
          <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/15 sm:hidden" />
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-extrabold tracking-tight">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Close"
              className="rounded-full p-2 text-slate hover:text-cream"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M18 6 6 18M6 6l12 12" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          {children}
        </div>
      </div>
    </Portal>
  );
}

export function ConfirmDialog({
  open,
  title,
  body,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  body: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return (
    <Portal>
      <div className="fixed inset-0 z-[70] flex items-center justify-center p-6">
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onCancel} />
        <div className="relative z-10 w-full max-w-sm animate-pop-in rounded-2xl border border-white/10 bg-surface p-5">
          <h3 className="text-base font-extrabold">{title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate">{body}</p>
          <div className="mt-5 flex gap-2">
            <button onClick={onCancel} className="ff-btn-secondary flex-1">
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className={destructive ? 'ff-btn-danger flex-1' : 'ff-btn-primary flex-1'}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </Portal>
  );
}
