'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { ScheduleCountdown } from '@/components/campaigns/ScheduleCountdown';
import { CampaignProgress } from '@/components/campaigns/CampaignProgress';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { LoadingState } from '@/components/common/LoadingState';
import { ChannelBadge, StatusBadge } from '@/components/common/StatusBadge';
import { useCampaign } from '@/hooks/useCampaign';
import { useCampaignProgress } from '@/hooks/useCampaignProgress';
import { useProcessCampaign } from '@/hooks/useProcessCampaign';
import { formatDateTime } from '@/lib/format';

export default function CampaignDetailsPage() {
  const { id } = useParams<{ id: string }>();
  const campaign = useCampaign(id);
  const progress = useCampaignProgress(id);
  const processCampaign = useProcessCampaign();

  if (campaign.isError) {
    return <ErrorState title="Failed to load campaign" error={campaign.error} onRetry={() => campaign.refetch()} />;
  }
  const c = campaign.data;
  if (!c) return <LoadingState rows={3} />;

  // The progress endpoint is polled, so its status is fresher than the cached campaign row.
  const status = progress.data?.status ?? c.status;
  const isRunning = status === 'PENDING' || status === 'PROCESSING';

  const audit = [
    ['Scheduled for', c.scheduledAt],
    ['Created', c.createdAt],
    ['Started', c.startedAt],
    ['Finished', c.completedAt],
  ] as const;

  return (
    <div className="space-y-6">
      <Link href="/campaigns" className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900">
        <ArrowLeft size={16} />
        Back to Campaigns
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{c.title}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <StatusBadge status={status} />
            <ChannelBadge channel={c.channel} />
            <span className="font-mono text-xs text-gray-400">#{c.id.slice(0, 8)}</span>
            {isRunning && <span className="text-xs text-gray-500">· live, refreshing every 2s</span>}
          </div>
        </div>
        {status === 'PENDING' && (
          <Button
            onClick={() => processCampaign.mutate(id)}
            isLoading={processCampaign.isPending}
            leftIcon={<Play size={14} />}
          >
            Process now
          </Button>
        )}
      </div>

      <ScheduleCountdown scheduledAt={c.scheduledAt} status={status} />

      {processCampaign.isError && <ErrorState title="Could not start campaign" error={processCampaign.error} />}

      <section className="rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
        <h2 className="text-sm font-semibold text-gray-900">Message</h2>
        <p className="mt-2 whitespace-pre-wrap rounded-lg bg-gray-50 p-3 text-sm text-gray-700">{c.message}</p>
      </section>

      {progress.isError ? (
        <ErrorState title="Failed to load progress" error={progress.error} onRetry={() => progress.refetch()} />
      ) : progress.data ? (
        <CampaignProgress progress={progress.data} />
      ) : (
        <LoadingState rows={2} />
      )}

      <dl className="grid grid-cols-2 gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs lg:grid-cols-4">
        {audit.map(([label, value]) => (
          <div key={label}>
            <dt className="text-xs text-gray-500">{label}</dt>
            <dd className="mt-0.5 text-sm font-medium text-gray-900">{formatDateTime(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
