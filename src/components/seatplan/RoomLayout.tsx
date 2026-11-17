'use client'

// Graphical exam-room layout (Session 81).
// Front wall (top) = board / invigilator desk. Columns left→right with their own bench counts.
// Door on one of 12 wall spots. Editable mode: click a dashed spot on any wall to move the door.
// Children (optional) replace the default bench drawing — the seat-plan map uses this to show students.

import type { ReactNode } from 'react'
import { DoorOpen } from 'lucide-react'

export const DOOR_POSITIONS = [
  'front-left', 'front-center', 'front-right', 'back-left', 'back-center', 'back-right',
  'left-front', 'left-middle', 'left-back', 'right-front', 'right-middle', 'right-back',
] as const
export type DoorPosition = (typeof DOOR_POSITIONS)[number]

export const doorLabel = (p: string) => {
  const [wall, place] = p.split('-')
  const W: Record<string, string> = { front: 'Front wall', back: 'Back wall', left: 'Left wall', right: 'Right wall' }
  const P: Record<string, string> = { left: 'left side', right: 'right side', center: 'centre', front: 'near front', middle: 'middle', back: 'near back' }
  return `${W[wall] || wall}, ${P[place] || place}`
}

/** Where a spot sits on the outline (percent along the wall). */
function spotStyle(p: string): React.CSSProperties {
  const [wall, place] = p.split('-')
  const along: Record<string, string> = { left: '16%', front: '18%', center: '50%', middle: '50%', right: '84%', back: '82%' }
  const a = along[place]
  switch (wall) {
    case 'front': return { top: 0, left: a, transform: 'translate(-50%, -50%)' }
    case 'back': return { bottom: 0, left: a, transform: 'translate(-50%, 50%)' }
    case 'left': return { left: 0, top: a, transform: 'translate(-50%, -50%)' }
    default: return { right: 0, top: a, transform: 'translate(50%, -50%)' }
  }
}

interface Props {
  columnBenches: number[]
  seatsPerBench: number
  door: string
  onDoorChange?: (p: DoorPosition) => void
  size?: 'sm' | 'md'
  children?: ReactNode
}

export function RoomLayout({ columnBenches, seatsPerBench, door, onDoorChange, size = 'md', children }: Props) {
  const small = size === 'sm'
  const seats = Math.max(1, Math.min(10, seatsPerBench || 1))
  return (
    <div className={`relative rounded-lg border-[3px] border-slate-600 bg-white ${small ? 'p-2.5 pt-3' : 'p-5 pt-6'}`}>
      {/* front: board + desk */}
      <div className={`mx-auto mb-3 flex items-center justify-center gap-2 rounded bg-slate-700 font-semibold uppercase tracking-wide text-white ${small ? 'w-3/4 py-0.5 text-[9px]' : 'w-2/3 py-1 text-xs'}`}>
        Front · Board{small ? '' : ' / Invigilator desk'}
      </div>

      {children ?? (
        <div className={`flex justify-center overflow-x-auto ${small ? 'gap-1.5' : 'gap-3'}`}>
          {columnBenches.map((n, c) => (
            <div key={c} className={`flex flex-col items-center ${small ? 'gap-0.5' : 'gap-1'}`}>
              {!small && <span className="text-[10px] font-semibold text-gray-500">C{c + 1} · {n}</span>}
              {Array.from({ length: Math.max(0, Math.min(60, n || 0)) }, (_, b) => (
                <div key={b} className={`flex rounded-sm border border-amber-700/60 bg-amber-100 ${small ? 'gap-px p-px' : 'gap-0.5 p-0.5'}`} title={`Column ${c + 1}, bench ${b + 1}`}>
                  {Array.from({ length: seats }, (_, s) => (
                    <span key={s} className={`rounded-[2px] bg-amber-500/70 ${small ? 'h-1 w-1.5' : 'h-2 w-3'}`} />
                  ))}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {!small && <p className="mt-2 text-center text-[10px] uppercase tracking-wide text-gray-400">Back</p>}

      {/* door spots on the walls */}
      {DOOR_POSITIONS.map((p) => {
        const active = p === door
        if (!onDoorChange && !active) return null
        const vertical = p.startsWith('left') || p.startsWith('right')
        const common = `absolute z-10 flex items-center justify-center rounded-sm ${vertical ? (small ? 'h-6 w-2' : 'h-10 w-4') : (small ? 'h-2 w-6' : 'h-4 w-10')}`
        return active ? (
          <span key={p} style={spotStyle(p)} className={`${common} bg-orange-600 text-white shadow ring-2 ring-white`} title={`Door: ${doorLabel(p)}`}>
            {!small && <DoorOpen className={vertical ? 'h-3 w-3' : 'h-3.5 w-3.5'} />}
          </span>
        ) : (
          <button key={p} type="button" style={spotStyle(p)} onClick={() => onDoorChange?.(p)} aria-label={`Put door: ${doorLabel(p)}`} title={doorLabel(p)}
            className={`${common} border-2 border-dashed border-orange-400 bg-orange-50 hover:bg-orange-200`} />
        )
      })}
      {onDoorChange && (
        <p className="mt-2 text-center text-xs text-gray-600">
          <span className="font-semibold text-orange-700">Door: {doorLabel(door)}</span> · click a dashed spot on any wall to move it
        </p>
      )}
    </div>
  )
}
