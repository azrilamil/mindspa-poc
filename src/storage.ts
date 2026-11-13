import { CHECK_IN_QUESTIONS } from './data/prompts'
import { SYNTHETIC_ENTRIES } from './data/synthetic'
import type { CheckInAnswers, ProgressEntry } from './types'

export type { CheckInAnswers, ProgressEntry }

const STORAGE_KEY = 'mindspa-poc.progress.v1'
const SEEDED_KEY = 'mindspa-poc.seeded.v1'

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== 'undefined'
  } catch {
    return false
  }
}

export function averageAnswers(answers: CheckInAnswers): number {
  const values = CHECK_IN_QUESTIONS.map((q) => answers[q.id]).filter(
    (n) => typeof n === 'number',
  )
  if (values.length === 0) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return Math.round((sum / values.length) * 10) / 10
}

export function loadEntries(): ProgressEntry[] {
  if (!canUseStorage()) return [...SYNTHETIC_ENTRIES]
  try {
    if (localStorage.getItem(SEEDED_KEY) !== '1') {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(SYNTHETIC_ENTRIES))
      localStorage.setItem(SEEDED_KEY, '1')
    }
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return [...SYNTHETIC_ENTRIES]
    const parsed = JSON.parse(raw) as ProgressEntry[]
    if (!Array.isArray(parsed)) return [...SYNTHETIC_ENTRIES]
    return parsed
  } catch {
    return [...SYNTHETIC_ENTRIES]
  }
}

export function saveEntries(entries: ProgressEntry[]): void {
  if (!canUseStorage()) return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
}

export function addEntry(entry: Omit<ProgressEntry, 'id'>): ProgressEntry[] {
  const next: ProgressEntry = {
    ...entry,
    id: `${entry.kind}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
  }
  const entries = [next, ...loadEntries()]
  saveEntries(entries)
  return entries
}

export function resetDemoData(): ProgressEntry[] {
  const entries = [...SYNTHETIC_ENTRIES]
  if (canUseStorage()) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
    localStorage.setItem(SEEDED_KEY, '1')
  }
  return entries
}
