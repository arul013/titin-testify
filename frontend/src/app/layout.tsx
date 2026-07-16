import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../features/auth/hooks/useAuth';

export const metadata: Metadata = {
  title: 'Titin Testify',
  description: 'Aplikasi Computer Based Test (CBT) dengan Fitur Anti-Cheat Terintegrasi',
  icons: {
    icon: [
      { url: '/icon-32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icon-192.png?v=2', sizes: '192x192', type: 'image/png' },
      { url: '/icon.svg?v=2', type: 'image/svg+xml' },
    ],
    shortcut: '/icon-32.png?v=2',
    apple: '/icon-192.png?v=2',
  },
};

import { Toaster } from '../components/ui/toast';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id">
      <body>
        <AuthProvider>
          <div className="animated-bg" />
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
