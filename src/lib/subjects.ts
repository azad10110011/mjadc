// Subject names (Session 124). "Information and Communications Technology" is the official name of ICT;
// older spellings ("ICT", "Information and Communication Technology", "… & …") mean the same subject.

export const ICT_SUBJECT = 'Information and Communications Technology'

/** Every student takes these. Stored with their official names. */
export const COMPULSORY_SUBJECTS = ['Bangla', 'English', ICT_SUBJECT]

const ICT_SPELLINGS = [
  'ict',
  'information and communication technology',
  'information & communication technology',
  'information & communications technology',
  ICT_SUBJECT.toLowerCase(),
]

export function isIct(name: string | null | undefined): boolean {
  return ICT_SPELLINGS.includes(String(name ?? '').trim().toLowerCase().replace(/\s+/g, ' '))
}

/** The official spelling (only ICT has variants today). Fixes both halves of "Subject - Paper". */
export function canonicalSubject(name: string): string {
  if (name.includes(' - ')) return name.split(' - ').map(canonicalSubject).join(' - ')
  return isIct(name) ? ICT_SUBJECT : name
}

/** Is this one of the compulsory subjects (any spelling)? */
export function isCompulsorySubject(name: string | null | undefined): boolean {
  const n = canonicalSubject(String(name ?? '').trim()).toLowerCase()
  return COMPULSORY_SUBJECTS.some((c) => c.toLowerCase() === n)
}
