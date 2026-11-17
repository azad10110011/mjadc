'use client'

// Shared Transcript generator (Admin + Exam Controller panels).
// Admit-card styled A4 sheet: college logo, navy theme, photo, signed QR that
// opens /verify/transcript/ — what the scanner sees depends on whether admin
// switched online verification ON for that student (Transcript QR Verify menu).

import { useEffect, useState } from 'react'
import Link from 'next/link'
import QRCode from 'qrcode'
import { PanelLayout } from '@/components/layout'
import type { PanelRole } from '@/components/layout/PanelLayout'
import { Button, Select, Input, Card, CardContent } from '@/components/ui'
import { useExamNames, useGroupOptions } from '@/lib/catalog'
import { api, UPLOAD_BASE } from '@/lib/api'
import { photoUrl } from '@/lib/photo'
import { Printer, ShieldCheck } from 'lucide-react'
import { DEFAULT_TRANSCRIPT_CONFIG, infoRows, useTranscriptConfig, type TranscriptConfig } from './transcriptConfig'
import { TranscriptSettings } from './TranscriptSettings'

/** A part mark: number, 'A' = absent in that part, null = subject has no such part. */
const ALL_GROUPS = [{ value: '', label: 'All Groups' }]
export type PartMark = number | 'A' | null

export interface TranscriptSubjectRow {
  subject: string
  code?: string
  /** absent in every part of this subject */
  absent?: boolean
  parts?: { cq: PartMark; mcq: PartMark; practical: PartMark }
  total: number
  grade: string
  gpa: number
  status?: string
  is_optional?: boolean
  paper_count?: number
}

export interface TranscriptData {
  student_id: string
  name: string
  father_name: string
  mother_name: string
  date_of_birth?: string
  registration_no?: string
  photo_path?: string | null
  class: string
  group: string | null
  exam_name: string
  year: string
  academic_session: string
  /** HSC batch year (students.academic_session column), Session 84 */
  hsc_batch?: string
  class_roll?: string
  /** custom entry field values by label, e.g. { "Session": "2025-26", "Name (Bangla)": "…" } */
  custom?: Record<string, string>
  student_type: string
  published_at: string | null
  subjects: TranscriptSubjectRow[]
  overall_gpa: number
  overall_grade: string
  gpa_without_optional: number
  optional_gp_above_2: number
  total_subjects: number
  /** merit position in this exam (whole class); null = failed / no position */
  position?: number | null
  exam_id?: number
  verify_token?: string
  verify_enabled?: boolean
}

export const COLLEGE_NAME = 'Miah Jinnah Alam Degree College'
export const COLLEGE_ADDRESS = 'Garaganj, Shailkupa, Jhenaidah'

export const GRADE_SCALE: [string, string, string][] = [
  ['80 – 100', 'A+', '5.00'],
  ['70 – 79', 'A', '4.00'],
  ['60 – 69', 'A-', '3.50'],
  ['50 – 59', 'B', '3.00'],
  ['40 – 49', 'C', '2.00'],
  ['33 – 39', 'D', '1.00'],
  ['0 – 32', 'F', '0.00'],
]

