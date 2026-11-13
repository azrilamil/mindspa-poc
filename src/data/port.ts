/**
 * The DataPort seam.
 *
 * Every read and write the app performs goes through this interface. Two
 * implementations exist:
 *
 * - `createLocalPort()`: in-memory plus localStorage. No network, no
 *   credentials, seeded with synthetic data. Used for the demo, for development
 *   and for tests.
 * - `createConvexPort()`: selected by setting `VITE_CONVEX_URL`. The same
 *   interface, backed by the demo deployment.
 *
 * The screen code never knows which one it is holding, so a change of backend is
 * a change of one factory.
 */

import type {
  Activity,
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
import type { CheckInSeed, PracticeEntry, PracticeLog } from '@/domain/practice'

/**
 * What kind of failure this is, so a caller branches on a discriminant rather
 * than on the text of a message.
 *
 * - `auth`: the session is gone. Permanent for this session, so a retry cannot
 *   help.
 * - `validation`: the payload was rejected. Retrying unchanged will be rejected
 *   again.
 * - `transport`: the request never reached the store, or the reply was lost. The
 *   only kind worth retrying.
 * - `rateLimit`: too many writes from this session. Retrying immediately makes it
 *   worse, so the caller shows the wait.
 */
export type DataErrorKind = 'transport' | 'auth' | 'validation' | 'rateLimit'

export class DataError extends Error {
  readonly kind: DataErrorKind

  constructor(message: string, kind: DataErrorKind = 'transport') {
    super(message)
    this.name = 'DataError'
    this.kind = kind
  }
}

export class NotFoundError extends DataError {
  constructor(what: string) {
    super(`Not found: ${what}`, 'validation')
    this.name = 'NotFoundError'
  }
}

export class ValidationError extends DataError {
  constructor(message: string) {
    super(message, 'validation')
    this.name = 'ValidationError'
  }
}

export class RateLimitError extends DataError {
  constructor(retryAfterMs: number) {
    super(
      `Too many saves in a short time. Try again in ${Math.ceil(retryAfterMs / 1000)} seconds.`,
      'rateLimit',
    )
    this.name = 'RateLimitError'
  }
}

export interface DataPort {
  readonly kind: 'local' | 'convex'

  /**
   * The adapter's local calendar date, YYYY-MM-DD.
   *
   * Every date the app files a row under comes from here, so the adapter's clock
   * and the screen's idea of "today" can never disagree. Tests inject a fixed
   * clock and get a fixed date.
   */
  today(): string

  /** Enter the anonymous demo session, seeding synthetic data on first use. */
  startDemoSession(): Promise<DemoUser>

  /** The active demo user, or null when no session has been started. */
  getCurrentUser(): Promise<DemoUser | null>

  /** Forget the session on this device. Does not delete the demo dataset. */
  endSession(): Promise<void>

  /** Read everything the session has produced. */
  getDemoData(): Promise<DemoData | null>

  /** Create or replace the check-in for a date. */
  saveCheckIn(input: CheckInInput): Promise<DailyCheckIn>

  /** A pending practice, which pre-populates the next check-in. */
  recordPractice(entry: PracticeEntry, date: string): Promise<void>

  /** What the tools left pending for a date. */
  getPracticeSeed(date: string): Promise<CheckInSeed>

  /** Drop a date's pending practices, once the check-in has been submitted. */
  clearPracticeSeed(date: string): Promise<void>

  /** Record a finished session, and set the programme start on the first guided one. */
  recordSession(input: SessionInput): Promise<SessionRecord>

  /** Persist the opening or follow-up wellbeing check. */
  saveWellbeing(input: WellbeingInput): Promise<WellbeingCheck>

  /** Create or replace a journal entry for a date. */
  saveJournalEntry(input: JournalInput): Promise<JournalEntry>

  /** Delete a journal entry. */
  deleteJournalEntry(id: string): Promise<void>

  /** Synthetic aggregate data for the researcher dashboard. */
  getResearcherSnapshot(): Promise<ResearcherSnapshot>

  /** Wipe the demo writes and reseed the synthetic baseline. */
  resetDemo(): Promise<void>
}

/** The persisted shape of the local adapter. */
export interface LocalState {
  user: DemoUser | null
  checkIns: DailyCheckIn[]
  sessions: SessionRecord[]
  journal: JournalEntry[]
  wellbeing: WellbeingCheck[]
  practice: PracticeLog
  /** Write timestamps per action key, for the per session rate limiter. */
  writes: Record<string, number[]>
}

export type { Activity }
