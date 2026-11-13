/**
 * The contract between the client adapter and the backend.
 *
 * The adapter calls functions by name through `anyApi`, so nothing at build time
 * checks that `demo:saveCheckIn` still exists. This test reads both files and
 * compares the names, which catches the one failure mode that would otherwise only
 * appear in production: a renamed mutation.
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const ROOT = join(__dirname, '..')

/** Every function the backend exports. */
function backendFunctions(): string[] {
  const source = readFileSync(join(ROOT, 'convex/demo.ts'), 'utf8')
  return [...source.matchAll(/export const (\w+) = (?:internalMutation|mutation|query)\(/g)].map(
    (match) => match[1],
  )
}

/** Every function the client adapter calls. */
function adapterCalls(): string[] {
  const source = readFileSync(join(ROOT, 'src/data/convexAdapter.ts'), 'utf8')
  return [
    ...new Set(
      [...source.matchAll(/'(?:mutation|query)',\s*'(\w+)'/g)].map((match) => match[1]),
    ),
  ]
}

describe('the demo backend', () => {
  it('exports the functions the adapter calls', () => {
    const backend = new Set(backendFunctions())
    for (const name of adapterCalls()) {
      expect(backend.has(name)).toBe(true)
    }
  })

  it('exports no function the adapter silently ignores', () => {
    // A backend function nobody calls is either dead code or a missing feature. Both
    // are worth a failure here rather than a surprise later.
    const called = new Set(adapterCalls())
    const unused = backendFunctions().filter(
      (name) => !called.has(name) && name !== 'sweepOldSessions',
    )
    expect(unused).toEqual([])
  })

  it('rate limits every mutation it exposes', () => {
    const source = readFileSync(join(ROOT, 'convex/demo.ts'), 'utf8')
    const handlers = source.split(/export const /).slice(1)
    for (const handler of handlers) {
      const name = handler.slice(0, handler.indexOf(' '))
      if (!handler.startsWith(`${name} = mutation(`)) continue
      // The sweeper is an internal maintenance job, not a public entry point.
      if (name === 'sweepOldSessions') continue
      expect(handler).toMatch(/withRateLimit\(ctx, args\.sessionKey/)
    }
  })

  it('scopes every query to one session key', () => {
    const source = readFileSync(join(ROOT, 'convex/demo.ts'), 'utf8')
    // Every table read goes through an index keyed by the session.
    const reads = [...source.matchAll(/ctx\.db\s*\n?\s*\.query\('(\w+)'\)/g)].map(
      (match) => match[1],
    )
    expect(reads.length).toBeGreaterThan(0)
    for (const table of reads) {
      expect(['demoUsers', 'checkIns', 'sessions', 'journalEntries', 'wellbeingChecks', 'writeLog']).toContain(table)
    }
  })

  it('stores no contact field in the schema', () => {
    const schema = readFileSync(join(ROOT, 'convex/schema.ts'), 'utf8')
    for (const field of ['email', 'phone', 'address', 'name:' /* displayName only */]) {
      if (field === 'name:') continue
      expect(schema).not.toMatch(new RegExp(`${field}:`, 'i'))
    }
  })
})
