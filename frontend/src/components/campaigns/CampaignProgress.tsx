import type { ReactNode } from 'react';
import { AlertCircle, CheckCircle2, Clock, RefreshCw, Users } from 'lucide-react';
import { formatNumber } from '@/lib/format';
import type { CampaignProgress as Progress } from '@/types/campaign.types';

const SEGMENTS = [
  { key: 'completedCount', label: 'Completed', bar: 'bg-green-500' },
  { key: 'failedCount', label: 'Failed', bar: 'bg-red-500' },
  { key: 'processing', label: 'Processing', bar: 'bg-blue-500' },
] as const;

function Metric({ label, value, icon, tint }: { label: string; value: number; icon: ReactNode; tint: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-3">
      <span className={`rounded-md p-2 ${tint}`}>{icon}</span>
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className="text-lg font-semibold text-gray-900">{formatNumber(value)}</p>
      </div>
    </div>
  );
}

export function CampaignProgress({ progress }: { progress: Progress }) {
  const { totalRecipients: total, completedCount } = progress;
  const percent = (n: number) => (total ? (n / total) * 100 : 0);

  return (
    <section className="space-y-4 rounded-xl border border-gray-200 bg-white p-5 shadow-xs">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold text-gray-900">Delivery progress</h2>
        <span className="text-sm text-gray-600">
          <strong className="text-gray-900">{formatNumber(completedCount)}</strong> / {formatNumber(total)} completed
        </span>
      </div>

      <div
        className="flex h-3 overflow-hidden rounded-full bg-gray-100"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={total}
        aria-valuenow={completedCount}
      >
        {SEGMENTS.map(({ key, label, bar }) => (
          <div
            key={key}
            className={`${bar} transition-all duration-500`}
            style={{ width: `${percent(progress[key])}%` }}
            title={`${label}: ${formatNumber(progress[key])}`}
          />
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Metric label="Total recipients" value={total} icon={<Users size={16} />} tint="bg-gray-100 text-gray-600" />
        <Metric label="Pending" value={progress.pending} icon={<Clock size={16} />} tint="bg-amber-50 text-amber-600" />
        <Metric label="Processing" value={progress.processing} icon={<RefreshCw size={16} />} tint="bg-blue-50 text-blue-600" />
        <Metric label="Completed" value={completedCount} icon={<CheckCircle2 size={16} />} tint="bg-green-50 text-green-600" />
        <Metric label="Failed" value={progress.failedCount} icon={<AlertCircle size={16} />} tint="bg-red-50 text-red-600" />
      </div>
    </section>
  );
}
