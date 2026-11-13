/**
 * The Convex adapter, against a fake client.
 *
 * The adapter is the one place where a transport failure could look like a
 * validation failure, so both mappings are pinned here. The fake client also lets
 * the tests assert the exact argument shape the backend functions expect, which is
 * the part a generated binding would normally check for us.
 */

import { describe, expect, it, vi } from 'vitest'

import {
  classifyError,
  createConvexPort,
  mintSessionKey,
  readSessionKey,
  SESSION_KEY_STORAGE,
  writeSessionKey,
  type ConvexClientLike,
} from './convexAdapter'
import { DataError } from './port'

const NOW = new Date(2026, 0, 9, 12, 0, 0)

function fakeClient(
  handlers: Record<string, (args: Record<string, unknown>) => unknown> = {},
) {
  const calls: { mode: string; args: Record<string, unknown> }[] = []
  const client: ConvexClientLike = {
    mutation: vi.fn(async (_fn: unknown, args: Record<string, unknown>) => {
      calls.push({ mode: 'mutation', args })
      const name = String(Object.keys(handlers)[0] ?? '')
      const handler = handlers[name]
      return handler ? handler(args) : {}
    }),
    query: vi.fn(async (_fn: unknown, args: Record<string, unknown>) => {
      calls.push({ mode: 'query', args })
      const name = String(Object.keys(handlers)[0] ?? '')
      const handler = handlers[name]
      return handler ? handler(args) : null
    }),
  }
  return { client, calls }
}

function makePort(
  handlers: Record<string, (args: Record<string, unknown>) => unknown> = {},
  sessionKey = 'demo-test',
) {
  const { client, calls } = fakeClient(handlers)
  const port = createConvexPort({
    url: 'https://example.invalid',
    client,
    now: () => NOW,
    sessionKey,
  })
  return { port, calls }
}

describe('classifyError', () => {
  it('maps a rate limit message', () => {
    expect(classifyError(new Error('Too many writes')).kind).toBe('rateLimit')
  })

  it('maps a missing session', () => {
    expect(classifyError(new Error('No demo session is open.')).kind).toBe('auth')
  })

  it('maps a rejected payload', () => {
    expect(classifyError(new Error('A title is required.')).kind).toBe('validation')
  })

  it('treats anything else as transport', () => {
    expect(classifyError(new Error('socket hang up')).kind).toBe('transport')
    expect(classifyError('not an error').kind).toBe('transport')
  })
})

describe('session key handling', () => {
  it('mints a namespaced key', () => {
    expect(mintSessionKey(() => 0.5)).toMatch(/^demo-/)
    expect(mintSessionKey().length).toBeGreaterThan(10)
  })

  it('reads and writes a key through a storage seam', () => {
    const store = new Map<string, string>()
    const storage = {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
    }
    writeSessionKey('demo-abc', storage)
    expect(store.get(SESSION_KEY_STORAGE)).toBe('demo-abc')
    expect(readSessionKey(storage)).toBe('demo-abc')
  })

  it('survives storage that throws', () => {
    const throwing = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(readSessionKey(throwing)).toBeNull()
    expect(() => writeSessionKey('demo-abc', throwing)).not.toThrow()
  })

  it('reports no key when there is no storage at all', () => {
    expect(readSessionKey(undefined)).toBeNull()
  })
})

describe('the port', () => {
  it('reports its kind', () => {
    const { port } = makePort()
    expect(port.kind).toBe('convex')
  })

  it('reports the injected clock as today', () => {
    const { port } = makePort()
    expect(port.today()).toBe('2026-01-09')
  })

  it('refuses a write with no session key', async () => {
    const { port } = makePort({}, '')
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
      }),
    ).rejects.toBeInstanceOf(DataError)
  })
})

describe('reads', () => {
  it('returns null when the backend has no session', async () => {
    const { port } = makePort({ getDemoData: () => null })
    expect(await port.getDemoData()).toBeNull()
    expect(await port.getCurrentUser()).toBeNull()
  })

  it('maps a full record into the domain shapes', async () => {
    const { port } = makePort({
      getDemoData: () => ({
        user: {
          sessionKey: 'demo-test',
          displayName: 'Demo guest',
          programmeStartDate: '2026-01-01',
          createdAt: '2026-01-01T08:00:00.000Z',
        },
        checkIns: [
          {
            _id: 'c1',
            date: '2026-01-01',
            mood: 'calm',
            activities: ['breathing'],
            minutes: 5,
            programmeDay: 1,
            createdAt: '2026-01-01T19:00:00.000Z',
          },
        ],
        sessions: [
          {
            _id: 's1',
            date: '2026-01-01',
            kind: 'guided',
            minutes: 8,
            completed: true,
            createdAt: '2026-01-01T09:00:00.000Z',
          },
        ],
        journal: [
          {
            _id: 'j1',
            date: '2026-01-01',
            title: 'Title',
            body: 'Body',
            createdAt: '2026-01-01T21:00:00.000Z',
          },
        ],
        wellbeing: [
          {
            _id: 'w1',
            date: '2026-01-01',
            type: 'start',
            mood: 3,
            energy: 3,
            sleep: 3,
            focus: 3,
            gratitude: 3,
            createdAt: '2026-01-01T08:10:00.000Z',
          },
        ],
      }),
    })

    const data = await port.getDemoData()
    expect(data?.user.id).toBe('demo-test')
    expect(data?.user.isSynthetic).toBe(true)
    expect(data?.checkIns[0]).toMatchObject({ id: 'c1', mood: 'calm', minutes: 5 })
    expect(data?.sessions[0]).toMatchObject({ kind: 'guided', completed: true })
    expect(data?.journal[0]).toMatchObject({ title: 'Title' })
    // The total is recomputed from the answers rather than trusted from the row.
    expect(data?.wellbeing[0].total).toBe(15)
    expect(data?.wellbeing[0].band).toBe('mixed')
  })

  it('generates the researcher snapshot on the client', async () => {
    const { port } = makePort()
    const snapshot = await port.getResearcherSnapshot()
    expect(snapshot.synthetic).toBe(true)
    expect(snapshot.rows.length).toBeGreaterThan(0)
  })
})

