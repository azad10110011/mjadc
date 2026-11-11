'use client'

import { useState, useEffect } from 'react'
import { PanelLayout } from '@/components/layout'
import { Button, Select, Card, CardContent } from '@/components/ui'
import { EXAM_NAMES, type StudentClass } from '@/types'
import { api } from '@/lib/api'
import { Save } from 'lucide-react'

interface SubjectGroup {
  id: number
  name: string
  papers: { id: number; name: string }[]
}

interface ExamPaperSelection {
  subject_id: number
  paper_id: number | null
  selection_key: string
  display_mode: 'separate' | 'average'
  paper_name?: string | null
}

const selectionKey = (subjectId: number, paperId: number | null) =>
  paperId === null ? `subject-${subjectId}` : `paper-${paperId}`

export default function ExamPaperSelectionPage() {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [cls, setCls] = useState('')
  const [examName, setExamName] = useState('')

  const [subjectTree, setSubjectTree] = useState<SubjectGroup[]>([])
  const [paperSelections, setPaperSelections] = useState<Record<string, boolean>>({})
  const [paperModes, setPaperModes] = useState<Record<number, 'separate' | 'average'>>({})
  const [configLoading, setConfigLoading] = useState(false)
  const [configSaving, setConfigSaving] = useState(false)
  const [configDirty, setConfigDirty] = useState(false)
  const [configured, setConfigured] = useState(false)
  const [configError, setConfigError] = useState('')
  const [saveSuccess, setSaveSuccess] = useState('')

  const years = Array.from({ length: 25 }, (_, i) => ({ value: String(2026 + i), label: String(2026 + i) }))
  const examOptions = cls ? EXAM_NAMES[cls as StudentClass]?.map((e) => ({ value: e, label: e })) : []

  useEffect(() => {
    api.get<{ status: number; data: SubjectGroup[] }>('/admin/subjects/tree')
      .then((res) => setSubjectTree(res.data))
      .catch((err: unknown) => setConfigError(err instanceof Error ? err.message : 'Failed to load subjects'))
  }, [])

  useEffect(() => {
    if (!cls || !examName || !year) return

    let active = true
    const params = new URLSearchParams({ year, class: cls, exam_name: examName })
    const resetState = () => {
      setConfigLoading(true)
      setConfigError('')
      setSaveSuccess('')
      setPaperSelections({})
      setPaperModes({})
      setConfigured(false)
      setConfigDirty(false)
    }
    const timer = window.setTimeout(resetState, 0)
    api.get<{
      status: number
      data: { configured: boolean; selections: ExamPaperSelection[] }
    }>(`/admin/exam-papers?${params}`)
      .then((res) => {
        if (!active) return
        const selected: Record<string, boolean> = {}
        const modes: Record<number, 'separate' | 'average'> = {}
        res.data.selections.forEach((selection) => {
          selected[selection.selection_key] = true
          modes[selection.subject_id] = selection.display_mode
        })
        setPaperSelections(selected)
        setPaperModes(modes)
        setConfigured(res.data.configured)
        setConfigDirty(false)
      })
      .catch((err: unknown) => {
        if (active) setConfigError(err instanceof Error ? err.message : 'Failed to load exam paper settings')
      })
      .finally(() => {
        if (active) setConfigLoading(false)
      })

    return () => { active = false; window.clearTimeout(timer) }
  }, [year, cls, examName])

  const handleSave = async () => {
    const selections = subjectTree.flatMap((subject) => {
      const choices = subject.papers.length > 0
        ? subject.papers.map((paper) => ({ paperId: paper.id }))
        : [{ paperId: null }]
      const selected = choices.filter(({ paperId }) => paperSelections[selectionKey(subject.id, paperId)])
      const mode = selected.length > 1 ? (paperModes[subject.id] || 'separate') : 'separate'
      return selected.map(({ paperId }) => ({
        subject_id: subject.id,
        paper_id: paperId,
        display_mode: mode,
      }))
    })

    if (selections.length === 0) {
      setConfigError('Select at least one paper for this exam')
      return
    }

    setConfigSaving(true)
    setConfigError('')
    setSaveSuccess('')
    try {
      await api.put('/admin/exam-papers', { year, class: cls, exam_name: examName, selections })
      setConfigured(true)
      setConfigDirty(false)
      setSaveSuccess('Exam paper configuration saved successfully')
    } catch (err: unknown) {
      setConfigError(err instanceof Error ? err.message : 'Failed to save exam paper settings')
    } finally {
      setConfigSaving(false)
    }
  }

  return (
    <PanelLayout role="admin" title="Exam Paper Selection">
      <Card className="mb-6">
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Select label="Year" options={years} value={year} onChange={(e) => setYear(e.target.value)} />
            <Select label="Class" options={[{ value: '11th', label: '11th' }, { value: '12th', label: '12th' }]}
              value={cls} onChange={(e) => { setCls(e.target.value); setExamName('') }} placeholder="Select Class" />
            <Select label="Exam Name" options={examOptions} value={examName}
              onChange={(e) => setExamName(e.target.value)} placeholder={cls ? 'Select Exam' : 'Select class first'} disabled={!cls} />
          </div>
        </CardContent>
      </Card>

      {cls && examName && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div>
              <h3 className="font-semibold text-gray-900">Exam Paper Selection</h3>
              <p className="mt-1 text-sm text-gray-500">
                Choose which papers belong to this exam. A single selected paper keeps its paper name in the transcript.
                For multiple papers in one subject, choose whether to show each paper separately or show their average mark.
              </p>
            </div>
            {configLoading ? (
              <p className="text-sm text-gray-500">Loading exam paper settings...</p>
            ) : (
              <div className="grid gap-4 lg:grid-cols-2">
                {subjectTree.map((subject) => {
                  const choices = subject.papers.length > 0
                    ? subject.papers.map((paper) => ({ id: paper.id, name: paper.name, paperId: paper.id }))
                    : [{ id: subject.id, name: subject.name, paperId: null }]
                  const selectedCount = choices.filter(({ paperId }) => paperSelections[selectionKey(subject.id, paperId)]).length

                  return (
                    <div key={subject.id} className="rounded-lg border border-gray-200 p-4">
                      <h4 className="mb-2 font-medium text-gray-800">{subject.name}</h4>
                      <div className="space-y-2">
                        {choices.map((choice) => {
                          const key = selectionKey(subject.id, choice.paperId)
                          return (
                            <label key={key} className="flex items-center gap-2 text-sm text-gray-700">
                              <input
                                type="checkbox"
                                checked={!!paperSelections[key]}
                                disabled={configSaving || !!configError}
                                onChange={(event) => {
                                  setPaperSelections((current) => ({ ...current, [key]: event.target.checked }))
                                  setConfigDirty(true)
                                  setSaveSuccess('')
                                }}
                              />
                              {choice.name}
                            </label>
                          )
                        })}
                      </div>
                      {selectedCount > 1 && (
                        <div className="mt-3">
                          <Select
                            label="Transcript calculation"
                            options={[
                              { value: 'separate', label: 'Show each paper separately' },
                              { value: 'average', label: 'Show average mark as one subject' },
                            ]}
                            value={paperModes[subject.id] || 'separate'}
                            disabled={configSaving || !!configError}
                            onChange={(event) => {
                              setPaperModes((current) => ({ ...current, [subject.id]: event.target.value as 'separate' | 'average' }))
                              setConfigDirty(true)
                              setSaveSuccess('')
                            }}
                          />
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {configError && <p className="text-sm text-red-600">{configError}</p>}
            {saveSuccess && <p className="text-sm text-green-600">{saveSuccess}</p>}
            {!configLoading && !configError && !configured && (
              <p className="text-sm text-amber-700">No paper selection has been saved for this exam yet.</p>
            )}
            {configDirty && <p className="text-sm text-amber-700">Save your changes before generating the transcript.</p>}
            <Button
              variant="primary"
              onClick={handleSave}
              disabled={configLoading || configSaving || !configDirty || !!configError}
            >
              <Save className="mr-2 h-4 w-4" />
              {configSaving ? 'Saving...' : 'Save Exam Papers'}
            </Button>
          </CardContent>
        </Card>
      )}
    </PanelLayout>
  )
}
