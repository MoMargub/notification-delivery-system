import type { ReactNode } from 'react';
import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyState({ title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-gray-300 bg-white px-6 py-14 text-center">
      <div className="mb-4 flex size-14 items-center justify-center rounded-full bg-gray-100 text-gray-400">
        <Inbox size={28} />
      </div>
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-500">{description}</p>
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
