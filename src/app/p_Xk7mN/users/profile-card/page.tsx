'use client'

// Admin › Users › Dashboard Profile Card (Session 122).
// Choose which details show on users' dashboard cards — for everyone, or a custom set for chosen users —
// and the retirement age used for "Retired Date" (date of birth + age).

import { useEffect, useMemo, useState } from 'react'
import { PanelLayout } from '@/components/layout'
import { Badge, Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'

type Fields = Record<string, boolean>
interface U { id: number; name: string; email: string; status: string; roles: string[]; custom: boolean; fields: Fields | null }
interface Extra { id?: string; label: string; source: string }
interface Source { key: string; label: string; applies: string }
interface Data { fields: string[]; default: Fields; retirement_age: number; users: U[]; extras: Extra[]; sources: Source[] }

const LABEL: Record<string, string> = {
  photo: 'Profile picture', name: 'Name', designation: 'Designation', mobile: 'Mobile number',
  joining_date: 'Joining date', experience: 'Experience', retired_date: 'Retired date',
  subject: 'Subject (teachers)', mpo_index: 'Index (MPO)', pds_id: 'PDS ID',
}
const ROLES = ['admin', 'principal', 'administration', 'exam_controller', 'teacher', 'staff', 'student']
const inputCls = 'h-10 rounded-lg border border-gray-300 bg-white px-2 text-sm focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-200'

function FieldToggles({ keys, value, onChange, labels }: { keys: string[]; value: Fields; onChange: (v: Fields) => void; labels: Record<string, string> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {keys.map((k) => (
        <label key={k} className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <input type="checkbox" checked={!!value[k]} onChange={(e) => onChange({ ...value, [k]: e.target.checked })} />
          {labels[k] || k}
        </label>
      ))}
    </div>
  )
}

export default function ProfileCardSettingsPage() {
  const [data, setData] = useState<Data | null>(null)
  const [def, setDef] = useState<Fields>({})
  const [age, setAge] = useState(60)
  const [items, setItems] = useState<Extra[]>([]) // Session 125: items admin added to the card
  const [q, setQ] = useState('')
  const [role, setRole] = useState('')
  const [customOnly, setCustomOnly] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [custom, setCustom] = useState<Fields>({})
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const load = () => api.get<{ data: Data }>('/admin/profile-card').then((r) => {
    setData(r.data); setDef(r.data.default); setAge(r.data.retirement_age); setItems(r.data.extras || []); setCustom(r.data.default)
  }).catch((e: unknown) => setMsg({ ok: false, text: e instanceof Error ? e.message : 'Could not load' }))
  useEffect(() => { load() }, [])

  const list = useMemo(() => {
    if (!data) return []
    const s = q.trim().toLowerCase()
    return data.users.filter((u) => (!s || u.name.toLowerCase().includes(s) || (u.email || '').toLowerCase().includes(s))
      && (!role || u.roles.includes(role)) && (!customOnly || u.custom))
  }, [data, q, role, customOnly])

  const labels = useMemo(() => {
    const m: Record<string, string> = { ...LABEL }
    for (const x of data?.extras || []) if (x.id) m[`x_${x.id}`] = x.label
    return m
  }, [data])
  const sourceGroups = useMemo(() => {
    const g: Record<string, Source[]> = {}
    for (const s of data?.sources || []) {
      const name = s.key.startsWith('custom:') ? 'Custom fields' : s.applies === 'all' ? 'All users' : s.applies === 'students' ? 'Students' : 'Teachers & staff'
      ;(g[name] ||= []).push(s)
    }
    return g
  }, [data])
  const itemsDirty = JSON.stringify(items.map(({ label, source, id }) => ({ id, label, source }))) !== JSON.stringify((data?.extras || []).map(({ label, source, id }) => ({ id, label, source })))
  const saveItems = async () => {
    const bad = items.find((x) => !x.label.trim() || !x.source)
    if (bad) { setMsg({ ok: false, text: 'Give every added item a name and choose where its value comes from.' }); return }
    try {
      await api.put('/admin/profile-card/extras', { extras: items })
      setMsg({ ok: true, text: 'Card items saved. New items show for everyone — switch them off below if needed.' }); load()
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
  }

  const saveDefault = async () => {
    try {
      await api.put('/admin/profile-card/defaults', { fields: def, retirement_age: age })
      setMsg({ ok: true, text: 'Saved for all users (users with a custom set keep theirs).' }); load()
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
  }
  const setUsers = async (fields: Fields | null) => {
    if (!selected.length) return
    try {
      const r = await api.put<{ message: string }>('/admin/profile-card/users', { user_ids: selected, fields })
      setMsg({ ok: true, text: fields ? `${r.message}: custom card fields saved.` : `${r.message}: back to the default.` })
      setSelected([]); load()
    } catch (e: unknown) { setMsg({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }) }
  }

  return (
    <PanelLayout role="admin" title="Dashboard Profile Card">
      <div className="mx-auto max-w-5xl space-y-4">
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-sm text-blue-900">
          Every dashboard shows a profile card. Choose what it shows — for everyone, or a different set for chosen users.
          Users can change only their own <b>dashboard</b> picture; the public website photo is not affected.
        </p>
        {msg && <p role="status" className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-700'}`}>{msg.text}</p>}

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold text-gray-900">For all users (default)</h3>
            {data && <FieldToggles keys={data.fields} value={def} onChange={setDef} labels={labels} />}
            <div className="space-y-2 rounded-lg border border-dashed border-gray-300 p-3">
              <p className="text-sm font-medium text-gray-900">Added items</p>
              <p className="text-xs text-gray-500">Show more details on the card — give the item a name and choose where its value comes from. An item is hidden for anyone who has no value for it.</p>
              {items.map((x, i) => (
                <div key={x.id || 'new' + i} className="flex flex-wrap items-center gap-2">
                  <input value={x.label} maxLength={40} placeholder="Name on the card, e.g. Blood Group" aria-label={`Item ${i + 1} name`}
                    onChange={(e) => setItems(items.map((y, j) => (j === i ? { ...y, label: e.target.value } : y)))} className={`${inputCls} min-w-[200px] flex-1`} />
                  <select value={x.source} aria-label={`Item ${i + 1} value from`}
                    onChange={(e) => { const src = data?.sources.find((s) => s.key === e.target.value); setItems(items.map((y, j) => (j === i ? { ...y, source: e.target.value, label: y.label || (src ? src.label.replace(/ \(custom field\)$/, '') : '') } : y))) }}
                    className={`${inputCls} min-w-[200px] flex-1`}>
                    <option value="">Value from…</option>
                    {Object.entries(sourceGroups).map(([g, list]) => (
                      <optgroup key={g} label={g}>{list.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}</optgroup>
                    ))}
                  </select>
                  <Button size="sm" variant="ghost" onClick={() => setItems(items.filter((_, j) => j !== i))}>Remove</Button>
                </div>
              ))}
              <div className="flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={() => setItems([...items, { label: '', source: '' }])}>+ Add item</Button>
                <Button size="sm" onClick={saveItems} disabled={!itemsDirty}>Save items</Button>
              </div>
            </div>
            <label className="flex flex-wrap items-center gap-2 text-sm text-gray-700">
              Retirement age (Retired Date = date of birth +)
              <input type="number" min={40} max={80} value={age} onChange={(e) => setAge(Number(e.target.value))} className={`${inputCls} w-20`} aria-label="Retirement age" /> years
            </label>
            <Button onClick={saveDefault} disabled={!data}>Save for all users</Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="space-y-3 pt-6">
            <h3 className="font-semibold text-gray-900">For specific users</h3>
            <div className="flex flex-wrap items-center gap-2">
              <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or email" aria-label="Search users" className={`${inputCls} min-w-[220px] flex-1`} />
              <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Role" className={inputCls}>
                <option value="">All roles</option>
                {ROLES.map((r) => <option key={r} value={r}>{r.replace('_', ' ')}</option>)}
              </select>
              <label className="flex items-center gap-1 text-sm text-gray-700"><input type="checkbox" checked={customOnly} onChange={(e) => setCustomOnly(e.target.checked)} /> Custom only</label>
            </div>

            <div className="rounded-lg border border-gray-200 p-3">
              <p className="mb-2 text-sm text-gray-700">Fields for the <b>{selected.length}</b> selected user(s):</p>
              {data && <FieldToggles keys={data.fields} value={custom} onChange={setCustom} labels={labels} />}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button size="sm" onClick={() => setUsers(custom)} disabled={!selected.length}>Apply to selected</Button>
                <Button size="sm" variant="outline" onClick={() => setUsers(null)} disabled={!selected.length}>Reset selected to default</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(list.map((u) => u.id))}>Select all {list.length} shown</Button>
                {selected.length > 0 && <Button size="sm" variant="ghost" onClick={() => setSelected([])}>Clear selection</Button>}
              </div>
            </div>

            <div className="max-h-[520px] overflow-auto rounded-lg border border-gray-200">
              <table className="w-full min-w-[640px] text-sm">
                <thead className="sticky top-0 bg-gray-50 text-left text-xs uppercase tracking-wide text-gray-500">
                  <tr><th className="w-8 px-3 py-2"></th><th className="px-3 py-2">User</th><th className="px-3 py-2">Roles</th><th className="px-3 py-2">Card shows</th></tr>
                </thead>
                <tbody>
                  {list.map((u) => (
                    <tr key={u.id} className="border-t border-gray-100">
                      <td className="px-3 py-2"><input type="checkbox" aria-label={`Select ${u.name}`} checked={selected.includes(u.id)}
                        onChange={(e) => setSelected(e.target.checked ? [...selected, u.id] : selected.filter((x) => x !== u.id))} /></td>
                      <td className="px-3 py-2"><span className="font-medium text-gray-900">{u.name}</span><span className="block text-xs text-gray-500">{u.email}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-600">{u.roles.join(', ') || '—'}</td>
                      <td className="px-3 py-2">
                        {u.custom && u.fields
                          ? <span className="flex flex-wrap gap-1"><Badge variant="info">Custom</Badge>{Object.entries(u.fields).filter(([, on]) => !on).map(([k]) => <span key={k} className="text-xs text-gray-500 line-through">{labels[k] || k}</span>)}</span>
                          : <Badge>Default</Badge>}
                      </td>
                    </tr>
                  ))}
                  {data && !list.length && <tr><td colSpan={4} className="px-3 py-8 text-center text-gray-500">No users match.</td></tr>}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </PanelLayout>
  )
}
