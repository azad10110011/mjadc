'use client'

// Board Exam Management › Board Hall Duty (Session 99): our teachers (optional) + external teachers,
// rooms of every venue. Same workflow as the internal Hall Duty: settings → Generate → adjust / pin → Finalize.

import { useCallback, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent, Input, Select } from '@/components/ui'
import { api } from '@/lib/api'
import { fmtTime } from '@/lib/examPdf'
import { useBoardExam } from '@/lib/boardExam'
import { BoardExamBar } from '@/components/board/BoardExamBar'
import { AlertTriangle, CheckCircle2, Lock, Unlock, Pin, PinOff, RefreshCw, X, Wand2, CalendarDays, Users, ListOrdered, ArrowUp, ArrowDown, Save } from 'lucide-react'

type OwnRule = 'none' | 'avoid' | 'must'
interface Config { min_duties: number; max_duties: number; own_subject_rule: OwnRule; use_internal: boolean; finalized: boolean }
interface SRoom { room_id: number; name: string; venue: string; need: number; teacher_gender: string; students: number }
interface Session { key: string; exam_date: string; exam_time: string; subjects: string[]; rooms: SRoom[] }
interface Teacher { key: string; type: 'internal' | 'external'; name: string; gender: string; designation: string; subject: string | null; college: string; excluded: boolean; disabled: boolean; off: boolean; priority: number | null; min_duties: number | null; max_duties: number | null }
interface Duty { id: number; exam_date: string; exam_time: string; room_id: number; tkey: string; fixed: boolean; room_label: string; teacher_name: string; teacher_type: string }
interface Data { exam: { id: number; config: Config }; sessions: Session[]; teachers: Teacher[]; duties: Duty[]; warnings: string[] }

const niceDate = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d).toLocaleDateString('en-GB', { weekday: 'short', day: '2-digit', month: 'short' }) }
const TG: Record<string, string> = { any: 'any', male: 'male only', female: 'female only', mixed: 'male + female' }
const Ext = () => <span className="rounded bg-purple-100 px-1 text-[10px] font-semibold text-purple-800">EXT</span>

