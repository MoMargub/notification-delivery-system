'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import { AlertCircle, CheckCircle2, Clock, Layers, Plus, RefreshCw } from 'lucide-react';
import { CampaignTable } from '@/components/campaigns/CampaignTable';
import { buttonStyles } from '@/components/common/Button';
import { EmptyState } from '@/components/common/EmptyState';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { Pager } from '@/components/common/Pager';
import { useCampaigns } from '@/hooks/useCampaigns';
import { useProcessCampaign } from '@/hooks/useProcessCampaign';
import { formatNumber } from '@/lib/format';
import type { CampaignStatus, Channel } from '@/types/campaign.types';

const PAGE_SIZE = 10;

const STATUS_TABS: { label: string; value: CampaignStatus | '' }[] = [
  { label: 'All', value: '' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'Processing', value: 'PROCESSING' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Failed', value: 'FAILED' },
];

function StatCard({ label, value, icon, tint }: { label: string; value: number; icon: ReactNode; tint: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold tracking-wide text-gray-500">{label}</span>
        <span className={`rounded-md p-1.5 ${tint}`}>{icon}</span>
      </div>
      <p className="mt-2 text-2xl font-bold text-gray-900">{formatNumber(value)}</p>
    </div>
  );
}

export default function CampaignsPage() {
  const [status, setStatus] = useState<CampaignStatus | ''>('');
  const [channel, setChannel] = useState<Channel | ''>('');
  const [page, setPage] = useState(1);

  const { data, isError, error, refetch } = useCampaigns({
    status: status || undefined,
    channel: channel || undefined,
    page,
    limit: PAGE_SIZE,
  });
  const processCampaign = useProcessCampaign();

  const counts = data?.statusCounts;
  const total = counts ? Object.values(counts).reduce((sum, n) => sum + n, 0) : 0;
  const isFiltered = Boolean(status || channel);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Notification Campaigns</h1>
        <p className="mt-1 text-sm text-gray-500">
          Create, schedule and monitor email and push notification campaigns.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        <StatCard label="TOTAL" value={total} icon={<Layers size={16} />} tint="bg-indigo-50 text-indigo-600" />
        <StatCard label="PENDING" value={counts?.PENDING ?? 0} icon={<Clock size={16} />} tint="bg-amber-50 text-amber-600" />
        <StatCard label="PROCESSING" value={counts?.PROCESSING ?? 0} icon={<RefreshCw size={16} />} tint="bg-blue-50 text-blue-600" />
        <StatCard label="COMPLETED" value={counts?.COMPLETED ?? 0} icon={<CheckCircle2 size={16} />} tint="bg-green-50 text-green-600" />
        <StatCard label="FAILED" value={counts?.FAILED ?? 0} icon={<AlertCircle size={16} />} tint="bg-red-50 text-red-600" />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-1 rounded-lg border border-gray-200 bg-white p-1">
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.label}
              type="button"
              onClick={() => {
                setStatus(tab.value);
                setPage(1);
              }}
              className={`rounded-md px-3 py-1.5 text-[13px] font-medium ${
                status === tab.value ? 'bg-indigo-50 text-indigo-700' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <label className="flex items-center gap-2 text-[13px] text-gray-600">
          Channel:
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as Channel | '');
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All Channels</option>
            <option value="EMAIL">Email</option>
            <option value="PUSH">Push</option>
          </select>
        </label>
      </div>

      {isError ? (
        <ErrorState title="Failed to load campaigns" error={error} onRetry={() => refetch()} />
      ) : !data ? (
        <LoadingState />
      ) : data.items.length === 0 ? (
        <EmptyState
          title="No campaigns found"
          description={
            isFiltered
              ? 'No campaigns match the current filters. Try resetting them.'
              : 'Create your first campaign to start delivering notifications.'
          }
          action={
            <Link href="/campaigns/create" className={buttonStyles()}>
              <Plus size={16} />
              Create Campaign
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xs">
          <CampaignTable
            campaigns={data.items}
            onProcess={(campaign) => processCampaign.mutate(campaign.id)}
            processingId={processCampaign.isPending ? processCampaign.variables : undefined}
          />
          <Pager
            summary={`Page ${data.page} of ${data.totalPages} · ${formatNumber(data.total)} campaigns`}
            canPrev={page > 1}
            canNext={page < data.totalPages}
            onPrev={() => setPage((p) => p - 1)}
            onNext={() => setPage((p) => p + 1)}
          />
        </div>
      )}

      {processCampaign.isError && <ErrorState title="Could not start campaign" error={processCampaign.error} />}
    </div>
  );
}
