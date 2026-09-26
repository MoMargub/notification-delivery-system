import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { QueryProvider } from '@/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'NotifyOps - Notification Delivery System',
  description: 'Schedule, deliver and monitor email and push notification campaigns.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <QueryProvider>
          <AppShell>{children}</AppShell>
        </QueryProvider>
      </body>
    </html>
  );
}
