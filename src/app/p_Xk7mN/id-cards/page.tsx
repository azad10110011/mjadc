'use client'

import { useState, useEffect, useCallback } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api, UPLOAD_BASE } from '@/lib/api'
import { CreditCard, CheckSquare, Square, Download, Search, Loader2 } from 'lucide-react'

type CardType = 'students' | 'teachers' | 'staff'

interface Person {
  id: number
  name: string
  photo_path?: string | null
  mobile?: string | null
  parent_mobile?: string | null
  [key: string]: unknown
}

const TYPE_LABELS: Record<CardType, string> = {
  students: 'Students',
  teachers: 'Teachers',
  staff: 'Staff',
}

function cardPhotoUrl(person: Person): string | null {
  const path = person.photo_path
  if (!path) return null
  return `${UPLOAD_BASE}/${path.replace(/^\/+/, '')}`
}

function emergencyContact(person: Person, type: CardType): string {
  if (type === 'students') {
    return String(person.parent_mobile || person.mobile || '-')
  }
  return String(person.mobile || '-')
}

export default function IdCardsPage() {
  const [type, setType] = useState<CardType>('students')
  const [people, setPeople] = useState<Person[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [generating, setGenerating] = useState(false)
  const [search, setSearch] = useState('')
  const fetchData = useCallback(async () => {
    setLoading(true)
    setSelected(new Set())
    try {
      const r: any = await api.get(`/admin/id-cards?type=${type}`)
      setPeople(r.data || [])
    } catch {
      setPeople([])
    } finally {
      setLoading(false)
    }
  }, [type])

  useEffect(() => { fetchData() }, [fetchData])

  const allSelected = people.length > 0 && selected.size === people.length
  const filtered = people.filter((p) =>
    Object.values(p).some((v) => String(v).toLowerCase().includes(search.toLowerCase()))
  )

  const toggle = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (allSelected) setSelected(new Set())
    else setSelected(new Set(people.map((p) => p.id)))
  }

  const downloadSelected = async () => {
    if (selected.size === 0) return
    setGenerating(true)

    try {
      const selectedPeople = people.filter((p) => selected.has(p.id))

      let cardWidth = 190, cardHeight = 0, cardGap = 5
      try {
        const setRes: any = await api.get('/admin/settings')
        const arr = setRes.data || []
        const w = arr.find((s: any) => s.setting_key === 'id_card_width')
        const h = arr.find((s: any) => s.setting_key === 'id_card_height')
        const g = arr.find((s: any) => s.setting_key === 'id_card_gap')
        if (w) cardWidth = Number(w.setting_value) || 190
        if (h) cardHeight = Number(h.setting_value) || 0
        if (g) cardGap = Number(g.setting_value) || 5
      } catch {}

      let sigImgSrc = ''
      let logoImgSrc = ''
      try {
        const setRes: any = await api.get('/admin/settings')
        const arr = setRes.data || []
        const sig = arr.find((s: any) => s.setting_key === 'principal_signature')
        if (sig && sig.setting_value) sigImgSrc = `${UPLOAD_BASE}/${sig.setting_value.replace(/^\/+/, '')}`
        const logo = arr.find((s: any) => s.setting_key === 'college_logo')
        if (logo && logo.setting_value) logoImgSrc = `${UPLOAD_BASE}/${logo.setting_value.replace(/^\/+/, '')}`
      } catch {}

      const cardHtml = (person: Person) => {
        const photoUrl = cardPhotoUrl(person)
        const photoHtml = photoUrl
          ? '<img src="' + photoUrl + '" style="width:100%;height:100%;object-fit:cover;" />'
          : '<span style="font-size:calc(24px * var(--s));font-weight:bold;color:#9ca3af;">' + (person.gender === 'female' ? 'F' : 'M') + '</span>'
        const emergency = emergencyContact(person, type)
        const year = new Date().getFullYear()

        let infoHtml = ''
        if (type === 'students') {
          infoHtml += '<div><span class="card-label">ID:</span> ' + (person.student_id || '') + '</div>'
          infoHtml += '<div><span class="card-label">Class:</span> ' + (person.class || '') + (person.student_group ? ' (' + person.student_group + ')' : '') + (person.section ? ' | ' + person.section : '') + '</div>'
          infoHtml += '<div><span class="card-label">Session:</span> ' + (person.academic_session || '') + '</div>'
          if (person.blood_group) infoHtml += '<div><span class="card-label">Blood:</span> ' + person.blood_group + '</div>'
        } else if (type === 'teachers') {
          infoHtml += '<div><span class="card-label">Designation:</span> ' + (person.designation || '') + '</div>'
          infoHtml += '<div><span class="card-label">Subject:</span> ' + (person.subject || '') + '</div>'
          if (person.teacher_group) infoHtml += '<div><span class="card-label">Group:</span> ' + person.teacher_group + '</div>'
          infoHtml += '<div><span class="card-label">Joining:</span> ' + (person.joining_date || '') + '</div>'
          if (person.blood_group) infoHtml += '<div><span class="card-label">Blood:</span> ' + person.blood_group + '</div>'
        } else {
          infoHtml += '<div><span class="card-label">Designation:</span> ' + (person.designation || '') + '</div>'
          infoHtml += '<div><span class="card-label">Joining:</span> ' + (person.joining_date || '') + '</div>'
          if (person.blood_group) infoHtml += '<div><span class="card-label">Blood:</span> ' + person.blood_group + '</div>'
        }

        let detailsHtml = ''
        if (type === 'students') {
          detailsHtml += '<div><span class="card-label">Father:</span> ' + (person.father_name || '-') + '</div>'
          detailsHtml += '<div><span class="card-label">Mother:</span> ' + (person.mother_name || '-') + '</div>'
        }
        detailsHtml += '<div><span class="card-label">Emergency Contact:</span> ' + emergency + '</div>'
        if (type === 'students' && person.date_of_birth) {
          detailsHtml += '<div><span class="card-label">DOB:</span> ' + person.date_of_birth + '</div>'
        }
        if (type === 'teachers' || type === 'staff') {
          detailsHtml += '<div><span class="card-label">Email:</span> ' + (person.email || '-') + '</div>'
        }
        if (type === 'students' && person.address) {
          detailsHtml += '<div style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;"><span class="card-label">Address:</span> ' + person.address + '</div>'
        }

        const footerSigHtml = sigImgSrc
          ? '<div class="card-sig"><img src="' + sigImgSrc + '" alt="Principal Signature" /><span>Principal</span></div>'
          : ''

        const logoHtml = logoImgSrc
          ? '<div class="card-logo"><img src="' + logoImgSrc + '" alt="Logo" /></div>'
          : ''

        return '<div class="card">'
          + '<div class="card-header">'
          + '<div class="card-h-row">'
          + logoHtml
          + '<div class="card-h-text">'
          + '<div class="card-header-title">Miah Jinnah Alam<br/>Degree College</div>'
          + '<div class="card-addr">Garaganj, Shailkupa, Jhenaidah</div>'
          + '</div>'
          + '</div>'
          + '</div>'
          + '<div class="card-type-bar">' + TYPE_LABELS[type] + ' ID Card</div>'
          + '<div class="card-body">'
          + '<div class="card-photo">' + photoHtml + '</div>'
          + '<div class="card-name">' + person.name + '</div>'
          + '<div class="card-info">'
          + infoHtml
          + '</div>'
          + '<div class="card-details">'
          + detailsHtml
          + '</div>'
          + '</div>'
          + '<div class="card-footer">'
          + '<div class="card-f-row1">'
          + '<span>Valid: ' + year + '-' + (year + 1) + '</span>'
          + footerSigHtml
          + '</div>'
          + '<div class="card-f-row2">www.mjadc.ac.bd</div>'
          + '</div>'
          + '</div>'
      }

      const scale = cardWidth > 0 ? cardWidth / 53 : 1

      const printHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${TYPE_LABELS[type]} ID Cards</title>
  <style>
    @page { margin: 8mm; size: auto; }
    body { margin:0;padding:0;font-family:Arial,Helvetica,sans-serif; }
    .cards { display:flex;flex-direction:column;align-items:center;gap:${cardGap}mm; }
    .card {
      --s:${scale};
      width:${cardWidth}mm;box-sizing:border-box;
      border-radius:calc(6px * var(--s));border:calc(1.5px * var(--s)) solid #d1d5db;background:white;
      font-size:calc(9px * var(--s));color:#374151;
      ${cardHeight > 0 ? `min-height:${cardHeight}mm;` : ''}
    }
    .card-header {
      background:linear-gradient(135deg,#1e3a5f,#2563eb);
      padding:calc(7px * var(--s)) calc(10px * var(--s));color:white;
    }
    .card-h-row { display:flex;align-items:flex-start;gap:calc(8px * var(--s)); }
    .card-logo { width:calc(30px * var(--s));height:calc(30px * var(--s));flex-shrink:0;border-radius:50%;overflow:hidden;background:white;display:flex;align-items:center;justify-content:center;padding:calc(2px * var(--s));margin-top:calc(1px * var(--s)); }
    .card-logo img { width:100%;height:100%;object-fit:contain; }
    .card-h-text { flex:1; }
    .card-header-title { font-size:calc(11px * var(--s));font-weight:700;text-transform:uppercase;letter-spacing:0.3px;line-height:1.2; }
    .card-addr { font-size:calc(8px * var(--s));opacity:0.8;margin-top:calc(2px * var(--s)); }
    .card-type-bar { text-align:center;font-size:calc(9px * var(--s));font-weight:800;text-transform:uppercase;letter-spacing:1px;padding:calc(5px * var(--s));background:linear-gradient(135deg,#fbbf24,#f59e0b);color:#1e3a5f;border-bottom:calc(2px * var(--s)) solid #1e3a5f;text-shadow:calc(0.5px * var(--s)) calc(0.5px * var(--s)) 0 rgba(255,255,255,0.3); }
    .card-body { padding:calc(8px * var(--s)) calc(10px * var(--s)); }
    .card-photo {
      width:calc(60px * var(--s));height:calc(75px * var(--s));margin:0 auto;
      border-radius:calc(4px * var(--s));border:calc(1px * var(--s)) solid #d1d5db;
      overflow:hidden;background:#f3f4f6;display:flex;align-items:center;justify-content:center;
    }
    .card-name { font-weight:700;font-size:calc(11px * var(--s));color:#111827;text-align:center;margin-top:calc(5px * var(--s)); }
    .card-info { margin-top:calc(5px * var(--s));font-size:calc(9px * var(--s)); }
    .card-info > div { margin-bottom:calc(2px * var(--s)); }
    .card-label { font-weight:600;color:#4b5563; }
    .card-details {
      margin-top:calc(5px * var(--s));font-size:calc(8.5px * var(--s));color:#4b5563;
      border-top:calc(0.5px * var(--s)) solid #d1d5db;padding-top:calc(4px * var(--s));
    }
    .card-details > div { margin-bottom:calc(2px * var(--s)); }
    .card-sig { display:flex;flex-direction:column;align-items:center;margin-top:calc(4px * var(--s)); }
    .card-sig img { max-height:calc(18px * var(--s));max-width:calc(70px * var(--s));width:auto;height:auto;display:block; }
    .card-sig span { font-size:calc(7px * var(--s));color:#4b5563;font-weight:600; }
    .card-footer {
      border-top:calc(1px * var(--s)) solid #d1d5db;padding:calc(5px * var(--s)) calc(10px * var(--s));
      font-size:calc(8px * var(--s));color:#6b7280;
    }
    .card-f-row1 { display:flex;justify-content:space-between;align-items:center; }
    .card-f-row2 { text-align:center;margin-top:calc(3px * var(--s));padding:calc(3px * var(--s)) 0;font-size:calc(7px * var(--s));color:white;background:linear-gradient(135deg,#1e3a5f,#2563eb);font-weight:600;letter-spacing:0.3px;border-radius:calc(3px * var(--s)); }
    @media print {
      body { -webkit-print-color-adjust:exact;print-color-adjust:exact; }
    }
  </style>
</head>
<body>
<div class="cards">
${selectedPeople.map((p) => cardHtml(p)).join('\n')}
</div>
<script>
function doPrint() { window.print(); setTimeout(function() { window.close(); }, 1000); }
var imgs = document.querySelectorAll('img'), n = imgs.length, c = 0, done = false;
function check() { if (!done && ++c >= n) { done = true; doPrint(); } }
if (n === 0) { doPrint(); }
else { for (var i = 0; i < n; i++) { imgs[i].complete ? check() : (imgs[i].onload = check, imgs[i].onerror = check); } }
setTimeout(function() { if (!done) { done = true; doPrint(); } }, 8000);
<\/script>
</body>
</html>`

      const printWin = window.open('', '_blank')
      if (!printWin) {
        alert('Popup blocked. Please allow popups for this site.')
        return
      }
      printWin.document.write(printHtml)
      printWin.document.close()
    } catch (err) {
      console.error('Print error:', err)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <PanelLayout role="admin" title="ID Cards">
      <div className="mx-auto" style={{ width: '90vw', maxWidth: 1200 }}>
        <div className="mb-6 flex items-center justify-between">
          <h1 className="flex items-center gap-2 text-2xl font-bold text-gray-800">
            <CreditCard className="h-6 w-6" /> ID Cards
          </h1>
        </div>

        <Card>
          <CardContent className="space-y-4 p-6">
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Select Type</label>
                <select
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={type}
                  onChange={(e) => setType(e.target.value as CardType)}
                >
                  <option value="students">Students</option>
                  <option value="teachers">Teachers</option>
                  <option value="staff">Staff</option>
                </select>
              </div>

              <div className="flex-1">
                <label className="mb-1 block text-sm font-medium text-gray-700">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    className="w-full rounded-lg border border-gray-300 py-2 pl-9 pr-3 text-sm"
                    placeholder="Search by name, ID, designation..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={toggleAll}>
                  {allSelected ? <Square className="h-4 w-4" /> : <CheckSquare className="h-4 w-4" />}
                  {allSelected ? 'Deselect All' : 'Select All'}
                </Button>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || generating}
                  onClick={downloadSelected}
                >
                  {generating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Download PDF ({selected.size})
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="mt-4">
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="p-8 text-center text-sm text-gray-500">Loading...</div>
              ) : filtered.length === 0 ? (
                <div className="p-8 text-center text-sm text-gray-500">No records found</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                        <th className="w-10 px-4 py-3">
                          <input
                            type="checkbox"
                            checked={allSelected}
                            onChange={toggleAll}
                            className="h-4 w-4 rounded border-gray-300"
                          />
                        </th>
                        <th className="px-4 py-3">Photo</th>
                        <th className="px-4 py-3">Name</th>
                        <th className="px-4 py-3">
                          {type === 'students' ? 'ID' : 'Designation'}
                        </th>
                        <th className="px-4 py-3">
                          {type === 'students' ? 'Class' : 'Mobile'}
                        </th>
                        <th className="px-4 py-3">Emergency Contact</th>
                        <th className="px-4 py-3">Blood Group</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {filtered.map((person) => (
                        <tr
                          key={person.id}
                          className={`cursor-pointer transition-colors hover:bg-blue-50 ${
                            selected.has(person.id) ? 'bg-blue-50' : ''
                          }`}
                          onClick={() => toggle(person.id)}
                        >
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              checked={selected.has(person.id)}
                              onChange={() => toggle(person.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="h-4 w-4 rounded border-gray-300"
                            />
                          </td>
                          <td className="px-4 py-2">
                            <div className="h-10 w-10 overflow-hidden rounded-full border border-gray-200 bg-gray-100">
                              {cardPhotoUrl(person) ? (
                                <img
                                  src={cardPhotoUrl(person)!}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-xs font-bold text-gray-400">
                                  {String(person.gender === 'female' ? 'F' : 'M')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">
                            {String(person.name)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {type === 'students'
                              ? String(person.student_id || '-')
                              : String(person.designation || '-')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {type === 'students'
                              ? `${person.class || ''}${person.section ? `(${person.section})` : ''}`
                              : String(person.mobile || '-')}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {emergencyContact(person, type)}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-600">
                            {String(person.blood_group || '-')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PanelLayout>
  )
}
