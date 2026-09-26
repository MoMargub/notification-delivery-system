import { AlertTriangle, EyeOff, User } from 'lucide-react';
import { ChannelBadge, StatusBadge } from '@/components/common/StatusBadge';
import { formatDateTime } from '@/lib/format';
import type { Notification } from '@/types/notification.types';

interface NotificationItemProps {
  notification: Notification;
  onHide: (id: number) => void;
  isHiding: boolean;
}

export function NotificationItem({ notification: n, onHide, isHiding }: NotificationItemProps) {
  return (
    <article className="space-y-3 rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex size-8 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
            <User size={14} />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-gray-900">{n.userName}</p>
            <p className="text-xs text-gray-500">
              {n.userEmail} · ID {n.userId}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <ChannelBadge channel={n.channel} />
          <StatusBadge status={n.status} />
        </div>
      </div>

      <div>
        <p className="text-sm text-gray-700">{n.message}</p>
        <p className="mt-1 text-xs text-gray-400">Campaign: {n.campaignTitle}</p>
      </div>

      {n.lastError && (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 p-2.5 text-xs text-red-700">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" />
          {n.lastError}
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 pt-3">
        <p className="text-xs text-gray-500">
          Created <strong className="font-medium text-gray-700">{formatDateTime(n.createdAt)}</strong> · Processed{' '}
          <strong className="font-medium text-gray-700">{formatDateTime(n.processedAt)}</strong> · Retries{' '}
          <strong className="font-medium text-gray-700">{n.retryCount}</strong>
        </p>
        <button
          type="button"
          onClick={() => onHide(n.id)}
          disabled={isHiding}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 disabled:opacity-60"
          title="Hide from the inbox (delivery history is kept)"
        >
          <EyeOff size={14} />
          Hide
        </button>
      </div>
    </article>
  );
}
