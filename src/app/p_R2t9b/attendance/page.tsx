'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Card, CardContent } from '@/components/ui'
import { api } from '@/lib/api'
import { Check, X, Save, BarChart3 } from 'lucide-react'

interface Student {
  id: number
  student_id: string
  name: string
}

interface AttendanceRecord {
  student_id: number
  status: 'present' | 'absent'
}

interface StatsRecord {
  student_id: string
  name: string
  total_classes: number
  attended: number
  percentage: number
}

export default function TeacherAttendancePage() {
  const [subjects, setSubjects] = useState<string[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')
  const [selectedClass, setSelectedClass] = useState('11th')
  const [selectedDate, setSelectedDate] = useState(() => {
    const d = new Date()
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
  })
  const [students, setStudents] = useState<Student[]>([])
  const [attendance, setAttendance] = useState<Record<number, 'present' | 'absent'>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [stats, setStats] = useState<StatsRecord[]>([])
  const [showStats, setShowStats] = useState(false)

  useEffect(() => {
    api.get<{ status: number; data: string[] }>('/teacher/subjects')
      .then((res) => {
        const subs = res.data || []
        setSubjects(subs)
        if (subs.length) setSelectedSubject(subs[0])
      })
      .catch(() => {})
  }, [])

  const loadStudents = async () => {
    if (!selectedSubject || !selectedClass) return
    setLoading(true)
    setSaved(false)
    setStats([])
    setShowStats(false)
    try {
      const [studRes, attRes] = await Promise.all([
        api.get<{ status: number; data: Student[] }>(`/teacher/attendance/students?subject=${encodeURIComponent(selectedSubject)}&class=${encodeURIComponent(selectedClass)}`),
        api.get<{ status: number; data: Record<number, string> }>(`/teacher/attendance/records?subject=${encodeURIComponent(selectedSubject)}&class=${encodeURIComponent(selectedClass)}&date=${selectedDate}`),
      ])
      const studs = studRes.data || []
      setStudents(studs)
      const attMap: Record<number, 'present' | 'absent'> = {}
      const existing = attRes.data || {}
      for (const s of studs) {
        attMap[s.id] = existing[s.id] === 'absent' ? 'absent' : 'present'
      }
      setAttendance(attMap)
    } catch {
      setStudents([])
      setAttendance({})
    } finally {
      setLoading(false)
    }
  }

  const toggleStatus = (studentId: number) => {
    setAttendance((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'present' ? 'absent' : 'present',
    }))
  }

  const saveAttendance = async () => {
    if (!selectedSubject || !selectedClass || !selectedDate || students.length === 0) return
    setSaving(true)
    try {
      const records: AttendanceRecord[] = students.map((s) => ({
        student_id: s.id,
        status: attendance[s.id] || 'present',
      }))
      await api.post('/teacher/attendance/save', {
        subject: selectedSubject,
        class: selectedClass,
        date: selectedDate,
        records,
      })
      setSaved(true)
    } catch {
      alert('Failed to save attendance')
    } finally {
      setSaving(false)
    }
  }

  const loadStats = async () => {
    if (!selectedSubject || !selectedClass) return
    try {
      const res = await api.get<{ status: number; data: StatsRecord[] }>(`/teacher/attendance/stats?subject=${encodeURIComponent(selectedSubject)}&class=${encodeURIComponent(selectedClass)}`)
      setStats(res.data || [])
      setShowStats(true)
    } catch {
      setStats([])
    }
  }

  const presentCount = students.filter((s) => (attendance[s.id] || 'present') === 'present').length
  const absentCount = students.length - presentCount

  return (
    <PanelLayout role="teacher" title="Attendance">
      <div className="mx-auto" style={{ width: '90vw', maxWidth: 1200 }}>
        <Card className="mb-6">
          <CardContent className="space-y-4 p-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Subject</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                >
                  <option value="">Select Subject</option>
                  {subjects.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Class</label>
                <select
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={selectedClass}
                  onChange={(e) => setSelectedClass(e.target.value)}
                >
                  <option value="11th">11th</option>
                  <option value="12th">12th</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Date</label>
                <input
                  type="date"
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                />
              </div>
              <div className="flex items-end gap-2">
                <Button onClick={loadStudents} disabled={!selectedSubject || !selectedClass || loading}>
                  {loading ? 'Loading...' : 'Load'}
                </Button>
                <Button variant="outline" onClick={loadStats} disabled={!selectedSubject || !selectedClass}>
                  <BarChart3 className="mr-1 h-4 w-4" /> Stats
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {students.length > 0 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-800">
                  {selectedSubject} - {selectedClass}
                  <span className="ml-3 text-sm font-normal text-gray-500">{selectedDate}</span>
                </h3>
                <div className="flex items-center gap-4 text-sm">
                  <span className="text-green-600 font-medium">Present: {presentCount}</span>
                  <span className="text-red-600 font-medium">Absent: {absentCount}</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="w-12 px-4 py-3">SL</th>
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="w-40 px-4 py-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {students.map((s, i) => (
                      <tr key={s.id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm text-gray-500">{i + 1}</td>
                        <td className="px-4 py-2 text-sm font-mono text-gray-700">{s.student_id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.name}</td>
                        <td className="px-4 py-2 text-center">
                          <button
                            onClick={() => toggleStatus(s.id)}
                            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                              (attendance[s.id] || 'present') === 'present'
                                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                : 'bg-red-100 text-red-700 hover:bg-red-200'
                            }`}
                          >
                            {(attendance[s.id] || 'present') === 'present' ? (
                              <><Check className="h-3 w-3" /> Present</>
                            ) : (
                              <><X className="h-3 w-3" /> Absent</>
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 flex items-center gap-3">
                <Button onClick={saveAttendance} disabled={saving || students.length === 0}>
                  {saving ? 'Saving...' : <><Save className="mr-1 h-4 w-4" /> Save Attendance</>}
                </Button>
                {saved && <span className="text-sm text-green-600 font-medium">Saved successfully!</span>}
              </div>
            </CardContent>
          </Card>
        )}

        {showStats && stats.length > 0 && (
          <Card>
            <CardContent className="p-6">
              <h3 className="mb-4 text-lg font-semibold text-gray-800">Attendance Statistics</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                      <th className="px-4 py-3">Student ID</th>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3 text-center">Total Classes</th>
                      <th className="px-4 py-3 text-center">Attended</th>
                      <th className="px-4 py-3 text-center">Percentage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {stats.map((s) => (
                      <tr key={s.student_id} className="transition-colors hover:bg-gray-50">
                        <td className="px-4 py-2 text-sm font-mono text-gray-700">{s.student_id}</td>
                        <td className="px-4 py-2 text-sm text-gray-900">{s.name}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-700">{s.total_classes}</td>
                        <td className="px-4 py-2 text-center text-sm text-gray-700">{s.attended}</td>
                        <td className="px-4 py-2 text-center">
                          <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            s.percentage >= 75 ? 'bg-green-100 text-green-700' :
                            s.percentage >= 50 ? 'bg-yellow-100 text-yellow-700' :
                            'bg-red-100 text-red-700'
                          }`}>
                            {s.percentage}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </PanelLayout>
  )
}
