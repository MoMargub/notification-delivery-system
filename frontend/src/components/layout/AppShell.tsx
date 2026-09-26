'use client';

import { useState, type ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppShell({ children }: { children: ReactNode }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar isOpen={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col lg:pl-64">
        <Header onMenuToggle={() => setMenuOpen((open) => !open)} />
        <main className="mx-auto w-full max-w-7xl flex-1 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </div>
  );
}
