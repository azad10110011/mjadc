// Fee due status (Session 100): dropdown options + small badges shared by mark entry, forms and due rules.

export const DUE_FILTER_OPTIONS = [
  { value: 'all', label: 'All students' },
  { value: 'exam_paid', label: 'Exam fee paid' },
  { value: 'tuition_paid', label: 'Tuition fee clear (no due)' },
  { value: 'all_paid', label: 'All dues paid' },
  { value: 'exam_due', label: 'Exam fee due' },
  { value: 'tuition_due', label: 'Tuition fee due' },
  { value: 'any_due', label: 'Any due' },
]
export const dueFilterLabel = (v: string) => DUE_FILTER_OPTIONS.find((o) => o.value === v)?.label || v

export interface DueStatus {
  exam_fee: number; exam_paid_amount: number; exam_due: number | null; exam_paid: boolean
  tuition_due: number; tuition_clear: boolean; all_clear: boolean
}

const tk = (n: number) => `৳${Math.round(n).toLocaleString('en-US')}`

/** "Exam fee due ৳500" / "Tuition due ৳2,100" / "Paid" chips. */
export function DueBadges({ dues, compact = false }: { dues?: DueStatus | null; compact?: boolean }) {
  if (!dues) return null
  if (dues.all_clear) return <span className="ml-1 rounded bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-800">{compact ? '✓' : 'Paid'}</span>
  return (
    <>
      {!dues.exam_paid && <span className="ml-1 rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800" title="Exam fee not paid">Exam fee due{dues.exam_due ? ` ${tk(dues.exam_due)}` : ''}</span>}
      {!dues.tuition_clear && <span className="ml-1 rounded bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700" title="Outstanding tuition / other fees">Tuition due {tk(dues.tuition_due)}</span>}
    </>
  )
}
