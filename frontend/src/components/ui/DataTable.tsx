import type { ReactNode } from 'react';
import { EmptyState } from './EmptyState';
import { Skeleton } from './EmptyState';

export interface Column<T> {
  key: string;
  header: string;
  render: (row: T) => ReactNode;
  className?: string;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyTitle?: string;
  emptyDescription?: string;
  keyExtractor: (row: T) => string;
  onRowClick?: (row: T) => void;
}

export function DataTable<T>({
  columns,
  data,
  loading,
  emptyTitle = 'No records found',
  emptyDescription = 'There are no items matching the current filter criteria.',
  keyExtractor,
  onRowClick,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div className="border border-granite rounded bg-white overflow-hidden">
        <div className="p-4 space-y-3">
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="w-full overflow-x-auto border border-granite rounded bg-white shadow-sm font-body">
      <table className="w-full text-left text-sm border-collapse">
        <thead className="bg-bone-deep border-b border-granite font-mono text-label uppercase text-clay-deep">
          <tr>
            {columns.map((col) => (
              <th key={col.key} scope="col" className={`px-4 py-3 font-semibold ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-granite-soft">
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              onClick={() => onRowClick && onRowClick(row)}
              className={`transition hover:bg-bone/60 ${onRowClick ? 'cursor-pointer' : ''}`}
            >
              {columns.map((col) => (
                <td key={col.key} className={`px-4 py-3.5 align-middle text-ink-soft ${col.className || ''}`}>
                  {col.render(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
