import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';
import { ServiceWorkerRegistrar } from '@/components/ServiceWorkerRegistrar';

export const metadata: Metadata = {
  title: 'Fast Forward',
  description: 'Small choices. Kept promises. More life.',
  applicationName: 'Fast Forward',
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Fast Forward' },
  icons: {
    icon: [
      { url: '/icons/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/favicon.svg', type: 'image/svg+xml' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: '#101828',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-[100dvh] bg-midnight font-sans antialiased">
        <ToastProvider>
          <ServiceWorkerRegistrar />
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
