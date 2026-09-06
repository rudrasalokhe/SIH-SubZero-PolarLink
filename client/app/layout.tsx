import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/Header';
import OfflineBanner from '@/components/OfflineBanner';

export const metadata: Metadata = {
  title: 'PolarLink Field Client | Expedition Logistics',
  description: 'Offline-First Polar Expedition Field Logistics & Emergency Response PWA',
  manifest: '/manifest.json',
  icons: {
    icon: '/icons/icon.svg',
    apple: '/icons/icon-192.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#0a101d',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="min-h-screen bg-polar-950 text-slate-100 flex flex-col font-sans selection:bg-polar-ice/20 selection:text-polar-ice"
        suppressHydrationWarning
      >
        <OfflineBanner />
        <Header />
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {children}
        </main>
        <footer className="border-t border-polar-800/80 bg-polar-950/80 text-polar-400 py-4 text-xs font-mono">
          <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
            <div>POLARLINK • STATION MASTER CLIENT V1.0 • ANTARCTICA SECTOR 4</div>
            <div className="text-slate-500">
              WA-SQLite + OPFS Offline Storage Active
            </div>
          </div>
        </footer>
      </body>
    </html>
  );
}
