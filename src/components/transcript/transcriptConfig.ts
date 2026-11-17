'use client'

// Transcript layout settings (Session 84) — stored in site setting "transcript_config" (JSON).
// Admin chooses which student information appears (built-in fields + any custom entry field, in order),
// which blocks are shown, and the watermark logo brightness/size. Read by every panel's transcript.

import { useCallback, useEffect, useState } from 'react'
import { api } from '@/lib/api'
import type { TranscriptData } from './TranscriptGenerator'

export interface TranscriptConfig {
  /** info items in display order: built-in keys or "custom:<field label>" */
  fields: string[]
  show: { photo: boolean; qr: boolean; grading: boolean; summary: boolean; position: boolean }
  /** opacity 0–0.5 ("brightness"), size 20–100 (% of sheet width), 0 opacity hides it,
   *  x / y = centre of the logo in % of the page (dragged with the mouse in the preview) */
  watermark: { opacity: number; size: number; x: number; y: number }
}

export const BUILTIN_FIELDS: { key: string; label: string; get: (t: TranscriptData) => string }[] = [
  { key: 'name', label: 'Student Name', get: (t) => t.name },
  { key: 'father_name', label: "Father's Name", get: (t) => t.father_name },
  { key: 'mother_name', label: "Mother's Name", get: (t) => t.mother_name },
  { key: 'student_id', label: 'Roll Number', get: (t) => t.student_id },
  { key: 'class_roll', label: 'Class Roll', get: (t) => t.class_roll || '' },
  { key: 'registration_no', label: 'Registration No', get: (t) => t.registration_no || '' },
  { key: 'date_of_birth', label: 'Date of Birth', get: (t) => t.date_of_birth || '' },
  { key: 'class', label: 'Class', get: (t) => t.class },
  { key: 'group', label: 'Group', get: (t) => t.group || '' },
  { key: 'academic_session', label: 'Academic Session', get: (t) => t.academic_session },
  { key: 'hsc_batch', label: 'HSC Batch', get: (t) => t.hsc_batch || '' },
  { key: 'student_type', label: 'Student Type', get: (t) => t.student_type },
]

export const DEFAULT_TRANSCRIPT_CONFIG: TranscriptConfig = {
  fields: ['name', 'father_name', 'mother_name', 'student_id', 'registration_no', 'date_of_birth', 'class', 'group', 'academic_session', 'student_type'],
  show: { photo: true, qr: true, grading: true, summary: true, position: true },
  watermark: { opacity: 0.12, size: 62, x: 50, y: 55 },
}

export const fieldLabel = (key: string) =>
  key.startsWith('custom:') ? key.slice(7) : BUILTIN_FIELDS.find((f) => f.key === key)?.label || key

/** [label, value] rows for the info grid, in the configured order. */
export function infoRows(t: TranscriptData, cfg: TranscriptConfig): [string, string][] {
  return cfg.fields.map((key) => {
    if (key.startsWith('custom:')) {
      const label = key.slice(7)
      const custom = (t.custom || {}) as Record<string, unknown>
      const hit = Object.keys(custom).find((k) => k.trim().toLowerCase() === label.trim().toLowerCase())
      return [label, hit ? String(custom[hit] ?? '') || 'N/A' : 'N/A']
    }
    const f = BUILTIN_FIELDS.find((x) => x.key === key)
    return [f?.label || key, (f?.get(t) || '').toString() || 'N/A']
  })
}

/** Merge a stored (possibly partial / older) config over the defaults, clamping numbers. */
export function normalizeConfig(raw: unknown): TranscriptConfig {
  const d = DEFAULT_TRANSCRIPT_CONFIG
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<TranscriptConfig>
  const clamp = (v: unknown, lo: number, hi: number, def: number) => {
    const n = Number(v)
    return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def
  }
  return {
    fields: Array.isArray(r.fields) ? r.fields.filter((x) => typeof x === 'string') : d.fields,
    show: { ...d.show, ...(r.show || {}) },
    watermark: {
      opacity: clamp(r.watermark?.opacity, 0, 0.5, d.watermark.opacity),
      size: clamp(r.watermark?.size, 20, 100, d.watermark.size),
      x: clamp(r.watermark?.x, 0, 100, d.watermark.x),
      y: clamp(r.watermark?.y, 0, 100, d.watermark.y),
    },
  }
}

/** Load the saved config (public setting, so every panel can read it). */
export function useTranscriptConfig(): [TranscriptConfig, () => void] {
  const [cfg, setCfg] = useState<TranscriptConfig>(DEFAULT_TRANSCRIPT_CONFIG)
  const [v, setV] = useState(0)
  useEffect(() => {
    let alive = true
    api.get<{ data?: { setting_value?: string } }>('/settings/transcript_config')
      .then((r) => {
        if (!alive) return
        try { setCfg(normalizeConfig(JSON.parse(r.data?.setting_value || '{}'))) } catch { setCfg(DEFAULT_TRANSCRIPT_CONFIG) }
      })
      .catch(() => {})
    return () => { alive = false }
  }, [v])
  return [cfg, useCallback(() => setV((x) => x + 1), [])]
}

export async function saveTranscriptConfig(cfg: TranscriptConfig): Promise<void> {
  await api.put('/admin/settings/transcript_config', { setting_value: JSON.stringify(normalizeConfig(cfg)) })
}