describe('writes', () => {
  it('sends the check-in with the session key and the injected date', async () => {
    const { port, calls } = makePort({
      saveCheckIn: (args) => ({
        _id: 'c1',
        date: args.date,
        mood: args.mood,
        activities: args.activities,
        minutes: args.minutes,
        programmeDay: 9,
        createdAt: '2026-01-09T19:00:00.000Z',
      }),
    })
    const record = await port.saveCheckIn({
      date: '2026-01-09',
      mood: 'calm',
      activities: ['breathing'],
      minutes: 5,
    })
    expect(record.programmeDay).toBe(9)
    expect(calls[0].mode).toBe('mutation')
    expect(calls[0].args).toMatchObject({
      sessionKey: 'demo-test',
      date: '2026-01-09',
      mood: 'calm',
    })
  })

  it('sends a session with the completion flag', async () => {
    const { port, calls } = makePort({
      recordSession: (args) => ({
        _id: 's1',
        date: args.date,
        kind: args.kind,
        minutes: args.minutes,
        completed: args.completed,
        createdAt: '2026-01-09T09:00:00.000Z',
      }),
    })
    const record = await port.recordSession({ kind: 'guided', minutes: 8, completed: false })
    expect(record.completed).toBe(false)
    expect(calls[0].args).toMatchObject({ completed: false, kind: 'guided' })
  })

  it('sends the five answers as separate fields', async () => {
    const { port, calls } = makePort({
      saveWellbeing: (args) => ({
        _id: 'w1',
        date: args.date,
        type: args.type,
        mood: args.mood,
        energy: args.energy,
        sleep: args.sleep,
        focus: args.focus,
        gratitude: args.gratitude,
        createdAt: '2026-01-09T08:00:00.000Z',
      }),
    })
    const record = await port.saveWellbeing({
      type: 'follow-up',
      answers: { mood: 5, energy: 4, sleep: 4, focus: 5, gratitude: 5 },
    })
    expect(record.total).toBe(23)
    expect(record.band).toBe('steady')
    expect(calls[0].args).toMatchObject({
      type: 'follow-up',
      mood: 5,
      energy: 4,
      sleep: 4,
      focus: 5,
      gratitude: 5,
    })
  })

  it('sends a journal entry and maps the reply', async () => {
    const { port, calls } = makePort({
      saveJournalEntry: (args) => ({
        _id: 'j1',
        date: args.date,
        title: args.title,
        body: args.body,
        createdAt: '2026-01-09T21:00:00.000Z',
      }),
    })
    const record = await port.saveJournalEntry({
      title: 'Title',
      body: 'Body',
      date: '2026-01-09',
    })
    expect(record.id).toBe('j1')
    expect(calls[0].args).toMatchObject({ title: 'Title', body: 'Body' })
  })

  it('keeps pending practices local and returns an empty seed', async () => {
    const { port, calls } = makePort()
    await port.recordPractice(
      {
        activity: 'breathing',
        minutes: 5,
        completedAt: '2026-01-09T20:00:00.000Z',
        source: 'breathing',
      },
      '2026-01-09',
    )
    expect(calls).toHaveLength(0)
    expect(await port.getPracticeSeed('2026-01-09')).toMatchObject({ minutes: 0 })
  })

  it('refuses to delete a journal entry in the shared demo', async () => {
    const { port } = makePort()
    await expect(port.deleteJournalEntry('j1')).rejects.toBeInstanceOf(DataError)
  })

  it('resets through the backend', async () => {
    const { port, calls } = makePort({ resetDemo: () => ({ deleted: 3 }) })
    await port.resetDemo()
    expect(calls[0].args).toMatchObject({ sessionKey: 'demo-test' })
  })

  it('maps a transport throw onto a DataError', async () => {
    const { port } = makePort({
      saveCheckIn: () => {
        throw new Error('socket hang up')
      },
    })
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
      }),
    ).rejects.toMatchObject({ kind: 'transport' })
  })

  it('maps a rate limit throw onto the rateLimit kind', async () => {
    const { port } = makePort({
      saveCheckIn: () => {
        throw new Error('Too many writes from this demo session')
      },
    })
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
      }),
    ).rejects.toMatchObject({ kind: 'rateLimit' })
  })
})

describe('sign out', () => {
  it('forgets the in-memory key', async () => {
    const { port } = makePort()
    await port.endSession()
    expect(await port.getCurrentUser()).toBeNull()
    await expect(
      port.saveCheckIn({
        date: '2026-01-09',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
      }),
    ).rejects.toMatchObject({ kind: 'auth' })
  })
})
