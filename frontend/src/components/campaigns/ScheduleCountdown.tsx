import { AlertTriangle, Timer } from 'lucide-react';
import { useHealth } from '@/hooks/useHealth';
import { useNow } from '@/hooks/useNow';
import type { CampaignStatus } from '@/types/campaign.types';

function formatDuration(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  const parts = [
    [Math.floor(s / 86400), 'd'],
    [Math.floor((s % 86400) / 3600), 'h'],
    [Math.floor((s % 3600) / 60), 'm'],
    [s % 60, 's'],
  ] as const;
  return parts
    .filter(([n], i) => n > 0 || i === 3)
    .slice(0, 3)
    .map(([n, unit]) => `${n}${unit}`)
    .join(' ');
}

/** Live "starts in …" line for a campaign that has not started yet. */
export function ScheduleCountdown({ scheduledAt, status }: { scheduledAt: string; status: CampaignStatus }) {
  const waiting = status === 'PENDING';
  const now = useNow(waiting);
  const { data: health } = useHealth(waiting);
  if (!waiting) return null;

  const remaining = new Date(scheduledAt).getTime() - now;
  if (remaining > 0) {
    return (
      <p className="mt-1 flex items-center gap-1 text-xs font-medium text-indigo-600">
        <Timer size={12} /> Starts in {formatDuration(remaining)}
      </p>
    );
  }
  return health?.checks.worker === 'down' ? (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-red-600">
      <AlertTriangle size={12} /> Due, but no worker is running. Start it with `npm run worker`
    </p>
  ) : (
    <p className="mt-1 flex items-center gap-1 text-xs font-medium text-amber-600">
      <Timer size={12} /> Due now, starting…
    </p>
  );
}
