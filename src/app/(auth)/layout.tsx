export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-[100dvh] flex-col safe-top">{children}</div>;
}
