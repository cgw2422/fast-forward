'use client';

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

type Toast = { id: number; message: string; tone: 'success' | 'error' | 'info' };
type ToastContextValue = { toast: (message: string, tone?: Toast['tone']) => void };

const ToastContext = createContext<ToastContextValue>({ toast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const toast = useCallback((message: string, tone: Toast['tone'] = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, tone }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2800);
  }, []);

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed inset-x-0 bottom-24 z-[60] flex flex-col items-center gap-2 px-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`animate-pop-in rounded-full px-4 py-2.5 text-sm font-semibold shadow-lg ${
              t.tone === 'success'
                ? 'bg-lime text-midnight'
                : t.tone === 'error'
                  ? 'bg-coral text-white'
                  : 'bg-raised text-cream'
            }`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
