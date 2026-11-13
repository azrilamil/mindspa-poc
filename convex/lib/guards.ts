import { v } from 'convex/values'

import type { MutationCtx, QueryCtx } from './_generated/server'

/**
 * The demo data boundary.
 *
 * Every write in this file goes through `withRateLimit`, and every read goes
 * through `loadSession`, so a caller cannot address another session's rows and
 * cannot write faster than the window allows. Both helpers are small on purpose:
 * the security property is that there is exactly one of each.
 */

export interface SessionRow {
  _id: string
  sessionKey: string
  displayName: string
  programmeStartDate?: string
  isSynthetic: boolean
  createdAt: string
}

export const SESSION_KEY = v.string()

/**
 * The per session write limit, inlined here rather than imported from
 * `./lib/rateLimit` so the Convex bundle has no cross folder resolution to get
 * wrong. The two are kept in step by `convex/lib/rateLimit.test.ts`.
 */
const RULES: Record<string, { max: number; windowMs: number }> = {
  checkIn: { max: 10, windowMs: 60_000 },
  session: { max: 30, windowMs: 60_000 },
  wellbeing: { max: 5, windowMs: 60_000 },
  journal: { max: 10, windowMs: 60_000 },
  demoReset: { max: 3, windowMs: 300_000 },
}

export class TooManyWrites extends Error {
  readonly retryAfterMs: number

  constructor(retryAfterMs: number) {
    super('Too many writes from this demo session. Wait a moment and try again.')
    this.name = 'TooManyWrites'
    this.retryAfterMs = retryAfterMs
  }
}

/**
 * Record a write, or refuse it.
 *
 * The row per session and action holds a trimmed list of timestamps, so the check
 * is one indexed read and one patch rather than a scan of the write history.
 */
export async function withRateLimit(
  ctx: MutationCtx,
  sessionKey: string,
  action: keyof typeof RULES | string,
): Promise<void> {
  const rule = RULES[action]
  if (!rule) return

  const now = Date.now()
  const existing = await ctx.db
    .query('writeLog')
    .withIndex('by_session_action', (q) =>
      q.eq('sessionKey', sessionKey).eq('action', action),
    )
    .unique()

  const recent = (existing?.timestamps ?? [])
    .filter((at) => now - at < rule.windowMs)
    .sort((a, b) => a - b)

  if (recent.length >= rule.max) {
    const oldest = recent[0] ?? now
    throw new TooManyWrites(Math.max(0, rule.windowMs - (now - oldest)))
  }

  const timestamps = [...recent, now]
  if (existing) {
    await ctx.db.patch(existing._id, { timestamps })
  } else {
    await ctx.db.insert('writeLog', { sessionKey, action, timestamps })
  }
}

/** Load the session row for a key, or null. */
export async function loadSession(
  ctx: QueryCtx | MutationCtx,
  sessionKey: string,
): Promise<SessionRow | null> {
  const row = await ctx.db
    .query('demoUsers')
    .withIndex('by_session_key', (q) => q.eq('sessionKey', sessionKey))
    .unique()
  return (row as SessionRow | null) ?? null
}

/** Clamp a 1..5 self-report answer. */
export function clampAnswer(value: number): number {
  if (!Number.isFinite(value)) return 1
  return Math.min(5, Math.max(1, Math.round(value)))
}

/** The programme day for a date, or 0 when the programme has not started. */
export function programmeDay(startDate: string | undefined, date: string): number {
  if (!startDate) return 0
  const start = new Date(`${startDate}T12:00:00`)
  const current = new Date(`${date}T12:00:00`)
  const days = Math.round((current.getTime() - start.getTime()) / 86_400_000)
  const day = days + 1
  if (day < 1) return 0
  return Math.min(day, 30)
}
