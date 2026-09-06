export const dynamic = 'force-static';

export default function OfflinePage() {
  return (
    <main className="flex min-h-[100dvh] flex-col items-center justify-center gap-4 px-8 text-center">
      <div className="text-4xl">⏩</div>
      <h1 className="text-2xl font-extrabold tracking-tight">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-slate">
        Fast Forward needs a connection to sync your day. Everything you already logged is safe.
      </p>
    </main>
  );
}
