// Quick attendance entry (Session 79).
// Student IDs look like 27 3 005 → <class/session prefix><group digit><3-digit serial>
//   group digit: 1 = Science, 2 = Business Studies, 3 = Humanities
// Typed tokens (separated by commas, spaces, semicolons or new lines):
//   "5"      → Humanities serial 5   (…3005)
//   "b7"/"B7"→ Business serial 7     (…2007)
//   "s3"/"S3"→ Science serial 3      (…1003)
//   "s1-5"   → Science serials 1..5 (ranges work for every group; "b2-b6" also accepted)
//   "273005" → that exact student ID (4+ digits = matched against the end of the ID)
// Matching is done against the loaded class list, so the year/class prefix never has to be typed.

export interface QuickStudent {
  id: number
  student_id: string
  name: string
}

export interface QuickEntryResult {
  matched: QuickStudent[]
  notFound: string[]
  invalid: string[]
}

const GROUP_DIGIT: Record<string, string> = { s: '1', b: '2', '': '3' }
export const GROUP_LABEL: Record<string, string> = { '1': 'Science', '2': 'Business', '3': 'Humanities' }

/** "4" + "5" → "4005"-style key = group digit + 3-digit serial (the last 4 characters of an ID). */
const key = (groupDigit: string, serial: number) => groupDigit + String(serial).padStart(3, '0')

export function parseQuickEntry(text: string, students: QuickStudent[]): QuickEntryResult {
  const byKey = new Map<string, QuickStudent>()
  for (const s of students) byKey.set(String(s.student_id).slice(-4), s)

  const matched = new Map<number, QuickStudent>()
  const notFound: string[] = []
  const invalid: string[] = []

  const tokens = text
    .replace(/\s*-\s*/g, '-') // "s1 - 5" → "s1-5"
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter(Boolean)

  for (const raw of tokens) {
    const t = raw.toLowerCase()

    // exact / long ID: 4+ digits → match the end of a student ID
    if (/^\d{4,}$/.test(t)) {
      const s = students.find((x) => String(x.student_id) === t) ?? students.find((x) => String(x.student_id).endsWith(t))
      if (s) matched.set(s.id, s)
      else notFound.push(raw)
      continue
    }

    // single:  [s|b]N      range: [s|b]N-[s|b]?M
    const m = /^([sb]?)(\d{1,3})(?:-([sb]?)(\d{1,3}))?$/.exec(t)
    if (!m) { invalid.push(raw); continue }
    const [, g1, a, g2, b] = m
    if (b !== undefined && g2 && g2 !== g1) { invalid.push(raw); continue } // "s1-b5" makes no sense
    const g = GROUP_DIGIT[g1]
    const from = Number(a)
    const to = b !== undefined ? Number(b) : from
    if (from < 1 || to < from || to - from > 500) { invalid.push(raw); continue }

    const missing: number[] = []
    for (let n = from; n <= to; n++) {
      const s = byKey.get(key(g, n))
      if (s) matched.set(s.id, s)
      else missing.push(n)
    }
    if (missing.length) {
      const prefix = g1 ? g1.toUpperCase() : ''
      notFound.push(missing.length === to - from + 1 && from !== to ? raw : missing.map((n) => prefix + n).join(', '))
    }
  }

  return { matched: [...matched.values()], notFound, invalid }
}
