/**
 * Write limits and upload limits.
 *
 * Pure arithmetic, kept out of the Convex mutation so it can be tested without a
 * deployment. A public demo endpoint is open by definition, so the goal is not to
 * stop a determined attacker but to stop a runaway loop or a double submit from
 * filling the deployment.
 */

import { describe, expect, it } from 'vitest'

import {
  UPLOAD_LIMITS,
  WRITE_RULES,
  decideWrite,
  isAllowedUpload,
  mintSessionKey,
} from './rateLimit'

const RULE = { max: 3, windowMs: 60_000 }

describe('decideWrite', () => {
  it('allows a write under the limit and records it', () => {
    const decision = decideWrite([], 1_000, RULE)
    expect(decision.allowed).toBe(true)
    expect(decision.timestamps).toEqual([1_000])
  })

  it('refuses the write that would exceed the limit', () => {
    const decision = decideWrite([1_000, 2_000, 3_000], 4_000, RULE)
    expect(decision.allowed).toBe(false)
    expect(decision.retryAfterMs).toBeGreaterThan(0)
  })

  it('forgets writes outside the window', () => {
    const decision = decideWrite([1_000, 2_000, 3_000], 200_000, RULE)
    expect(decision.allowed).toBe(true)
    expect(decision.timestamps).toEqual([200_000])
  })

  it('reports the wait against the oldest write still in the window', () => {
    const decision = decideWrite([1_000, 2_000, 3_000], 10_000, RULE)
    expect(decision.retryAfterMs).toBe(60_000 - 9_000)
  })

  it('drops a non finite timestamp rather than trusting it', () => {
    const decision = decideWrite([Number.NaN, 1_000], 2_000, RULE)
    expect(decision.allowed).toBe(true)
    expect(decision.timestamps).toHaveLength(2)
  })

  it('sorts the timestamps it keeps', () => {
    const decision = decideWrite([3_000, 1_000], 4_000, { max: 5, windowMs: 60_000 })
    expect(decision.timestamps).toEqual([1_000, 3_000, 4_000])
  })
})

describe('WRITE_RULES', () => {
  it('defines a limit for every mutation the demo exposes', () => {
    for (const action of ['checkIn', 'session', 'wellbeing', 'journal', 'demoReset']) {
      const rule = (WRITE_RULES as Record<string, { max: number; windowMs: number }>)[
        action
      ]
      expect(rule.max).toBeGreaterThan(0)
      expect(rule.windowMs).toBeGreaterThan(0)
    }
  })

  it('keeps the reset tighter than an ordinary write', () => {
    expect(WRITE_RULES.demoReset.max).toBeLessThan(WRITE_RULES.session.max)
  })
})

describe('mintSessionKey', () => {
  it('produces a namespaced key', () => {
    expect(mintSessionKey()).toMatch(/^demo-[a-z0-9]+$/)
  })

  it('differs between calls', () => {
    expect(mintSessionKey()).not.toBe(mintSessionKey())
  })

  it('is testable with an injected source', () => {
    expect(mintSessionKey(() => 0.25)).toBe(mintSessionKey(() => 0.25))
  })
})

describe('upload limits', () => {
  it('accepts the three audio types under the size cap', () => {
    for (const type of UPLOAD_LIMITS.allowedTypes) {
      expect(isAllowedUpload(type, 1024)).toBe(true)
    }
  })

  it('refuses an oversized file', () => {
    expect(isAllowedUpload('audio/mpeg', UPLOAD_LIMITS.maxBytes + 1)).toBe(false)
  })

  it('refuses a type outside the list', () => {
    expect(isAllowedUpload('application/zip', 1024)).toBe(false)
  })

  it('refuses an empty or invalid size', () => {
    expect(isAllowedUpload('audio/mpeg', 0)).toBe(false)
    expect(isAllowedUpload('audio/mpeg', Number.NaN)).toBe(false)
  })

  it('keeps the cap small, since these are short demo tracks', () => {
    expect(UPLOAD_LIMITS.maxBytes).toBeLessThanOrEqual(5 * 1024 * 1024)
  })
})