/** Display a part mark: '–' when the subject has no such part. */
export function partText(v: PartMark | undefined): string {
  if (v === null || v === undefined) return '–'
  if (v === 'A') return 'A'
  return Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Display a subject total: 'A' when absent, otherwise 3 digits (e.g. 072). */
export function totalText(s: TranscriptSubjectRow): string {
  // Session 84: plain number (was zero-padded, e.g. 072)
  return s.absent || s.grade === 'Absent' ? 'A' : String(Math.round(s.total))
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return 'Not published yet'
  const d = new Date(dateStr)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function transcriptVerifyUrl(t: TranscriptData): string | null {
  if (typeof window === 'undefined' || !t.exam_id || !t.verify_token) return null
  const q = new URLSearchParams({ id: t.student_id, exam: String(t.exam_id), t: t.verify_token })
  // Printed QR codes must always point at the public website (never localhost / a non-www alias),
  // so the address comes from NEXT_PUBLIC_SITE_URL in production builds.
  const site = (process.env.NEXT_PUBLIC_SITE_URL || window.location.origin).replace(/\/+$/, '')
  return `${site}/verify/transcript/?${q.toString()}`
}

/** College logo from public settings (works for every panel), fallback /logo.png. */
export function useCollegeLogo(): string {
  const [logoSrc, setLogoSrc] = useState('')
  useEffect(() => {
    api
      .get<{ data?: { setting_value?: string } }>('/settings/college_logo')
      .then((res) => {
        const v = res.data?.setting_value
        setLogoSrc(v ? `${UPLOAD_BASE}/${v.replace(/^\/+/, '')}` : '/logo.png')
      })
      .catch(() => setLogoSrc('/logo.png'))
  }, [])
  return logoSrc
}

interface Props {
  role: Extract<PanelRole, 'admin' | 'exam_controller'>
  title: string
}

export function TranscriptGenerator({ role, title }: Props) {
  const EXAM_NAMES = useExamNames()
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')
  const [studentId, setStudentId] = useState('')
  const [group, setGroup] = useState('')
  const [transcripts, setTranscripts] = useState<TranscriptData[]>([])
  const [qrCodes, setQrCodes] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const logoSrc = useCollegeLogo()
  const [config, reloadConfig] = useTranscriptConfig()

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls]?.map((e) => ({ value: e, label: e })) : []
  const groupOptions = useGroupOptions(ALL_GROUPS)

  const handleGenerate = async () => {
    if (!cls || !examName || !year) { setError('Class, Exam Name, and Year are required'); return }
    setLoading(true)
    setError('')
    try {
      const res: { status: number; data: TranscriptData[] } = await api.post('/admin/transcript', {
        class: cls, exam_name: examName, year,
        ...(studentId && { student_id: studentId }),
        ...(group && { group }),
      })
      const list = res.data || []
      // QR images are generated before the sheets render so Print never catches a sheet without one
      const qrMap: Record<string, string> = {}
      for (const t of list) {
        const url = transcriptVerifyUrl(t)
        if (url) qrMap[t.student_id] = await QRCode.toDataURL(url, { margin: 0, width: 220, errorCorrectionLevel: 'M' })
      }
      setQrCodes(qrMap)
      setTranscripts(list)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to generate transcript')
      setTranscripts([])
      setQrCodes({})
    } finally {
      setLoading(false)
    }
  }

  const enabledCount = transcripts.filter((t) => t.verify_enabled).length

  return (
    <PanelLayout role={role} title={title}>
      <Card className="mb-6 no-print">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
            <Select label="Group (Optional)" options={groupOptions} value={group} onChange={(e) => setGroup(e.target.value)} />
            <Input label="Student ID (Optional)" value={studentId} onChange={(e) => setStudentId(e.target.value)} placeholder="Leave empty for all" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="primary" onClick={handleGenerate} disabled={loading || !cls || !examName || !year}>
              {loading ? 'Generating...' : 'Generate Transcript'}
            </Button>
            {transcripts.length > 0 && (
              <Button variant="secondary" onClick={() => window.print()}>
                <Printer className="mr-1 h-4 w-4" /> Print / PDF
              </Button>
            )}
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          {transcripts.length > 0 && (
            <p className="flex flex-wrap items-center gap-1 text-sm text-gray-600">
              <ShieldCheck className="h-4 w-4 text-blue-700" />
              Online QR verification is ON for <b>{enabledCount}</b> of {transcripts.length} transcript(s).
              {role === 'admin' && (
                <Link href="/p_Xk7mN/transcript-verify" className="font-medium text-blue-700 underline">
                  Manage in Transcript QR Verify
                </Link>
              )}
            </p>
          )}
        </CardContent>
      </Card>

      {role === 'admin' && (
        <TranscriptSettings config={config} logoSrc={logoSrc} sample={transcripts[0]} onSaved={reloadConfig} />
      )}

      {transcripts.length > 0 && (
        <div className="ts-container">
          {transcripts.map((t, idx) => (
            <div key={t.student_id} className={`ts-page${idx < transcripts.length - 1 ? ' break-after' : ''}`}>
              <div className="ts-status no-print">
                {t.name} ({t.student_id}) — online verify:{' '}
                <b className={t.verify_enabled ? 'on' : 'off'}>{t.verify_enabled ? 'ON' : 'OFF'}</b>
              </div>
              <TranscriptSheet t={t} logoSrc={logoSrc} qr={qrCodes[t.student_id]} config={config} />
            </div>
          ))}
        </div>
      )}

      <style jsx>{`
        .ts-container {
          overflow-x: auto;
        }
        .ts-page {
          margin: 0 auto 24px;
          width: 210mm;
        }
        .ts-status {
          font-size: 12px;
          color: #475569;
          margin-bottom: 6px;
        }
        .ts-status .on { color: #15803d; }
        .ts-status .off { color: #b91c1c; }
        @media print {
          :global(html), :global(body) { margin: 0 !important; padding: 0 !important; }
          :global(aside), :global(header) { display: none !important; }
          :global(.flex-1.overflow-auto) { overflow: visible !important; padding: 0 !important; }
          :global(.flex.min-h-screen), :global(.flex.flex-1.flex-col) { display: block !important; }
          :global(body) { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          :global(.no-print) { display: none !important; }
          .ts-container { overflow: visible; }
          .ts-page { margin: 0; width: auto; }
          .break-after { page-break-after: always; break-after: page; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </PanelLayout>
  )
}

/** One A4 transcript sheet. Also reused by the public verify page (without QR). */
export function TranscriptSheet({ t, logoSrc, qr, config = DEFAULT_TRANSCRIPT_CONFIG }: { t: TranscriptData; logoSrc: string; qr?: string; config?: TranscriptConfig }) {
  const show = config.show
  if (!show.qr) qr = undefined
  const mainSubjects = t.subjects.filter((s) => !s.is_optional)
  const optionalSubjects = t.subjects.filter((s) => s.is_optional)
  const hasOptional = optionalSubjects.length > 0
  // [CQ, MCQ, Practical, Total] texts — cells are written inline so styled-jsx scopes them
  const markTexts = (s: TranscriptSubjectRow) =>
    [partText(s.parts?.cq), partText(s.parts?.mcq), partText(s.parts?.practical), totalText(s)]

  const info = infoRows(t, config) // admin-chosen fields, in order (Session 84)

  return (
    <div className="sheet">
      <div className="frame">
        {logoSrc && config.watermark.opacity > 0 && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoSrc} alt="" aria-hidden className="watermark"
            style={{ opacity: config.watermark.opacity, width: `${config.watermark.size}%`, left: `${config.watermark.x}%`, top: `${config.watermark.y}%`, transform: 'translate(-50%, -50%)' }} />
        )}

        <div className="head">
          {qr && (
            <div className="qr-box">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={qr} alt="Verify QR" className="qr" />
              <span className="qr-cap">Scan to Verify</span>
            </div>
          )}
          <div className="logo-row">
            {logoSrc && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logoSrc} alt="Logo" className="logo" />
            )}
            <div>
              <h2 className="college">{COLLEGE_NAME}</h2>
              <p className="address">{COLLEGE_ADDRESS}</p>
            </div>
          </div>
          <p className="pill">ACADEMIC TRANSCRIPT</p>
          <p className="exam">{t.exam_name} Examination {t.year}</p>
        </div>

        <div className="body">
          {show.photo && (
            <div className="photo-box">
              {t.photo_path ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={photoUrl(t.photo_path)} alt={t.name} className="photo" />
              ) : (
                <div className="photo placeholder">Photo</div>
              )}
            </div>
          )}
          <div className="info">
            {info.map(([label, value]) => (
              <div key={label} className="info-item">
                <span className="label">{label}</span>
                <span className="colon">:</span>
                <span className="value">{value}</span>
              </div>
            ))}
          </div>
          {show.grading && (
          <table className="scale">
            <thead>
              <tr><th colSpan={3}>Grading System</th></tr>
              <tr><th>Marks</th><th>Grade</th><th>Point</th></tr>
            </thead>
            <tbody>
              {GRADE_SCALE.map(([m, g, p]) => (
                <tr key={g}><td>{m}</td><td>{g}</td><td>{p}</td></tr>
              ))}
            </tbody>
          </table>
          )}
        </div>

        {show.summary && (
          <div className="summary">
            <div className="chip main"><span>GPA</span><b>{t.overall_gpa.toFixed(2)}</b></div>
            <div className="chip main"><span>Letter Grade</span><b>{t.overall_grade}</b></div>
            {show.position && <div className="chip"><span>Position</span><b>{t.position ?? '–'}</b></div>}
          </div>
        )}

        <table className="marks">
          <thead>
            <tr>
              <th className="c-sl" rowSpan={2}>SL</th>
              <th className="c-code" rowSpan={2}>Code</th>
              <th className="c-sub" rowSpan={2}>Name of Subjects</th>
              <th colSpan={4}>Marks Obtained</th>
              <th className="c-n" rowSpan={2}>Letter<br />Grade</th>
              <th className="c-n" rowSpan={2}>Grade<br />Point</th>
              <th className="c-w" rowSpan={2}>GPA<br />(Without Optional)</th>
              <th className="c-n" rowSpan={2}>GPA</th>
            </tr>
            <tr className="sub-head">
              <th className="c-p">CQ</th>
              <th className="c-p">MCQ</th>
              <th className="c-p">Prac.</th>
              <th className="c-p">Total</th>
            </tr>
          </thead>
          <tbody>
            {mainSubjects.map((s, i) => (
              <tr key={i}>
                <td className="tc">{i + 1}</td>
                <td className="tc">{s.code || '–'}</td>
                <td className="sub">{s.subject}</td>
                {markTexts(s).map((v, k) => <td key={k} className={k === 3 ? 'tc b' : 'tc'}>{v}</td>)}
                <td className="tc b">{s.grade}</td>
                <td className="tc">{s.gpa.toFixed(2)}</td>
                {i === 0 && (
                  <td className="tc big" rowSpan={mainSubjects.length}>{t.gpa_without_optional.toFixed(2)}</td>
                )}
                {i === 0 && (
                  <td className="tc big" rowSpan={mainSubjects.length + (hasOptional ? optionalSubjects.length + 1 : 0)}>
                    {t.overall_gpa.toFixed(2)}
                  </td>
                )}
              </tr>
            ))}
            {mainSubjects.length === 0 && !hasOptional && (
              <tr><td colSpan={11} className="tc empty">No results found for this exam</td></tr>
            )}
            {hasOptional && (
              <>
                <tr className="opt-label"><td colSpan={10}>Optional Subject :</td></tr>
                {optionalSubjects.map((s, i) => (
                  <tr key={`${s.subject}-${i}`}>
                    <td className="tc">{mainSubjects.length + i + 1}</td>
                    <td className="tc">{s.code || '–'}</td>
                    <td className="sub">{s.subject}</td>
                    {markTexts(s).map((v, k) => <td key={k} className={k === 3 ? 'tc b' : 'tc'}>{v}</td>)}
                    <td className="tc b">{s.grade}</td>
                    <td className="tc">{s.gpa.toFixed(2)}</td>
                    {i === 0 && (
                      <td className="tc gp2" rowSpan={optionalSubjects.length}>
                        <div className="gp2-l">GP Above 2</div>
                        <div className="gp2-v">{t.optional_gp_above_2.toFixed(2)}</div>
                      </td>
                    )}
                  </tr>
                ))}
              </>
            )}
          </tbody>
        </table>

        <div className="lower">
          <div className="pub">
            <p><b>Date of Publication of Result:</b> {formatDate(t.published_at)}</p>
            {qr && (
              <p className="verify-note">
                This transcript can be verified online by scanning the QR code.
                If online verification is not available, please contact the Exam office.
              </p>
            )}
          </div>
        </div>

        <div className="signs">
          <div className="sign"><div className="line" />Controller of Examinations</div>
          <div className="sign"><div className="line" />Principal</div>
        </div>
      </div>

      <style jsx>{`
        .sheet {
          background: #fff;
          padding: 9mm;
          box-shadow: 0 1px 6px rgba(15, 23, 42, 0.15);
          font-family: 'Times New Roman', Times, serif;
          color: #0f172a;
        }
        .frame {
          position: relative;
          min-height: 277mm;
          display: flex;
          flex-direction: column;
          border: 2px solid #1e3a8a;
          border-radius: 12px;
          outline: 1px solid #93c5fd;
          outline-offset: -6px;
          overflow: hidden;
          padding: 0 22px 18px;
        }
        .watermark {
          position: absolute;
          top: 50%;
          left: 50%;
          width: 62%; /* default; admin setting overrides inline (Session 84) */
          transform: translate(-50%, -42%);
          opacity: 0.12;
          pointer-events: none;
          z-index: 0;
        }
        .frame > :not(.watermark) { position: relative; z-index: 1; }
        .head {
          text-align: center;
          margin: 0 -22px 14px;
          padding: 16px 16px 12px;
          background: linear-gradient(180deg, #dbeafe 0%, #eff6ff 100%);
          border-bottom: 2px solid #1e3a8a;
        }
        .logo-row { display: flex; align-items: center; justify-content: center; gap: 14px; }
        .logo { height: 70px; width: 70px; object-fit: contain; }
        .college { font-size: 25px; font-weight: bold; margin: 0; color: #1e3a8a; letter-spacing: 0.5px; }
        .address { font-size: 13.5px; margin: 2px 0 0; }
        .pill {
          display: inline-block;
          margin: 10px 0 0;
          background: #1e3a8a;
          color: #fff;
          font-size: 14px;
          font-weight: 700;
          letter-spacing: 3px;
          padding: 3px 22px;
          border-radius: 999px;
        }
        .exam {
          margin: 7px 0 0;
          font-size: 14px;
          font-weight: 700;
          color: #b91c1c;
          text-transform: uppercase;
          letter-spacing: 0.8px;
        }
        .body { display: flex; gap: 16px; align-items: flex-start; }
        .photo-box { flex-shrink: 0; }
        .photo {
          width: 84px;
          height: 104px;
          object-fit: cover;
          border: 2px solid #1e3a8a;
          border-radius: 6px;
          background: #fff;
        }
        .placeholder { display: flex; align-items: center; justify-content: center; font-size: 11px; color: #64748b; background: #f1f5f9; }
        .info {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 3px 14px;
          font-size: 13px;
        }
        .info-item { display: flex; gap: 4px; min-width: 0; }
        .label { font-weight: 700; color: #1e3a8a; white-space: nowrap; }
        .colon { color: #1e3a8a; }
        .value { overflow-wrap: anywhere; }
        .head { position: relative; }
        .qr-box {
          position: absolute;
          right: 14px;
          top: 50%;
          transform: translateY(-50%);
          text-align: center;
          background: #fff;
          border: 1px solid #93c5fd;
          border-radius: 8px;
          padding: 4px 4px 2px;
        }
        .qr { width: 78px; height: 78px; display: block; }
        .qr-cap { display: block; font-size: 9.5px; font-weight: 700; color: #1e3a8a; margin-top: 2px; letter-spacing: 0.3px; }
        .summary { display: flex; justify-content: center; gap: 8px; margin: 12px 0 10px; }
        .chip {
          display: inline-flex;
          align-items: baseline;
          gap: 7px;
          border: 1px solid #93c5fd;
          background: #eff6ff;
          border-radius: 999px;
          padding: 3px 14px;
        }
        .chip span { font-size: 11px; color: #1e3a8a; font-weight: 600; text-transform: uppercase; letter-spacing: 0.3px; }
        .chip b { font-size: 15px; color: #0f172a; }
        .chip.main { background: #1e3a8a; border-color: #1e3a8a; }
        .chip.main span, .chip.main b { color: #fff; }
        .marks { width: 100%; border-collapse: collapse; font-size: 13px; background: rgba(255, 255, 255, 0.3); }
        .marks th, .marks td { border: 1px solid #94a3b8; padding: 5px 5px; vertical-align: middle; }
        .marks th { background: #1e3a8a; color: #fff; font-weight: bold; text-align: center; font-size: 12px; line-height: 1.15; }
        .marks .sub-head th { background: #1e40af; font-size: 11.5px; padding: 3px 4px; }
        .marks tbody tr:nth-child(even) { background: rgba(219, 234, 254, 0.45); }
        .c-sl { width: 32px; }
        .c-code { width: 46px; }
        .c-p { width: 44px; }
        .c-n { width: 54px; }
        .c-w { width: 74px; }
        .tc { text-align: center; }
        .b { font-weight: 700; }
        .sub { font-weight: 600; }
        .big { font-weight: 700; font-size: 16px; color: #1e3a8a; background: #fff; }
        .empty { color: #64748b; padding: 14px; font-style: italic; }
        .opt-label td { font-weight: 700; color: #1e3a8a; background: #dbeafe !important; padding-left: 9px; }
        .gp2 { padding: 0 !important; background: #fff; }
        .gp2-l { font-size: 10.5px; border-bottom: 1px solid #94a3b8; padding: 2px 4px; color: #1e3a8a; font-weight: 600; }
        .gp2-v { padding: 3px 4px; font-weight: 700; }
        .lower { display: flex; justify-content: space-between; gap: 20px; margin-top: 16px; font-size: 13px; }
        .pub p { margin: 0 0 6px; }
        .verify-note { font-size: 11.5px; color: #475569; font-style: italic; max-width: 330px; }
        .scale { flex-shrink: 0; border-collapse: collapse; font-size: 10.5px; background: #fff; }
        .scale th, .scale td { border: 1px solid #94a3b8; padding: 0 6px; text-align: center; line-height: 1.3; }
        .scale thead tr:first-child th { background: #1e3a8a; color: #fff; letter-spacing: 0.5px; }
        .scale thead tr:nth-child(2) th { background: #dbeafe; color: #1e3a8a; }
        .signs { margin-top: auto; padding-top: 48px; display: flex; justify-content: space-between; font-size: 13.5px; font-weight: 600; }
        .sign { text-align: center; }
        .line { width: 190px; border-top: 1px solid #0f172a; margin-bottom: 4px; }
        @media print {
          .sheet { box-shadow: none; padding: 10mm; }
          /* 297mm page - 20mm padding - 2x2px border, with slack so it never spills a blank page */
          .frame { min-height: 274mm; }
        }
      `}</style>
    </div>
  )
}
