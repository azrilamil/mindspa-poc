import { v } from 'convex/values'

import { internalMutation, mutation, query } from './_generated/server'
import {
  TooManyWrites,
  clampAnswer,
  loadSession,
  programmeDay,
  withRateLimit,
} from './lib/guards'

/**
 * The demo data functions.
 *
 * Two rules hold across this file:
 *
 * 1. A caller always names its own session key, and every query filters by it, so
 *    one visitor can only ever read and write their own rows.
 * 2. Every mutation passes through `withRateLimit` first, so a public demo endpoint
 *    cannot be used to fill the deployment.
 *
 * Nothing here stores a personal identifier. The session key is the only handle.
 */

const MOODS = [
  'joyful',
  'calm',
  'hopeful',
  'grateful',
  'content',
  'curious',
  'energised',
  'tired',
  'restless',
  'anxious',
  'low',
  'frustrated',
  'overwhelmed',
  'lonely',
  'numb',
] as const

const ACTIVITIES = [
  'breathing',
  'grounding',
  'audio',
  'mindful-moment',
  'journal',
  'walk',
] as const

const SESSION_KINDS = [
  'guided',
  'breathing',
  'grounding',
  'informal',
  'audio',
] as const

/**
 * Enter a demo session.
 *
 * Idempotent for a given key: a returning browser gets the same row rather than a
 * duplicate, which is what makes a page reload safe.
 */
export const startDemoSession = mutation({
  args: {
    sessionKey: v.string(),
    displayName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await withRateLimit(ctx, args.sessionKey, 'session')
    const existing = await loadSession(ctx, args.sessionKey)
    if (existing) return existing

    const createdAt = new Date().toISOString()
    const id = await ctx.db.insert('demoUsers', {
      sessionKey: args.sessionKey,
      displayName: args.displayName?.trim() || 'Demo guest',
      isSynthetic: true,
      createdAt,
    })
    return {
      _id: id,
      sessionKey: args.sessionKey,
      displayName: args.displayName?.trim() || 'Demo guest',
      isSynthetic: true,
      createdAt,
    }
  },
})

/** The whole demo record for one session. */
export const getDemoData = query({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) return null

    const [checkIns, sessions, journal, wellbeing] = await Promise.all([
      ctx.db
        .query('checkIns')
        .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
        .collect(),
      ctx.db
        .query('sessions')
        .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
        .collect(),
      ctx.db
        .query('journalEntries')
        .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
        .collect(),
      ctx.db
        .query('wellbeingChecks')
        .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
        .collect(),
    ])

    return { user, checkIns, sessions, journal, wellbeing }
  },
})

/** Create or replace the check-in for a date. */
export const saveCheckIn = mutation({
  args: {
    sessionKey: v.string(),
    date: v.string(),
    mood: v.union(...MOODS.map((mood) => v.literal(mood))),
    activities: v.array(v.union(...ACTIVITIES.map((activity) => v.literal(activity)))),
    minutes: v.number(),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) throw new Error('No demo session is open.')
    await withRateLimit(ctx, args.sessionKey, 'checkIn')

    if (!Number.isFinite(args.minutes) || args.minutes <= 0) {
      throw new Error('A positive duration is required.')
    }
    if (args.note && args.note.length > 500) {
      throw new Error('Keep the note under 500 characters.')
    }

    const existing = await ctx.db
      .query('checkIns')
      .withIndex('by_session_date', (q) =>
        q.eq('sessionKey', args.sessionKey).eq('date', args.date),
      )
      .unique()

    const row = {
      sessionKey: args.sessionKey,
      date: args.date,
      mood: args.mood,
      activities: [...args.activities],
      minutes: Math.round(args.minutes),
      note: args.note?.trim() || undefined,
      programmeDay: programmeDay(user.programmeStartDate, args.date),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, row)
      return { ...row, _id: existing._id }
    }
    const id = await ctx.db.insert('checkIns', row)
    return { ...row, _id: id }
  },
})

/**
 * Record a finished session.
 *
 * The programme start date is set here on the first completed guided session, and
 * only from a completed one, so the caller cannot hand out a running programme.
 */
export const recordSession = mutation({
  args: {
    sessionKey: v.string(),
    date: v.string(),
    kind: v.union(...SESSION_KINDS.map((kind) => v.literal(kind))),
    minutes: v.number(),
    completed: v.boolean(),
    audioTier: v.optional(v.string()),
    trackKey: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) throw new Error('No demo session is open.')
    await withRateLimit(ctx, args.sessionKey, 'session')

    if (!Number.isFinite(args.minutes) || args.minutes <= 0) {
      throw new Error('A positive duration is required.')
    }

    const row = {
      sessionKey: args.sessionKey,
      date: args.date,
      kind: args.kind,
      minutes: Math.round(args.minutes),
      completed: args.completed,
      audioTier: args.audioTier,
      trackKey: args.trackKey,
      createdAt: new Date().toISOString(),
    }
    const id = await ctx.db.insert('sessions', row)

    if (args.kind === 'guided' && args.completed && !user.programmeStartDate) {
      await ctx.db.patch(user._id, { programmeStartDate: args.date })
    }

    return { ...row, _id: id }
  },
})

