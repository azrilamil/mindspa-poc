/**
 * The celebration.
 *
 * `canvas-confetti` draws to a real canvas and animates, so the tests check the
 * decisions around it rather than the pixels: it fires for a pleasant mood, it does
 * not fire for a hard one, it respects reduced motion, and a broken canvas cannot
 * throw out of a saved check-in.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const confetti = vi.fn()

vi.mock('canvas-confetti', () => ({ default: confetti }))

let reduced = false

beforeEach(() => {
  confetti.mockClear()
  reduced = false
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') ? reduced : false,
    media: query,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
  }))
})

afterEach(() => {
  vi.unstubAllGlobals()
})

async function load() {
  vi.resetModules()
  return import('./celebrate')
}

describe('prefersReducedMotion', () => {
  it('reads the media query', async () => {
    const { prefersReducedMotion } = await load()
    expect(prefersReducedMotion()).toBe(false)
    reduced = true
    expect(prefersReducedMotion()).toBe(true)
  })

  it('assumes reduced motion when there is no matchMedia', async () => {
    vi.stubGlobal('matchMedia', undefined)
    const { prefersReducedMotion } = await load()
    expect(prefersReducedMotion()).toBe(true)
  })

  it('assumes reduced motion when the query throws', async () => {
    vi.stubGlobal('matchMedia', () => {
      throw new Error('nope')
    })
    const { prefersReducedMotion } = await load()
    expect(prefersReducedMotion()).toBe(true)
  })
})

describe('celebrate', () => {
  it('fires twice for a pleasant mood', async () => {
    const { celebrate } = await load()
    expect(celebrate('calm')).toBe(true)
    expect(confetti).toHaveBeenCalledTimes(2)
  })

  it('stays quiet for a hard mood', async () => {
    const { celebrate } = await load()
    expect(celebrate('low')).toBe(false)
    expect(confetti).not.toHaveBeenCalled()
  })

  it('stays quiet when reduced motion is requested', async () => {
    reduced = true
    const { celebrate } = await load()
    expect(celebrate('joyful')).toBe(false)
    expect(confetti).not.toHaveBeenCalled()
  })

  it('can be forced for a preview', async () => {
    reduced = true
    const { celebrate } = await load()
    expect(celebrate('joyful', { force: true })).toBe(true)
  })

  it('never throws when the canvas is unavailable', async () => {
    confetti.mockImplementation(() => {
      throw new Error('no canvas')
    })
    const { celebrate } = await load()
    expect(celebrate('calm')).toBe(false)
  })

  it('uses the palette from the design tokens', async () => {
    const { CONFETTI_COLOURS, celebrate } = await load()
    celebrate('calm')
    expect(confetti.mock.calls[0][0].colors).toEqual(CONFETTI_COLOURS)
    expect(CONFETTI_COLOURS).toContain('#fbbf24')
  })
})
