import { useState } from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/common/Button';
import { ErrorState } from '@/components/common/ErrorState';
import { Pager } from '@/components/common/Pager';
import { inputClass } from '@/components/common/Field';
import { useUsers } from '@/hooks/useUsers';
import { formatNumber } from '@/lib/format';

const PAGE_SIZE = 10;

interface UserPickerProps {
  value: number[];
  onChange: (userIds: number[]) => void;
}

/** Server-paginated user list: only one page of users is ever held in the browser. */
export function UserPicker({ value, onChange }: UserPickerProps) {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const { data, isError, error, refetch } = useUsers({ search: search || undefined, page, limit: PAGE_SIZE });

  const selected = new Set(value);
  const toggle = (id: number) => onChange(selected.has(id) ? value.filter((v) => v !== id) : [...value, id]);
  const pageIds = data?.items.map((u) => u.id) ?? [];
  const allOnPageSelected = pageIds.length > 0 && pageIds.every((id) => selected.has(id));

  const togglePage = () =>
    onChange(allOnPageSelected ? value.filter((id) => !pageIds.includes(id)) : [...new Set([...value, ...pageIds])]);

  if (isError) return <ErrorState title="Failed to load users" error={error} onRetry={() => refetch()} />;

  return (
    <div className="rounded-lg border border-gray-200">
      <div className="flex flex-wrap items-center gap-3 border-b border-gray-200 p-3">
        <div className="relative min-w-52 flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" aria-hidden />
          <input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search users by name or email…"
            className={`${inputClass()} pl-9`}
            aria-label="Search users"
          />
        </div>
        <Button type="button" variant="outline" size="sm" onClick={togglePage} disabled={!data?.items.length}>
          {allOnPageSelected ? 'Deselect page' : 'Select page'}
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([])} disabled={!value.length}>
          Clear ({formatNumber(value.length)})
        </Button>
      </div>

      <ul className="divide-y divide-gray-100">
        {data?.items.map((user) => (
          <li key={user.id}>
            <label className="flex cursor-pointer items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={selected.has(user.id)}
                onChange={() => toggle(user.id)}
                className="size-4 accent-indigo-600"
              />
              <span className="text-sm font-medium text-gray-900">{user.name}</span>
              <span className="text-sm text-gray-500">{user.email}</span>
            </label>
          </li>
        ))}
        {data && data.items.length === 0 && <li className="px-3 py-6 text-center text-sm text-gray-500">No users found.</li>}
        {!data && <li className="px-3 py-6 text-center text-sm text-gray-500">Loading users…</li>}
      </ul>

      {data && (
        <Pager
          summary={`Page ${data.page} of ${formatNumber(data.totalPages)} · ${formatNumber(data.total)} users`}
          canPrev={page > 1}
          canNext={page < data.totalPages}
          onPrev={() => setPage((p) => p - 1)}
          onNext={() => setPage((p) => p + 1)}
        />
      )}
    </div>
  );
}
