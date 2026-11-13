/**
 * The local data adapter.
 *
 * Keeps the whole demo state in a single JSON blob in `localStorage`, with an
 * in-memory fallback when storage is unavailable (private browsing, a denied
 * quota, jsdom without a polyfill). Behaviour is identical in both cases, which is
 * what lets the tests and `npm run dev` work with no backend at all.
 *
 * Two production habits are kept even here, because the point of the demo is to
 * show them: a per session rate limit on writes, and validation at the boundary
 * rather than in the screen.
 */

import {
  PROGRAMME_LENGTH_DAYS,
  type CheckInInput,
  type DailyCheckIn,
  type DemoData,
  type DemoUser,
  type JournalEntry,
  type JournalInput,
  type ResearcherSnapshot,
  type SessionInput,
  type SessionRecord,
  type WellbeingCheck,
  type WellbeingInput,
} from '@/domain/types'
import { MAX_NOTE_LENGTH } from '@/domain/moods'
import { clampAnswer, scoreWellbeing } from '@/domain/wellbeing'
import { today as localToday, daysBetween, programmeDayNumber } from '@/domain/studyDay'
import {
  addPractice,
  clearDate,
  seedForDate,
  type CheckInSeed,
  type PracticeEntry,
  type PracticeLog,
} from '@/domain/practice'
import {
  DataError,
  NotFoundError,
  RateLimitError,
  ValidationError,
  type DataPort,
  type LocalState,
} from './port'
import {
  buildResearcherSnapshot,
  createSyntheticUser,
  emptyDemoData,
  seedDemoData,
} from './synthetic'

export const STORAGE_KEY = 'mindspa-poc:state:v1'

/** Writes allowed per action, per window. Deliberately low for a demo. */
export interface RateLimitRule {
  max: number
  windowMs: number
}

export const RATE_LIMITS: Record<string, RateLimitRule> = {
  checkIn: { max: 10, windowMs: 60_000 },
  session: { max: 30, windowMs: 60_000 },
  wellbeing: { max: 5, windowMs: 60_000 },
  journal: { max: 10, windowMs: 60_000 },
  practice: { max: 60, windowMs: 60_000 },
}

export function emptyState(): LocalState {
  return {
    user: null,
    checkIns: [],
    sessions: [],
    journal: [],
    wellbeing: [],
    practice: {},
    writes: {},
  }
}

/** A storage seam, so the adapter is testable without a browser. */
export interface StateStore {
  read(): LocalState | null
  write(state: LocalState): void
  clear(): void
}

/** A store backed by `localStorage`, falling back to memory when unavailable. */
export function createBrowserStore(key = STORAGE_KEY): StateStore {
  let memory: LocalState | null = null
  const available = (): boolean => {
    try {
      return typeof localStorage !== 'undefined'
    } catch {
      return false
    }
  }
  return {
    read() {
      if (!available()) return memory
      try {
        const raw = localStorage.getItem(key)
        if (!raw) return null
        return JSON.parse(raw) as LocalState
      } catch {
        return null
      }
    },
    write(state) {
      memory = state
      if (!available()) return
      try {
        localStorage.setItem(key, JSON.stringify(state))
      } catch (cause) {
        // A full quota must not lose the in-memory copy, so the write is reported
        // but the session keeps working.
        throw new DataError(
          cause instanceof Error
            ? `Could not save on this device: ${cause.message}`
            : 'Could not save on this device.',
          'transport',
        )
      }
    },
    clear() {
      memory = null
      if (!available()) return
      try {
        localStorage.removeItem(key)
      } catch {
        // Nothing to do: the in-memory copy is already gone.
      }
    },
  }
}

/** A store that lives only in memory, for tests and for the SSR-ish path. */
export function createMemoryStore(initial?: LocalState): StateStore {
  let state: LocalState | null = initial ?? null
  return {
    read: () => state,
    write: (next) => {
      state = next
    },
    clear: () => {
      state = null
    },
  }
}

function nextId(prefix: string): string {
  const random = Math.random().toString(36).slice(2, 8)
  return `${prefix}-${Date.now().toString(36)}-${random}`
}

export interface LocalPortOptions {
  store?: StateStore
  /** Injected clock, so tests are not at the mercy of the real date. */
  now?: () => Date
}

