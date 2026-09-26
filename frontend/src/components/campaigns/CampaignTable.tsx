import Link from 'next/link';
import { Play } from 'lucide-react';
import { ChannelBadge, StatusBadge } from '@/components/common/StatusBadge';
import { ScheduleCountdown } from './ScheduleCountdown';
import { formatDateTime, formatNumber } from '@/lib/format';
import type { Campaign } from '@/types/campaign.types';

const HEADERS = ['Campaign', 'Channel', 'Recipients', 'Scheduled', 'Created', 'Status', 'Actions'];

interface CampaignTableProps {
  campaigns: Campaign[];
  onProcess: (campaign: Campaign) => void;
  processingId?: string;
}

export function CampaignTable({ campaigns, onProcess, processingId }: CampaignTableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead className="border-b border-gray-200 bg-gray-50 text-xs font-semibold uppercase tracking-wide text-gray-500">
          <tr>
            {HEADERS.map((header) => (
              <th key={header} className="px-4 py-3">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {campaigns.map((campaign) => (
            <tr key={campaign.id} className="hover:bg-gray-50/60">
              <td className="px-4 py-3.5">
                <p className="font-semibold text-gray-900">{campaign.title}</p>
                <p className="font-mono text-xs text-gray-400">#{campaign.id.slice(0, 8)}</p>
              </td>
              <td className="px-4 py-3.5">
                <ChannelBadge channel={campaign.channel} />
              </td>
              <td className="px-4 py-3.5 font-medium">{formatNumber(campaign.totalRecipients)}</td>
              <td className="px-4 py-3.5 text-gray-600">
                {formatDateTime(campaign.scheduledAt)}
                <ScheduleCountdown scheduledAt={campaign.scheduledAt} status={campaign.status} />
              </td>
              <td className="px-4 py-3.5 text-gray-600">{formatDateTime(campaign.createdAt)}</td>
              <td className="px-4 py-3.5">
                <StatusBadge status={campaign.status} />
              </td>
              <td className="px-4 py-3.5">
                <div className="flex items-center gap-2">
                  <Link
                    href={`/campaigns/${campaign.id}`}
                    className="rounded-md border border-gray-300 bg-white px-2.5 py-1 text-[13px] font-medium text-gray-700 hover:bg-gray-50"
                  >
                    View Details
                  </Link>
                  {campaign.status === 'PENDING' && (
                    <button
                      type="button"
                      onClick={() => onProcess(campaign)}
                      disabled={processingId === campaign.id}
                      className="rounded-md bg-indigo-50 p-1.5 text-indigo-700 hover:bg-indigo-100 disabled:opacity-60"
                      title="Process campaign now"
                      aria-label={`Process ${campaign.title} now`}
                    >
                      <Play size={14} />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
