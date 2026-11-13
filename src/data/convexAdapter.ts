/**
 * The Convex data adapter.
 *
 * Selected when `VITE_CONVEX_URL` is set. It implements the same `DataPort` as the
 * local adapter, so no screen knows the difference.
 *
 * Three deliberate choices:
 *
 * - The session key is minted in the browser and kept in `localStorage`. There is
 *   no account and no password: the key is the whole identity, and every call
 *   names it, so a visitor can only reach their own rows.
 * - `anyApi` is used rather than generated bindings, so the client builds and the
 *   test suite runs before a deployment exists. The function names below are
 *   checked against `convex/demo.ts` by the contract test.
 * - Any transport failure surfaces as a `DataError` with `kind: 'transport'`, so a
 *   caller can tell "the network dropped" from "the payload was wrong".
 */

import { ConvexClient } from 'convex/browser'
import { anyApi } from 'convex/server'

import type {
  CheckInInput,
  DailyCheckIn,
  DemoData,
  DemoUser,
  JournalEntry,
  JournalInput,
  ResearcherSnapshot,
  SessionInput,
  SessionRecord,
  WellbeingCheck,
  WellbeingInput,
} from '@/domain/types'
import { scoreWellbeing } from '@/domain/wellbeing'
import { today as localToday } from '@/domain/studyDay'
import type { CheckInSeed, PracticeEntry } from '@/domain/practice'
import { emptySeed } from '@/domain/practice'
import { DataError, type DataPort } from './port'
import { buildResearcherSnapshot } from './synthetic'

export const SESSION_KEY_STORAGE = 'mindspa-poc:session-key'

const api = anyApi as unknown as {
  demo: Record<string, unknown>
}

/** The subset of the client the adapter needs, so a test can pass a fake. */
export interface ConvexClientLike {
  mutation: (fn: unknown, args: Record<string, unknown>) => Promise<unknown>
  query: (fn: unknown, args: Record<string, unknown>) => Promise<unknown>
}

/** Read the browser's session key, or null. */
export function readSessionKey(
  storage: Pick<Storage, 'getItem'> | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): string | null {
  if (!storage) return null
  try {
    return storage.getItem(SESSION_KEY_STORAGE)
  } catch {
    return null
  }
}

/** Persist the session key. */
export function writeSessionKey(
  key: string,
  storage: Pick<Storage, 'setItem'> | undefined = typeof localStorage === 'undefined'
    ? undefined
    : localStorage,
): void {
  if (!storage) return
  try {
    storage.setItem(SESSION_KEY_STORAGE, key)
  } catch {
    // A blocked storage write costs a fresh session on reload, not correctness.
  }
}

/** A session key with enough entropy that two browsers never collide. */
export function mintSessionKey(random: () => number = Math.random): string {
  const part = () => Math.floor(random() * 0xffffffff).toString(36)
  return `demo-${part()}${part()}`
}

export interface ConvexPortOptions {
  url: string
  /** Injected client, for tests. */
  client?: ConvexClientLike
  now?: () => Date
  /** Injected session key, for tests. */
  sessionKey?: string
}

interface ConvexUserRow {
  sessionKey: string
  displayName: string
  programmeStartDate?: string
  createdAt: string
}

interface ConvexCheckInRow {
  _id: string
  date: string
  mood: string
  activities: string[]
  minutes: number
  note?: string
  programmeDay: number
  createdAt: string
}

interface ConvexSessionRow {
  _id: string
  date: string
  kind: string
  minutes: number
  completed: boolean
  audioTier?: string
  trackKey?: string
  createdAt: string
}

interface ConvexJournalRow {
  _id: string
  date: string
  title: string
  body: string
  mood?: string
  createdAt: string
}

interface ConvexWellbeingRow {
  _id: string
  date: string
  type: string
  mood: number
  energy: number
  sleep: number
  focus: number
  gratitude: number
  gratitudeNote?: string
  createdAt: string
}

