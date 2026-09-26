import { Button } from './Button';

interface PagerProps {
  summary: string;
  canPrev: boolean;
  canNext: boolean;
  onPrev: () => void;
  onNext: () => void;
}

export function Pager({ summary, canPrev, canNext, onPrev, onNext }: PagerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-200 px-4 py-3">
      <span className="text-[13px] text-gray-500">{summary}</span>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onPrev} disabled={!canPrev}>
          Previous
        </Button>
        <Button variant="outline" size="sm" onClick={onNext} disabled={!canNext}>
          Next
        </Button>
      </div>
    </div>
  );
}
