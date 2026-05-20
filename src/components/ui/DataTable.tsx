import { cn } from '@/lib/utils'
import { ChevronDown } from 'lucide-react'
import type { ReactNode } from 'react'

interface DataTableProps {
  columns: { key: string; label: string; sortable?: boolean }[]
  data: Record<string, unknown>[]
  onSort?: (key: string) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  loading?: boolean
  emptyMessage?: string
}

export function DataTable({
  columns,
  data,
  onSort,
  sortKey,
  sortDir,
  loading,
  emptyMessage = 'No data found',
}: DataTableProps) {
  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                  col.sortable && 'cursor-pointer select-none hover:bg-gray-100'
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {col.sortable && sortKey === col.key && (
                    <ChevronDown className={cn('h-3 w-3', sortDir === 'asc' && 'rotate-180')} />
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr key={i} className="hover:bg-gray-50">
                {columns.map((col) => (
                  <td key={col.key} className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                    {row[col.key] as ReactNode}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
