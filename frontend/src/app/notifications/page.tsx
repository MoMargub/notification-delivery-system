'use client';

import { useState } from 'react';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { inputClass } from '@/components/common/Field';
import { LoadingState } from '@/components/common/LoadingState';
import { Pager } from '@/components/common/Pager';
import { NotificationItem } from '@/components/notifications/NotificationItem';
import { useHideNotification } from '@/hooks/useHideNotification';
import { useNotifications } from '@/hooks/useNotifications';
import type { Channel } from '@/types/campaign.types';
import type { NotificationStatus } from '@/types/notification.types';

const PAGE_SIZE = 10;

const STATUS_TABS: { label: string; value: NotificationStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Delivered', value: 'SENT' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Failed', value: 'FAILED' },
];

export default function NotificationsPage() {
  const [status, setStatus] = useState<NotificationStatus | ''>('');
  const [channel, setChannel] = useState<Channel | ''>('');
  const [userId, setUserId] = useState('');
  // Keyset pagination: the cursor of every page we have left, so "Previous" is a pop.
  const [cursors, setCursors] = useState<string[]>([]);

  const cursor = cursors.at(-1);
  const { data, isError, error, refetch } = useNotifications({
    userId: Number(userId) > 0 ? Number(userId) : undefined,
    status: status || undefined,
    channel: channel || undefined,
    cursor,
    limit: PAGE_SIZE,
  });
  const hideNotification = useHideNotification();

  const resetPaging = () => setCursors([]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Inbox</h1>
        <p className="mt-1 text-sm text-gray-500">Delivery status, retries and errors for every notification sent.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                resetPaging();
              }}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                status === tab.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <div className="w-40">
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as Channel | '');
              resetPaging();
            }}
            className={inputClass()}
            aria-label="Channel"
          >
            <option value="">All channels</option>
            <option value="EMAIL">Email</option>
            <option value="PUSH">Push</option>
          </select>
        </div>
        <div className="w-44">
          <input
            type="number"
            min={1}
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              resetPaging();
            }}
            placeholder="Filter by user ID"
            className={inputClass()}
            aria-label="Filter by user ID"
          />
        </div>
      </div>

      {isError ? (
        <ErrorState title="Could not load notifications" error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <LoadingState rows={4} />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No notifications"
          description="Nothing matches the current filters, or every matching notification has been hidden."
        />
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onHide={(id) => hideNotification.mutate(id)}
                isHiding={hideNotification.isPending && hideNotification.variables === notification.id}
              />
            ))}
          </div>
          <div className="rounded-xl border border-gray-200 bg-white">
            <Pager
              summary={`Page ${cursors.length + 1} · ${data.items.length} shown`}
              canPrev={cursors.length > 0}
              canNext={data.nextCursor !== null}
              onPrev={() => setCursors((c) => c.slice(0, -1))}
              onNext={() => data.nextCursor && setCursors((c) => [...c, data.nextCursor!])}
            />
          </div>
        </>
      )}

      {hideNotification.isError && <ErrorState title="Could not hide notification" error={hideNotification.error} />}
    </div>
  );
}
