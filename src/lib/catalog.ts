'use client'

// Admin-managed exam names + student groups (Session 88).
// Loaded once from GET /catalog and shared by every page; defaults are used until it arrives.

import { useSyncExternalStore } from 'react'
import { api } from '@/lib/api'

export interface CatalogGroup { name: string; code: string }
export interface Catalog {
  exam_names: Record<string, string[]>
  groups: CatalogGroup[]
}

export const DEFAULT_CATALOG: Catalog = {
  exam_names: {
    '11th': ['Half Yearly', 'Year Final', 'Model Test'],
    '12th': ['Pre-Test', 'Test', 'Model Test'],
  },
  groups: [
    { name: 'Science', code: '1' },
    { name: 'Business Studies', code: '2' },
    { name: 'Humanities', code: '3' },
  ],
}

let current: Catalog = DEFAULT_CATALOG
let loading: Promise<void> | null = null
const listeners = new Set<() => void>()

function emit() { for (const l of listeners) l() }

export function refreshCatalog(): Promise<void> {
  loading = api
    .get<{ data: Catalog }>('/catalog')
    .then((res) => {
      const d = res.data
      if (d && d.exam_names && Array.isArray(d.groups)) {
        current = { exam_names: { ...DEFAULT_CATALOG.exam_names, ...d.exam_names }, groups: d.groups }
        emit()
      }
    })
    .catch(() => { /* keep defaults */ })
  return loading
}

export function setCatalog(c: Partial<Catalog>) {
  current = { ...current, ...c }
  emit()
}

function subscribe(l: () => void) {
  listeners.add(l)
  if (!loading) void refreshCatalog()
  return () => { listeners.delete(l) }
}

const getSnapshot = () => current
const getServerSnapshot = () => DEFAULT_CATALOG

export function useCatalog(): Catalog {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}

/** { '11th': [...], '12th': [...] } — index with a class; unknown classes give undefined. */
export function useExamNames(): Record<string, string[]> {
  return useCatalog().exam_names
}

/** Group names in display order. */
const namesCache = new WeakMap<Catalog, string[]>()
const codesCache = new WeakMap<Catalog, Record<string, string>>()

export function useGroups(): string[] {
  const c = useCatalog()
  let v = namesCache.get(c)
  if (!v) { v = c.groups.map((g) => g.name); namesCache.set(c, v) }
  return v
}

/** Group name → Student ID group digit. */
export function useGroupCodes(): Record<string, string> {
  const c = useCatalog()
  let v = codesCache.get(c)
  if (!v) { v = Object.fromEntries(c.groups.map((g) => [g.name, g.code])); codesCache.set(c, v) }
  return v
}

type Opt = { value: string; label: string }
const optCache = new WeakMap<Catalog, Map<string, Opt[]>>()

/** Select options for the student groups, with optional fixed entries before / after (e.g. "All Groups", "General"). */
export function useGroupOptions(before: Opt[] = [], after: Opt[] = []): Opt[] {
  const c = useCatalog()
  const key = JSON.stringify([before, after])
  let m = optCache.get(c)
  if (!m) { m = new Map(); optCache.set(c, m) }
  let v = m.get(key)
  if (!v) {
    const extra = new Set([...before, ...after].map((o) => o.value))
    v = [...before, ...c.groups.filter((g) => !extra.has(g.name)).map((g) => ({ value: g.name, label: g.name })), ...after]
    m.set(key, v)
  }
  return v
}