export default function BoardHallDutyPage() {
  const { exams, exam, examId, setExamId, loaded } = useBoardExam()
  const [data, setData] = useState<Data | null>(null)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [view, setView] = useState<'date' | 'teacher' | 'priority'>('date')
  const [minD, setMinD] = useState('0'); const [maxD, setMaxD] = useState('5')
  const [ownRule, setOwnRule] = useState<OwnRule>('avoid'); const [useInternal, setUseInternal] = useState(true)
  const [prio, setPrio] = useState<string[]>([]); const [prioDirty, setPrioDirty] = useState(false)
  const [asFixed, setAsFixed] = useState(false)
  const [tSearch, setTSearch] = useState(''); const [tType, setTType] = useState<'' | 'internal' | 'external'>('')

  const load = useCallback(async () => {
    if (!examId) return
    try {
      const r = await api.get<{ data: Data }>(`/admin/board-duty/${examId}`)
      const c = r.data.exam.config
      setData(r.data); setMinD(String(c.min_duties)); setMaxD(String(c.max_duties)); setOwnRule(c.own_subject_rule); setUseInternal(c.use_internal)
      setPrio(r.data.teachers.filter((t) => t.priority !== null).sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)).map((t) => t.key)); setPrioDirty(false)
    } catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Failed to load' }) }
  }, [examId])
  useEffect(() => { const t = setTimeout(() => void load(), 0); return () => clearTimeout(t) }, [load])

  const run = async (fn: () => Promise<string>) => {
    setBusy(true); setMsg(null)
    try { setMsg({ ok: true, text: await fn() }); await load() }
    catch (e) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Something went wrong' }) }
    finally { setBusy(false) }
  }
  const base = `/admin/board-duty/${examId}`
  const cfg = data?.exam.config
  const final = !!cfg?.finalized
  const tByKey = useMemo(() => new Map((data?.teachers || []).map((t) => [t.key, t])), [data])
  const count = useMemo(() => { const m = new Map<string, number>(); for (const d of data?.duties || []) m.set(d.tkey, (m.get(d.tkey) || 0) + 1); return m }, [data])
  const cells = useMemo(() => { const m = new Map<string, Duty[]>(); for (const d of data?.duties || []) { const k = `${d.exam_date}|${d.exam_time}|${d.room_id}`; if (!m.has(k)) m.set(k, []); m.get(k)!.push(d) } return m }, [data])
  const busyIn = useMemo(() => { const m = new Map<string, Set<string>>(); for (const d of data?.duties || []) { const k = `${d.exam_date}|${d.exam_time}`; if (!m.has(k)) m.set(k, new Set()); m.get(k)!.add(d.tkey) } return m }, [data])
  const slots = (data?.sessions || []).reduce((n, s) => n + s.rooms.reduce((a, r) => a + r.need, 0), 0)
  const extOnDuty = new Set((data?.duties || []).filter((d) => d.teacher_type === 'external').map((d) => d.tkey)).size

  const saveConfig = () => {
    if (cfg?.use_internal && !useInternal && !confirm('Stop using our own teachers? Their duties in this exam (pinned too) will be removed.')) return
    run(async () => { await api.put(`${base}/config`, { min_duties: Number(minD), max_duties: Number(maxD), own_subject_rule: ownRule, use_internal: useInternal }); return 'Settings saved.' })
  }
  const generate = () => {
    if ((data?.duties.length || 0) > 0 && !confirm('Regenerate? Non-pinned duties are replaced; pinned duties are kept.')) return
    run(async () => (await api.post<{ message: string }>(`${base}/generate`, {})).message)
  }
  const finalize = (v: boolean) => run(async () => (await api.post<{ message: string }>(`${base}/finalize`, { finalized: v })).message)
  const addDuty = (s: Session, roomId: number, key: string) => key && run(async () => {
    await api.post(`${base}/duties`, { exam_date: s.exam_date, exam_time: s.exam_time, room_id: roomId, tkey: key, fixed: asFixed })
    return `${tByKey.get(key)?.name} added${asFixed ? ' (pinned)' : ''}.`
  })
  const removeDuty = (d: Duty) => run(async () => { await api.delete(`${base}/duties/${d.id}`); return `${d.teacher_name} removed.` })
  const toggleFixed = (d: Duty) => run(async () => { await api.put(`${base}/duties/${d.id}`, { fixed: !d.fixed }); return d.fixed ? 'Unpinned.' : 'Pinned — kept on regenerate.' })
  const saveTeacher = (t: Teacher, patch: Partial<Teacher>) => run(async () => {
    const n = { ...t, ...patch }
    return (await api.put<{ message: string }>(`${base}/teachers/${t.key}`, { excluded: n.excluded, min_duties: n.min_duties, max_duties: n.max_duties })).message
  })
  const movePrio = (i: number, d: number) => { const j = i + d; if (j < 0 || j >= prio.length) return; const n = [...prio]; [n[i], n[j]] = [n[j], n[i]]; setPrio(n); setPrioDirty(true) }
  const savePrio = () => run(async () => { const r = await api.put<{ message: string }>(`${base}/priority`, { order: prio }); setPrioDirty(false); return r.message })

  const eligibleFor = (s: Session) => (data?.teachers || [])
    .filter((t) => !t.off && !busyIn.get(`${s.exam_date}|${s.exam_time}`)?.has(t.key))
    .sort((a, b) => (count.get(a.key) || 0) - (count.get(b.key) || 0) || a.name.localeCompare(b.name))

  return (
    <PanelLayout role="admin" title="Board Hall Duty">
      <div className="space-y-5">
        <BoardExamBar exams={exams} examId={examId} onChange={setExamId} loaded={loaded} />
        {exam && data && (
          <Card>
            <CardContent className="space-y-4 pt-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <Input label="Min duties / teacher" type="number" min={0} value={minD} onChange={(e) => setMinD(e.target.value)} disabled={final} />
                <Input label="Max duties / teacher" type="number" min={0} value={maxD} onChange={(e) => setMaxD(e.target.value)} disabled={final} />
                <Select label="Own subject's exam day" value={ownRule} onChange={(e) => setOwnRule(e.target.value as OwnRule)} disabled={final}
                  options={[{ value: 'none', label: 'No rule' }, { value: 'avoid', label: 'No duty on own subject\'s exam day' }, { value: 'must', label: 'Must duty on own subject\'s exam day' }]} />
                <div>
                  <p className="mb-1 text-sm font-medium text-gray-700">Teachers used</p>
                  <label className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm"><input type="checkbox" checked={useInternal} disabled={final} onChange={(e) => setUseInternal(e.target.checked)} /> Our own teachers + external</label>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" onClick={saveConfig} disabled={busy || final}>Save Settings</Button>
                <Button onClick={generate} disabled={busy || final}>{data.duties.length ? <><RefreshCw className="mr-1 h-4 w-4" /> Regenerate</> : <><Wand2 className="mr-1 h-4 w-4" /> Generate Duties</>}</Button>
                {final ? <Button variant="secondary" onClick={() => finalize(false)} disabled={busy}><Unlock className="mr-1 h-4 w-4" /> Re-open for changes</Button>
                  : <Button onClick={() => finalize(true)} disabled={busy || !data.duties.length}><Lock className="mr-1 h-4 w-4" /> Finalize</Button>}
                <span className="flex-1" />
                {final && <Link href="/p_Xk7mN/board/duty-letters" className="text-sm font-medium text-blue-700 hover:underline">Appointment letters →</Link>}
                <Link href="/p_Xk7mN/board/external-teachers" className="text-sm text-gray-600 hover:underline">Manage external teachers</Link>
              </div>
            </CardContent>
          </Card>
        )}
        {msg && <p role="status" className={`flex items-start justify-between gap-2 rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}><span>{msg.text}</span><button onClick={() => setMsg(null)} aria-label="Dismiss"><X className="h-4 w-4" /></button></p>}

        {exam && data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
              {[['Sessions', data.sessions.length], ['Slots filled', `${data.duties.length}/${slots}`], ['Teachers on duty', count.size], ['External on duty', extOnDuty]].map(([l, v]) => (
                <div key={String(l)} className="rounded-xl border border-gray-200 bg-white p-3 text-center"><p className="text-xs uppercase text-gray-500">{l}</p><p className="text-2xl font-bold">{v}</p></div>
              ))}
              <div className={`col-span-2 rounded-xl p-3 text-center sm:col-span-1 ${final ? 'bg-green-600 text-white' : 'border border-amber-200 bg-amber-50 text-amber-900'}`}><p className="text-xs uppercase opacity-80">Status</p><p className="text-lg font-bold">{final ? 'Finalized' : 'Draft'}</p></div>
            </div>
            {data.warnings.length > 0 ? (
              <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                <p className="font-semibold">{data.warnings.length} rule warning(s)</p>
                {data.warnings.map((w, i) => <p key={i} className="flex gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />{w}</p>)}
              </div>
            ) : data.duties.length > 0 && <p className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800"><CheckCircle2 className="h-4 w-4" /> All rules satisfied.</p>}
            {data.sessions.length === 0 && <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-800">No routine yet. Add it in <Link href="/p_Xk7mN/board/routine" className="underline">Board Routine</Link>, and generate the <Link href="/p_Xk7mN/board/seat-plan" className="underline">Board Seat Plan</Link>.</p>}

            <div className="flex flex-wrap items-center gap-2">
              <Button variant={view === 'date' ? 'primary' : 'outline'} size="sm" onClick={() => setView('date')}><CalendarDays className="mr-1 h-4 w-4" /> Date-wise</Button>
              <Button variant={view === 'teacher' ? 'primary' : 'outline'} size="sm" onClick={() => setView('teacher')}><Users className="mr-1 h-4 w-4" /> Teacher-wise</Button>
              <Button variant={view === 'priority' ? 'primary' : 'outline'} size="sm" onClick={() => setView('priority')}><ListOrdered className="mr-1 h-4 w-4" /> Priority list ({prio.length})</Button>
              {view === 'date' && !final && <label className="ml-auto flex items-center gap-2 text-sm text-gray-700"><input type="checkbox" checked={asFixed} onChange={(e) => setAsFixed(e.target.checked)} /> Add as pinned (kept on regenerate)</label>}
            </div>

            {view === 'date' && (
              <div className="space-y-3">
                {data.sessions.map((s) => (
                  <Card key={s.key}>
                    <CardContent className="pt-4">
                      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                        <p className="font-semibold text-gray-900">{niceDate(s.exam_date)} · {fmtTime(s.exam_time)}</p>
                        <p className="text-xs text-gray-500">{s.subjects.join(', ')}</p>
                      </div>
                      {s.rooms.length === 0 && <p className="text-sm text-gray-500">No seated candidate takes these papers.</p>}
                      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                        {s.rooms.map((r) => {
                          const list = cells.get(`${s.exam_date}|${s.exam_time}|${r.room_id}`) || []
                          const short = list.length < r.need
                          return (
                            <div key={r.room_id} className={`rounded-lg border p-2.5 ${short ? 'border-amber-300 bg-amber-50/50' : 'border-gray-200'}`}>
                              <p className="mb-1.5 flex justify-between gap-2 text-sm"><b className="min-w-0 truncate">{r.name}</b><span className={`shrink-0 ${short ? 'text-amber-700' : 'text-gray-500'}`}>{list.length}/{r.need} · {r.students} cand. · {TG[r.teacher_gender]}</span></p>
                              <ul className="space-y-1">
                                {list.map((d) => (
                                  <li key={d.id} className="flex items-center gap-1.5 rounded bg-white px-2 py-1 text-sm shadow-sm ring-1 ring-gray-100">
                                    {d.fixed && <Pin className="h-3.5 w-3.5 shrink-0 text-blue-700" aria-label="pinned" />}
                                    <span className="min-w-0 flex-1 truncate">{d.teacher_name} {d.teacher_type === 'external' && <Ext />} <span className="text-xs text-gray-400">{tByKey.get(d.tkey)?.gender === 'female' ? '♀' : '♂'} · {count.get(d.tkey)}</span></span>
                                    {!final && <>
                                      <button type="button" onClick={() => toggleFixed(d)} className="rounded p-0.5 text-gray-400 hover:text-blue-700" aria-label={d.fixed ? 'Unpin' : 'Pin'}>{d.fixed ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}</button>
                                      <button type="button" onClick={() => removeDuty(d)} className="rounded p-0.5 text-gray-400 hover:text-red-600" aria-label={`Remove ${d.teacher_name}`}><X className="h-3.5 w-3.5" /></button>
                                    </>}
                                  </li>
                                ))}
                              </ul>
                              {!final && (
                                <select aria-label={`Add teacher to ${r.name}`} value="" onChange={(e) => addDuty(s, r.room_id, e.target.value)} className="mt-2 w-full rounded-md border border-gray-300 bg-white px-2 py-1 text-xs text-gray-700">
                                  <option value="">+ Add teacher…</option>
                                  {eligibleFor(s).map((t) => <option key={t.key} value={t.key}>{t.type === 'external' ? '[EXT] ' : ''}{t.name} ({t.gender === 'female' ? 'F' : 'M'}, {count.get(t.key) || 0} duties{t.subject ? `, ${t.subject}` : ''}{t.college ? `, ${t.college}` : ''})</option>)}
                                </select>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {view === 'teacher' && cfg && (
              <Card>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex flex-wrap gap-2">
                    <input type="search" value={tSearch} onChange={(e) => setTSearch(e.target.value)} aria-label="Search teachers" placeholder="Search teacher or college" className="w-full rounded-lg border border-gray-300 px-3 py-1.5 text-sm sm:w-64" />
                    <select value={tType} onChange={(e) => setTType(e.target.value as '' | 'internal' | 'external')} aria-label="Teacher type" className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm">
                      <option value="">All teachers</option><option value="internal">Our teachers</option><option value="external">External teachers</option>
                    </select>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-gray-200">
                    <table className="w-full min-w-[760px] text-sm">
                      <thead className="bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500"><tr><th className="px-3 py-2">Teacher</th><th className="px-3 py-2">Duties</th><th className="px-3 py-2">Min / Max (blank = default)</th><th className="px-3 py-2">On duty</th><th className="px-3 py-2">This exam</th></tr></thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.teachers.filter((t) => (!tType || t.type === tType) && (!tSearch || `${t.name} ${t.college}`.toLowerCase().includes(tSearch.toLowerCase()))).map((t) => {
                          const n = count.get(t.key) || 0, min = t.min_duties ?? cfg.min_duties, max = t.max_duties ?? cfg.max_duties
                          return (
                            <tr key={t.key} className={t.off ? 'bg-gray-50 text-gray-400' : ''}>
                              <td className="px-3 py-2"><p className="font-medium">{t.name} {t.type === 'external' && <Ext />}{t.priority !== null && <span className="ml-1.5 rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-800">Priority {t.priority}</span>}</p>
                                <p className="text-xs text-gray-500">{t.designation}{t.subject ? ` · ${t.subject}` : ''}{t.college ? ` · ${t.college}` : ''}{t.disabled ? ' · disabled' : ''}</p></td>
                              <td className="px-3 py-2"><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${t.off ? 'bg-gray-100' : n < min ? 'bg-amber-100 text-amber-800' : n > max ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-800'}`}>{n}</span></td>
                              <td className="px-3 py-2"><div className="flex items-center gap-1">
                                <input type="number" min={0} aria-label={`${t.name} minimum`} placeholder={String(cfg.min_duties)} defaultValue={t.min_duties ?? ''} disabled={final} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== t.min_duties) saveTeacher(t, { min_duties: v }) }} className="w-14 rounded border border-gray-300 px-1.5 py-1 text-xs" />
                                <span>/</span>
                                <input type="number" min={0} aria-label={`${t.name} maximum`} placeholder={String(cfg.max_duties)} defaultValue={t.max_duties ?? ''} disabled={final} onBlur={(e) => { const v = e.target.value === '' ? null : Number(e.target.value); if (v !== t.max_duties) saveTeacher(t, { max_duties: v }) }} className="w-14 rounded border border-gray-300 px-1.5 py-1 text-xs" />
                              </div></td>
                              <td className="px-3 py-2 text-xs text-gray-600">{data.duties.filter((d) => d.tkey === t.key).map((d) => `${niceDate(d.exam_date)} ${d.room_label}${d.fixed ? ' 📌' : ''}`).join(' · ') || '—'}</td>
                              <td className="px-3 py-2"><label className="flex items-center gap-1.5 whitespace-nowrap text-xs"><input type="checkbox" checked={t.excluded} disabled={final || busy} onChange={(e) => saveTeacher(t, { excluded: e.target.checked })} /> Excluded</label></td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  <p className="text-xs text-gray-500">Our teachers disabled in Internal Hall Duty and external teachers marked unavailable are skipped. <b>Excluded</b> = no duty in this board exam only. Changes apply on the next Generate.</p>
                </CardContent>
              </Card>
            )}

            {view === 'priority' && (
              <Card>
                <CardContent className="space-y-4 pt-5">
                  <div className="rounded-lg bg-indigo-50 px-3 py-2 text-sm text-indigo-900">Everyone first gets the <b>minimum</b>. When more invigilators are needed, the <b>extra duties</b> go to this list top first (each up to their maximum), then to everyone else. This list is for this board exam only.</div>
                  <ol className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                    {prio.map((k, i) => { const t = tByKey.get(k); return (
                      <li key={k} className="flex items-center gap-2 px-3 py-2 text-sm">
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">{i + 1}</span>
                        <span className="min-w-0 flex-1"><span className="font-medium text-gray-900">{t?.name || k}</span> {t?.type === 'external' && <Ext />}<span className="block text-xs text-gray-500">{t?.designation}{t?.college ? ` · ${t.college}` : ''} · {count.get(k) || 0} duties</span></span>
                        <button type="button" onClick={() => movePrio(i, -1)} disabled={i === 0} aria-label={`Move ${t?.name} up`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowUp className="h-4 w-4" /></button>
                        <button type="button" onClick={() => movePrio(i, 1)} disabled={i === prio.length - 1} aria-label={`Move ${t?.name} down`} className="rounded p-1 text-gray-500 hover:bg-gray-100 disabled:opacity-30"><ArrowDown className="h-4 w-4" /></button>
                        <button type="button" onClick={() => { setPrio(prio.filter((x) => x !== k)); setPrioDirty(true) }} aria-label={`Remove ${t?.name}`} className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-600"><X className="h-4 w-4" /></button>
                      </li>) })}
                    {prio.length === 0 && <li className="px-3 py-5 text-center text-sm text-gray-500">No priority list — extra duties are shared equally.</li>}
                  </ol>
                  <div className="flex flex-wrap items-center gap-2">
                    <select aria-label="Add teacher to priority list" value="" onChange={(e) => { if (e.target.value) { setPrio([...prio, e.target.value]); setPrioDirty(true) } }} className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm sm:w-80">
                      <option value="">+ Add teacher to the list…</option>
                      {data.teachers.filter((t) => !prio.includes(t.key) && !t.off).map((t) => <option key={t.key} value={t.key}>{t.type === 'external' ? '[EXT] ' : ''}{t.name}{t.college ? ` (${t.college})` : ''}</option>)}
                    </select>
                    <Button onClick={savePrio} disabled={busy || !prioDirty}><Save className="mr-1 h-4 w-4" /> {prioDirty ? 'Save priority list' : 'Saved'}</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </PanelLayout>
  )
}