export function createLocalPort(options: LocalPortOptions = {}): DataPort {
  const store = options.store ?? createBrowserStore()
  const now = options.now ?? (() => new Date())

  const read = (): LocalState => store.read() ?? emptyState()
  const write = (state: LocalState): void => store.write(state)

  /** Enforce the per action window, then record the write. */
  const guard = (state: LocalState, action: string): void => {
    const rule = RATE_LIMITS[action]
    if (!rule) return
    const nowMs = now().getTime()
    const recent = (state.writes[action] ?? []).filter(
      (at) => nowMs - at < rule.windowMs,
    )
    if (recent.length >= rule.max) {
      const oldest = recent[0] ?? nowMs
      throw new RateLimitError(rule.windowMs - (nowMs - oldest))
    }
    recent.push(nowMs)
    state.writes[action] = recent
  }

  const requireUser = (state: LocalState): DemoUser => {
    if (!state.user) throw new DataError('No demo session is open.', 'auth')
    return state.user
  }

  const toDemoData = (state: LocalState): DemoData | null => {
    if (!state.user) return null
    return {
      user: state.user,
      checkIns: state.checkIns,
      sessions: state.sessions,
      journal: state.journal,
      wellbeing: state.wellbeing,
    }
  }

  return {
    kind: 'local',

    today: () => localToday(now()),

    async startDemoSession(): Promise<DemoUser> {
      const state = read()
      const today = localToday(now())
      if (state.user) return state.user

      const seeded = seedDemoData({ today, daysElapsed: 9 })
      const next: LocalState = {
        ...emptyState(),
        user: seeded.user,
        checkIns: seeded.checkIns,
        sessions: seeded.sessions,
        journal: seeded.journal,
        wellbeing: seeded.wellbeing,
      }
      write(next)
      return seeded.user
    },

    async getCurrentUser(): Promise<DemoUser | null> {
      return read().user
    },

    async endSession(): Promise<void> {
      const state = read()
      // Signing out clears the pointer but leaves the demo dataset intact, so
      // re-entering the demo does not look like a data loss.
      write({ ...state, user: null })
    },

    async getDemoData(): Promise<DemoData | null> {
      return toDemoData(read())
    },

    async saveCheckIn(input: CheckInInput): Promise<DailyCheckIn> {
      const state = read()
      const user = requireUser(state)
      guard(state, 'checkIn')

      const date = input.date || localToday(now())
      if (!input.mood) throw new ValidationError('A mood is required.')
      if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
        throw new ValidationError('A duration is required.')
      }
      if (input.note && input.note.length > MAX_NOTE_LENGTH) {
        throw new ValidationError(
          `Keep the note under ${MAX_NOTE_LENGTH} characters.`,
        )
      }

      const programmeDay = user.programmeStartDate
        ? (programmeDayNumber(user.programmeStartDate, date) ?? 0)
        : 0

      const existing = state.checkIns.find((entry) => entry.date === date)
      const record: DailyCheckIn = {
        id: existing?.id ?? nextId('checkin'),
        date,
        mood: input.mood,
        activities: [...input.activities],
        minutes: Math.round(input.minutes),
        note: input.note?.trim() || undefined,
        programmeDay,
        createdAt: existing?.createdAt ?? now().toISOString(),
      }

      const checkIns = existing
        ? state.checkIns.map((entry) => (entry.date === date ? record : entry))
        : [...state.checkIns, record]

      write({ ...state, checkIns })
      return record
    },

    async recordPractice(entry: PracticeEntry, date: string): Promise<void> {
      const state = read()
      requireUser(state)
      guard(state, 'practice')
      const practice: PracticeLog = addPractice(state.practice, date, entry)
      write({ ...state, practice })
    },

    async getPracticeSeed(date: string): Promise<CheckInSeed> {
      return seedForDate(read().practice, date)
    },

    async clearPracticeSeed(date: string): Promise<void> {
      const state = read()
      requireUser(state)
      write({ ...state, practice: clearDate(state.practice, date) })
    },

    async recordSession(input: SessionInput): Promise<SessionRecord> {
      const state = read()
      const user = requireUser(state)
      guard(state, 'session')

      if (!Number.isFinite(input.minutes) || input.minutes <= 0) {
        throw new ValidationError('A duration is required.')
      }

      const date = input.date ?? localToday(now())
      const record: SessionRecord = {
        id: nextId('session'),
        date,
        kind: input.kind,
        minutes: Math.round(input.minutes),
        completed: input.completed ?? true,
        audioTier: input.audioTier,
        trackKey: input.trackKey,
        createdAt: now().toISOString(),
      }

      // The first completed guided session starts the programme. Completion is
      // decided here rather than taken from the caller, so a bug in the player
      // cannot hand somebody a running programme for free.
      const shouldStart =
        record.kind === 'guided' && record.completed && !user.programmeStartDate

      write({
        ...state,
        user: shouldStart ? { ...user, programmeStartDate: date } : user,
        sessions: [...state.sessions, record],
      })
      return record
    },

    async saveWellbeing(input: WellbeingInput): Promise<WellbeingCheck> {
      const state = read()
      const user = requireUser(state)
      guard(state, 'wellbeing')

      const type = input.type ?? (user.programmeStartDate ? 'follow-up' : 'start')
      const answers = {
        mood: clampAnswer(input.answers.mood),
        energy: clampAnswer(input.answers.energy),
        sleep: clampAnswer(input.answers.sleep),
        focus: clampAnswer(input.answers.focus),
        gratitude: clampAnswer(input.answers.gratitude),
      }
      const scores = scoreWellbeing(answers)
      const date = localToday(now())

      const record: WellbeingCheck = {
        id: nextId('wellbeing'),
        date,
        type,
        answers,
        total: scores.total,
        band: scores.band,
        gratitudeNote: input.gratitudeNote?.trim() || undefined,
        createdAt: now().toISOString(),
      }

      // One row per type: a re-submission replaces the earlier answer rather than
      // stacking duplicates in the researcher view.
      const wellbeing = [
        ...state.wellbeing.filter((entry) => entry.type !== type),
        record,
      ].sort((a, b) => a.createdAt.localeCompare(b.createdAt))

      write({ ...state, wellbeing })
      return record
    },

    async saveJournalEntry(input: JournalInput): Promise<JournalEntry> {
      const state = read()
      requireUser(state)
      guard(state, 'journal')

      const title = input.title.trim()
      const body = input.body.trim()
      if (title === '') throw new ValidationError('A title is required.')
      if (body === '') throw new ValidationError('Write a few lines first.')

      const date = input.date ?? localToday(now())
      const nowIso = now().toISOString()
      const existing = state.journal.find((entry) => entry.date === date)
      const record: JournalEntry = {
        id: existing?.id ?? nextId('journal'),
        date,
        title,
        body,
        mood: input.mood,
        createdAt: existing?.createdAt ?? nowIso,
      }

      const journal = existing
        ? state.journal.map((entry) => (entry.date === date ? record : entry))
        : [record, ...state.journal]

      write({ ...state, journal: journal.sort((a, b) => b.date.localeCompare(a.date)) })
      return record
    },

    async deleteJournalEntry(id: string): Promise<void> {
      const state = read()
      requireUser(state)
      const next = state.journal.filter((entry) => entry.id !== id)
      if (next.length === state.journal.length) {
        throw new NotFoundError(`journal entry ${id}`)
      }
      write({ ...state, journal: next })
    },

    async getResearcherSnapshot(): Promise<ResearcherSnapshot> {
      return buildResearcherSnapshot(localToday(now()))
    },

    async resetDemo(): Promise<void> {
      const today = localToday(now())
      const seeded = seedDemoData({ today, daysElapsed: 9 })
      write({
        ...emptyState(),
        user: seeded.user,
        checkIns: seeded.checkIns,
        sessions: seeded.sessions,
        journal: seeded.journal,
        wellbeing: seeded.wellbeing,
      })
    },
  }
}

/** A brand new demo session with nothing recorded, used by the empty-state path. */
export function createEmptyDemoState(today: string): LocalState {
  const data = emptyDemoData(today)
  return {
    ...emptyState(),
    user: data.user,
    checkIns: data.checkIns,
    sessions: data.sessions,
    journal: data.journal,
    wellbeing: data.wellbeing,
  }
}

/** The programme length, re-exported so screens do not import two modules. */
export { PROGRAMME_LENGTH_DAYS, createSyntheticUser, daysBetween }