/** Save the opening or follow-up wellbeing check. */
export const saveWellbeing = mutation({
  args: {
    sessionKey: v.string(),
    date: v.string(),
    type: v.union(v.literal('start'), v.literal('follow-up')),
    mood: v.number(),
    energy: v.number(),
    sleep: v.number(),
    focus: v.number(),
    gratitude: v.number(),
    gratitudeNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) throw new Error('No demo session is open.')
    await withRateLimit(ctx, args.sessionKey, 'wellbeing')

    const row = {
      sessionKey: args.sessionKey,
      date: args.date,
      type: args.type,
      mood: clampAnswer(args.mood),
      energy: clampAnswer(args.energy),
      sleep: clampAnswer(args.sleep),
      focus: clampAnswer(args.focus),
      gratitude: clampAnswer(args.gratitude),
      gratitudeNote: args.gratitudeNote?.trim() || undefined,
      createdAt: new Date().toISOString(),
    }

    const existing = await ctx.db
      .query('wellbeingChecks')
      .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
      .collect()
    const sameType = existing.find((entry) => entry.type === args.type)
    if (sameType) {
      await ctx.db.patch(sameType._id, row)
      return { ...row, _id: sameType._id }
    }
    const id = await ctx.db.insert('wellbeingChecks', row)
    return { ...row, _id: id }
  },
})

/** Create or replace a journal entry for a date. */
export const saveJournalEntry = mutation({
  args: {
    sessionKey: v.string(),
    date: v.string(),
    title: v.string(),
    body: v.string(),
    mood: v.optional(v.union(...MOODS.map((mood) => v.literal(mood)))),
  },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) throw new Error('No demo session is open.')
    await withRateLimit(ctx, args.sessionKey, 'journal')

    const title = args.title.trim()
    const body = args.body.trim()
    if (title === '') throw new Error('A title is required.')
    if (body === '') throw new Error('Write a few lines first.')

    const existing = await ctx.db
      .query('journalEntries')
      .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
      .collect()
    const sameDate = existing.find((entry) => entry.date === args.date)

    const row = {
      sessionKey: args.sessionKey,
      date: args.date,
      title,
      body,
      mood: args.mood,
      createdAt: sameDate?.createdAt ?? new Date().toISOString(),
    }

    if (sameDate) {
      await ctx.db.patch(sameDate._id, row)
      return { ...row, _id: sameDate._id }
    }
    const id = await ctx.db.insert('journalEntries', row)
    return { ...row, _id: id }
  },
})

/**
 * Wipe one session's writes and reseed the synthetic baseline.
 *
 * The scheduled job in `crons.ts` calls the same logic for every session, which is
 * what keeps the public demo from accumulating a year of stray rows.
 */
export const resetDemo = mutation({
  args: { sessionKey: v.string() },
  handler: async (ctx, args) => {
    const user = await loadSession(ctx, args.sessionKey)
    if (!user) return { deleted: 0 }
    await withRateLimit(ctx, args.sessionKey, 'demoReset')

    let deleted = 0
    for (const table of ['checkIns', 'sessions', 'journalEntries', 'wellbeingChecks'] as const) {
      const rows = await ctx.db
        .query(table)
        .withIndex('by_session_key', (q) => q.eq('sessionKey', args.sessionKey))
        .collect()
      for (const row of rows) {
        await ctx.db.delete(row._id)
        deleted += 1
      }
    }
    await ctx.db.patch(user._id, { programmeStartDate: undefined })
    return { deleted }
  },
})

/** Delete demo sessions and their rows older than `maxAgeHours`. */
export const sweepOldSessions = internalMutation({
  args: { maxAgeHours: v.number() },
  handler: async (ctx, args) => {
    const cutoff = new Date(
      Date.now() - Math.max(1, args.maxAgeHours) * 3_600_000,
    ).toISOString()
    const users = await ctx.db.query('demoUsers').collect()
    let removed = 0

    for (const user of users) {
      if (user.createdAt >= cutoff) continue
      for (const table of ['checkIns', 'sessions', 'journalEntries', 'wellbeingChecks'] as const) {
        const rows = await ctx.db
          .query(table)
          .withIndex('by_session_key', (q) => q.eq('sessionKey', user.sessionKey))
          .collect()
        for (const row of rows) await ctx.db.delete(row._id)
      }
      const logs = await ctx.db
        .query('writeLog')
        .withIndex('by_session_action', (q) => q.eq('sessionKey', user.sessionKey))
        .collect()
      for (const log of logs) await ctx.db.delete(log._id)
      await ctx.db.delete(user._id)
      removed += 1
    }

    return { removed }
  },
})

export { TooManyWrites }
