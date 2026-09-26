import { AlertCircle, RotateCcw } from 'lucide-react';
import { Button } from './Button';

interface ErrorStateProps {
  title: string;
  error: unknown;
  onRetry?: () => void;
}

export function ErrorState({ title, error, onRetry }: ErrorStateProps) {
  return (
    <div role="alert" className="flex flex-col items-center rounded-xl border border-red-200 bg-red-50 px-6 py-12 text-center">
      <AlertCircle size={28} className="mb-3 text-red-600" />
      <h3 className="text-base font-semibold text-gray-900">{title}</h3>
      <p className="mt-1 max-w-md text-sm text-gray-600">
        {error instanceof Error ? error.message : 'Something went wrong. Please try again.'}
      </p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry} leftIcon={<RotateCcw size={14} />}>
          Retry
        </Button>
      )}
    </div>
  );
}
