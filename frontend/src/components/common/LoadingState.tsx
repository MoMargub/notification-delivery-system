export function LoadingState({ rows = 5 }: { rows?: number }) {
  return (
    <div className="divide-y divide-gray-100 rounded-xl border border-gray-200 bg-white" aria-busy aria-label="Loading">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-4 p-4">
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-1/3 rounded bg-gray-200" />
            <div className="h-3 w-2/3 rounded bg-gray-100" />
          </div>
          <div className="h-6 w-20 rounded-full bg-gray-200" />
        </div>
      ))}
    </div>
  );
}
