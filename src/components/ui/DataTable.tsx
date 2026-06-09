import { useState, useCallback, useRef } from 'react'
import { cn } from '@/lib/utils'
import { ChevronDown, GripVertical } from 'lucide-react'
import type { ReactNode } from 'react'

interface Column {
  key: string
  label: string
  sortable?: boolean
}

interface DataTableProps {
  columns: Column[]
  data: Record<string, unknown>[]
  onColumnReorder?: (columns: Column[]) => void
  onRowReorder?: (data: Record<string, unknown>[]) => void
  onSort?: (key: string) => void
  sortKey?: string
  sortDir?: 'asc' | 'desc'
  loading?: boolean
  emptyMessage?: string
  rowKey?: string
}

export function DataTable({
  columns: initialColumns,
  data,
  onColumnReorder,
  onRowReorder,
  onSort,
  sortKey,
  sortDir,
  loading,
  emptyMessage = 'No data found',
  rowKey = 'id',
}: DataTableProps) {
  const [columns, setColumns] = useState(initialColumns)
  const [dragColIndex, setDragColIndex] = useState<number | null>(null)
  const [dragRowIndex, setDragRowIndex] = useState<number | null>(null)
  const dragSourceIndex = useRef<number | null>(null)
  const dragOverColIndex = useRef<number | null>(null)
  const dragOverRowIndex = useRef<number | null>(null)

  const handleColDragStart = useCallback((index: number) => {
    setDragColIndex(index)
  }, [])

  const handleColDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    dragOverColIndex.current = index
  }, [])

  const handleColDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    if (dragColIndex === null || dragOverColIndex.current === null) return
    if (dragColIndex === dragOverColIndex.current) {
      setDragColIndex(null)
      dragOverColIndex.current = null
      return
    }
    const next = [...columns]
    const [moved] = next.splice(dragColIndex, 1)
    next.splice(dragOverColIndex.current, 0, moved)
    setColumns(next)
    onColumnReorder?.(next)
    setDragColIndex(null)
    dragOverColIndex.current = null
  }, [dragColIndex, columns, onColumnReorder])

  const handleRowDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    dragSourceIndex.current = index
    setDragRowIndex(index)
  }, [])

  const handleRowDragOver = useCallback((e: React.DragEvent, index: number) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    dragOverRowIndex.current = index
  }, [])

  const handleRowDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    const fromIndex = dragSourceIndex.current
    const toIndex = dragOverRowIndex.current
    if (fromIndex === null || toIndex === null) return
    if (fromIndex === toIndex) {
      setDragRowIndex(null)
      dragSourceIndex.current = null
      dragOverRowIndex.current = null
      return
    }
    const next = [...data]
    const [moved] = next.splice(fromIndex, 1)
    next.splice(toIndex, 0, moved)
    onRowReorder?.(next)
    setDragRowIndex(null)
    dragSourceIndex.current = null
    dragOverRowIndex.current = null
  }, [data, onRowReorder])

  return (
    <div className="overflow-x-auto rounded-lg border border-gray-200">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {onRowReorder && <th className="w-8 px-2 py-3" />}
            {columns.map((col, i) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500',
                  col.sortable && 'cursor-pointer select-none hover:bg-gray-100',
                  onColumnReorder && 'cursor-grab'
                )}
                onClick={() => col.sortable && onSort?.(col.key)}
                draggable={!!onColumnReorder}
                onDragStart={() => handleColDragStart(i)}
                onDragOver={(e) => handleColDragOver(e, i)}
                onDrop={handleColDrop}
                onDragEnd={() => setDragColIndex(null)}
              >
                <span className="inline-flex items-center gap-1">
                  {onColumnReorder && <GripVertical className="h-3 w-3 text-gray-300" />}
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
              <td colSpan={columns.length + (onRowReorder ? 1 : 0)} className="px-4 py-8 text-center text-sm text-gray-500">
                Loading...
              </td>
            </tr>
          ) : data.length === 0 ? (
            <tr>
              <td colSpan={columns.length + (onRowReorder ? 1 : 0)} className="px-4 py-8 text-center text-sm text-gray-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, i) => (
              <tr
                key={String(row[rowKey] ?? i)}
                className={cn('hover:bg-gray-50', dragRowIndex === i && 'opacity-50')}
                onDragOver={(e) => handleRowDragOver(e, i)}
                onDrop={handleRowDrop}
              >
                {onRowReorder && (
                  <td
                    className="cursor-grab px-2 py-3 text-gray-300"
                    draggable={true}
                    onDragStart={(e) => handleRowDragStart(e, i)}
                    onDragEnd={() => { setDragRowIndex(null); dragSourceIndex.current = null }}
                  >
                    <GripVertical className="h-4 w-4" />
                  </td>
                )}
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
