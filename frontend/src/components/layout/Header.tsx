'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { Menu, Plus, RotateCcw } from 'lucide-react';
import { buttonStyles } from '@/components/common/Button';

function breadcrumbFor(pathname: string): [section: string, page: string] {
  if (pathname === '/campaigns/create') return ['Campaigns', 'Create New Campaign'];
  if (pathname.startsWith('/campaigns/')) return ['Campaigns', 'Campaign Details'];
  if (pathname === '/notifications') return ['Delivery Logs', 'Notification Inbox'];
  return ['Pages', 'Notification Campaigns'];
}

export function Header({ onMenuToggle }: { onMenuToggle: () => void }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching() > 0;
  const [section, page] = breadcrumbFor(pathname);

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-gray-200 bg-white/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onMenuToggle} className="text-gray-600 lg:hidden" aria-label="Open navigation">
          <Menu size={20} />
        </button>
        <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm">
          <span className="hidden text-gray-500 sm:inline">{section}</span>
          <span className="hidden text-gray-300 sm:inline">/</span>
          <span className="font-semibold text-gray-900">{page}</span>
        </nav>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => queryClient.invalidateQueries()}
          className="rounded-lg p-2 text-gray-500 hover:bg-gray-100"
          aria-label="Refresh data"
          title="Refresh data"
        >
          <RotateCcw size={16} className={isFetching ? 'animate-spin' : ''} />
        </button>
        {pathname !== '/campaigns/create' && (
          <Link href="/campaigns/create" className={buttonStyles('primary', 'sm')}>
            <Plus size={16} />
            Create Campaign
          </Link>
        )}
      </div>
    </header>
  );
}