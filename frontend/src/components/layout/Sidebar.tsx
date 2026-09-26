'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Bell, Inbox, Layers, PlusCircle, X } from 'lucide-react';

const NAV_ITEMS = [
  { href: '/campaigns', label: 'Campaigns', Icon: Layers },
  { href: '/campaigns/create', label: 'Create Campaign', Icon: PlusCircle },
  { href: '/notifications', label: 'Notifications', Icon: Inbox },
];

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const pathname = usePathname();
  // Campaign detail pages belong to "Campaigns"; only an exact match highlights "Create Campaign".
  const isActive = (href: string) =>
    href === '/campaigns' ? pathname.startsWith('/campaigns') && pathname !== '/campaigns/create' : pathname === href;

  return (
    <>
      {isOpen && <div className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden" onClick={onClose} aria-hidden />}
      <aside
        aria-label="Sidebar navigation"
        className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-gray-200 bg-white transition-transform lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-16 items-center justify-between border-b border-gray-200 px-5">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-indigo-600 text-white">
              <Bell size={18} />
            </div>
            <div className="leading-tight">
              <p className="font-semibold text-gray-900">NotifyOps</p>
              <p className="text-xs text-gray-500">Notification delivery</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-500 lg:hidden" aria-label="Close navigation">
            <X size={20} />
          </button>
        </div>

        <nav className="flex flex-col gap-1 p-3">
          <span className="px-3 pb-1 pt-2 text-[11px] font-semibold tracking-wider text-gray-400">CORE MANAGEMENT</span>
          {NAV_ITEMS.map(({ href, label, Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium ${
                isActive(href) ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}