/** Map a thrown backend error to the adapter's discriminant. */
export function classifyError(cause: unknown): DataError {
  const message = cause instanceof Error ? cause.message : 'The request failed.'
  if (/rate|too many/i.test(message)) return new DataError(message, 'rateLimit')
  if (/no demo session|session is open/i.test(message)) {
    return new DataError(message, 'auth')
  }
  if (/required|under|invalid|write a few/i.test(message)) {
    return new DataError(message, 'validation')
  }
  return new DataError(message, 'transport')
}

export function createConvexPort(options: ConvexPortOptions): DataPort {
  const client: ConvexClientLike =
    options.client ?? (new ConvexClient(options.url) as unknown as ConvexClientLike)
  const now = options.now ?? (() => new Date())
  let sessionKey = options.sessionKey ?? readSessionKey()

  const call = async <T>(
    mode: 'mutation' | 'query',
    name: string,
    args: Record<string, unknown>,
  ): Promise<T> => {
    const fn = api.demo[name]
    if (!fn) {
      throw new DataError(`Unknown backend function: demo:${name}`, 'validation')
    }
    try {
      const result =
        mode === 'mutation'
          ? await client.mutation(fn, args)
          : await client.query(fn, args)
      return result as T
    } catch (cause) {
      throw classifyError(cause)
    }
  }

  const requireKey = (): string => {
    if (!sessionKey) throw new DataError('No demo session is open.', 'auth')
    return sessionKey
  }

  const toUser = (row: ConvexUserRow): DemoUser => ({
    id: row.sessionKey,
    displayName: row.displayName,
    programmeStartDate: row.programmeStartDate,
    isSynthetic: true,
    createdAt: row.createdAt,
  })

  const toWellbeing = (row: ConvexWellbeingRow): WellbeingCheck => {
    const answers = {
      mood: row.mood,
      energy: row.energy,
      sleep: row.sleep,
      focus: row.focus,
      gratitude: row.gratitude,
    }
    const scores = scoreWellbeing(answers)
    return {
      id: row._id,
      date: row.date,
      type: row.type === 'start' ? 'start' : 'follow-up',
      answers,
      total: scores.total,
      band: scores.band,
      gratitudeNote: row.gratitudeNote,
      createdAt: row.createdAt,
    }
  }

  const toCheckIn = (row: ConvexCheckInRow): DailyCheckIn => ({
    id: row._id,
    date: row.date,
    mood: row.mood as DailyCheckIn['mood'],
    activities: row.activities as DailyCheckIn['activities'],
    minutes: row.minutes,
    note: row.note,
    programmeDay: row.programmeDay,
    createdAt: row.createdAt,
  })

  const toSession = (row: ConvexSessionRow): SessionRecord => ({
    id: row._id,
    date: row.date,
    kind: row.kind as SessionRecord['kind'],
    minutes: row.minutes,
    completed: row.completed,
    audioTier: row.audioTier as SessionRecord['audioTier'],
    trackKey: row.trackKey,
    createdAt: row.createdAt,
  })

  const toJournal = (row: ConvexJournalRow): JournalEntry => ({
    id: row._id,
    date: row.date,
    title: row.title,
    body: row.body,
    mood: row.mood as JournalEntry['mood'],
    createdAt: row.createdAt,
  })

  return {
    kind: 'convex',

    today: () => localToday(now()),

    async startDemoSession(): Promise<DemoUser> {
      if (!sessionKey) {
        sessionKey = mintSessionKey()
        writeSessionKey(sessionKey)
      }
      const row = await call<ConvexUserRow>('mutation', 'startDemoSession', {
        sessionKey,
      })
      return toUser(row)
    },

    async getCurrentUser(): Promise<DemoUser | null> {
      if (!sessionKey) return null
      const data = await call<{ user: ConvexUserRow } | null>(
        'query',
        'getDemoData',
        { sessionKey },
      )
      return data ? toUser(data.user) : null
    },

    async endSession(): Promise<void> {
      sessionKey = null
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem(SESSION_KEY_STORAGE)
        } catch {
          // Nothing to do: the in-memory pointer is already cleared.
        }
      }
    },

    async getDemoData(): Promise<DemoData | null> {
      if (!sessionKey) return null
      const data = await call<{
        user: ConvexUserRow
        checkIns: ConvexCheckInRow[]
        sessions: ConvexSessionRow[]
        journal: ConvexJournalRow[]
        wellbeing: ConvexWellbeingRow[]
      } | null>('query', 'getDemoData', { sessionKey })
      if (!data) return null
      return {
        user: toUser(data.user),
        checkIns: data.checkIns.map(toCheckIn),
        sessions: data.sessions.map(toSession),
        journal: data.journal.map(toJournal),
        wellbeing: data.wellbeing.map(toWellbeing),
      }
    },

    async saveCheckIn(input: CheckInInput): Promise<DailyCheckIn> {
      const key = requireKey()
      const row = await call<ConvexCheckInRow>('mutation', 'saveCheckIn', {
        sessionKey: key,
        date: input.date || localToday(now()),
        mood: input.mood,
        activities: input.activities,
        minutes: input.minutes,
        note: input.note,
      })
      return toCheckIn(row)
    },

    async recordPractice(_entry: PracticeEntry, _date: string): Promise<void> {
      // The demo deployment keeps pending practices in the browser only: they are
      // a form pre-fill, not a record, and the check-in that follows is the record.
      void _entry
      void _date
    },

    async getPracticeSeed(): Promise<CheckInSeed> {
      return emptySeed()
    },

    async clearPracticeSeed(): Promise<void> {
      // See recordPractice: nothing is stored server side.
    },

    async recordSession(input: SessionInput): Promise<SessionRecord> {
      const key = requireKey()
      const row = await call<ConvexSessionRow>('mutation', 'recordSession', {
        sessionKey: key,
        date: input.date ?? localToday(now()),
        kind: input.kind,
        minutes: input.minutes,
        completed: input.completed ?? true,
        audioTier: input.audioTier,
        trackKey: input.trackKey,
      })
      return toSession(row)
    },

    async saveWellbeing(input: WellbeingInput): Promise<WellbeingCheck> {
      const key = requireKey()
      const row = await call<ConvexWellbeingRow>('mutation', 'saveWellbeing', {
        sessionKey: key,
        date: localToday(now()),
        type: input.type ?? 'start',
        mood: input.answers.mood,
        energy: input.answers.energy,
        sleep: input.answers.sleep,
        focus: input.answers.focus,
        gratitude: input.answers.gratitude,
        gratitudeNote: input.gratitudeNote,
      })
      return toWellbeing(row)
    },

    async saveJournalEntry(input: JournalInput): Promise<JournalEntry> {
      const key = requireKey()
      const row = await call<ConvexJournalRow>('mutation', 'saveJournalEntry', {
        sessionKey: key,
        date: input.date ?? localToday(now()),
        title: input.title,
        body: input.body,
        mood: input.mood,
      })
      return toJournal(row)
    },

    async deleteJournalEntry(): Promise<void> {
      throw new DataError(
        'Deleting an entry is not enabled in the shared demo deployment.',
        'validation',
      )
    },

    async getResearcherSnapshot(): Promise<ResearcherSnapshot> {
      // The researcher view is generated from a synthetic cohort in the client,
      // deliberately: it holds no server rows at all, so there is no path by which
      // a visitor's own session could appear in an aggregate.
      return buildResearcherSnapshot(localToday(now()))
    },

    async resetDemo(): Promise<void> {
      const key = requireKey()
      await call<{ deleted: number }>('mutation', 'resetDemo', { sessionKey: key })
    },
  }
}
