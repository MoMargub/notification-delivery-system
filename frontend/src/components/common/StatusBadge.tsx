import { AlertCircle, CheckCircle2, Clock, Mail, RefreshCw, Smartphone } from 'lucide-react';
import type { Channel, CampaignStatus } from '@/types/campaign.types';
import type { NotificationStatus } from '@/types/notification.types';

const statuses = {
  PENDING: { label: 'Pending', Icon: Clock, style: 'border-amber-200 bg-amber-50 text-amber-700' },
  PROCESSING: { label: 'Processing', Icon: RefreshCw, style: 'border-blue-200 bg-blue-50 text-blue-700' },
  COMPLETED: { label: 'Completed', Icon: CheckCircle2, style: 'border-green-200 bg-green-50 text-green-700' },
  SENT: { label: 'Delivered', Icon: CheckCircle2, style: 'border-green-200 bg-green-50 text-green-700' },
  FAILED: { label: 'Failed', Icon: AlertCircle, style: 'border-red-200 bg-red-50 text-red-700' },
} as const;

export function StatusBadge({ status }: { status: CampaignStatus | NotificationStatus }) {
  const { label, Icon, style } = statuses[status];
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${style}`}>
      <Icon size={12} className={status === 'PROCESSING' ? 'animate-spin' : ''} aria-hidden />
      {label}
    </span>
  );
}

export function ChannelBadge({ channel }: { channel: Channel }) {
  const push = channel === 'PUSH';
  const Icon = push ? Smartphone : Mail;
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium ${
        push ? 'border-violet-200 bg-violet-50 text-violet-700' : 'border-gray-200 bg-gray-100 text-gray-700'
      }`}
    >
      <Icon size={12} aria-hidden />
      {push ? 'Push' : 'Email'}
    </span>
  );
}
