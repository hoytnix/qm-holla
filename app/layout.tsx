import type { Metadata, Viewport } from 'next';
import './globals.css';
import { SettingsProvider } from '@/lib/settings/settings-context';
import { LlmSetupModal } from '@/components/settings/LlmSetupModal';
import { CompanySetupModal } from '@/components/onboarding/CompanySetupModal';
import { ThemeSelectionModal } from '@/components/settings/ThemeSelectionModal';

export const metadata: Metadata = {
  title: 'Quarkmeme - Local-First Multi-Agent Autonomous Canvas',
  description: 'Autonomous multi-agent canvas powered by client-side SQLite WASM with OPFS storage.',
  manifest: '/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Quarkmeme',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30">
        <SettingsProvider>
          {children}
          <LlmSetupModal />
          <CompanySetupModal />
          <ThemeSelectionModal />
        </SettingsProvider>
      </body>
    </html>
  );
}
