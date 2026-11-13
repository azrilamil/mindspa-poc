import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

/**
 * MindSpa POC demo schema.
 *
 * Deliberately small, and deliberately free of anything that could identify a
 * person. There is no email, no phone number, no date of birth and no name field
 * that a real person would fill in: a visitor enters an anonymous demo session and
 * everything they produce hangs off that session id.
 *
 * The rows are synthetic. The dashboard labels them as such in the UI and this
 * schema has no path to a real participant cohort.
 */
export default defineSchema({
  /** One anonymous demo session. */
  demoUsers: defineTable({
    /** Session id minted by the server. Never derived from a person. */
    sessionKey: v.string(),
    displayName: v.string(),
    /** ISO date, YYYY-MM-DD. Set when the first guided session completes. */
    programmeStartDate: v.optional(v.string()),
    isSynthetic: v.boolean(),
    createdAt: v.string(),
  }).index('by_session_key', ['sessionKey']),

  checkIns: defineTable({
    sessionKey: v.string(),
    date: v.string(),
    mood: v.string(),
    activities: v.array(v.string()),
    minutes: v.number(),
    note: v.optional(v.string()),
    programmeDay: v.number(),
    createdAt: v.string(),
  })
    .index('by_session_key', ['sessionKey'])
    .index('by_session_date', ['sessionKey', 'date']),

  sessions: defineTable({
    sessionKey: v.string(),
    date: v.string(),
    kind: v.string(),
    minutes: v.number(),
    completed: v.boolean(),
    audioTier: v.optional(v.string()),
    trackKey: v.optional(v.string()),
    createdAt: v.string(),
  }).index('by_session_key', ['sessionKey']),

  journalEntries: defineTable({
    sessionKey: v.string(),
    date: v.string(),
    title: v.string(),
    body: v.string(),
    mood: v.optional(v.string()),
    createdAt: v.string(),
  }).index('by_session_key', ['sessionKey']),

  /**
   * The wellbeing check.
   *
   * Five 1..5 self-report prompts. Raw answers are stored, and the total is
   * recomputed by the reader so a scoring change never needs a migration.
   */
  wellbeingChecks: defineTable({
    sessionKey: v.string(),
    date: v.string(),
    type: v.string(),
    mood: v.number(),
    energy: v.number(),
    sleep: v.number(),
    focus: v.number(),
    gratitude: v.number(),
    gratitudeNote: v.optional(v.string()),
    createdAt: v.string(),
  }).index('by_session_key', ['sessionKey']),

  /**
   * Per session write counters, used by the server side rate limiter.
   *
   * A row per session and action holds a short list of recent write timestamps;
   * the mutation trims anything outside the window before it decides.
   */
  writeLog: defineTable({
    sessionKey: v.string(),
    action: v.string(),
    timestamps: v.array(v.number()),
  }).index('by_session_action', ['sessionKey', 'action']),
})
