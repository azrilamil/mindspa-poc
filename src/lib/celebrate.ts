/**
 * A small, earned celebration.
 *
 * Confetti fires on the daily check-in, and only for a mood that reads as pleasant.
 * Two reasons for that restraint: celebrating a hard day would be tone deaf, and a
 * effect that fires on every tap stops meaning anything.
 *
 * Everything here is best effort. `canvas-confetti` needs a canvas and a
 * requestAnimationFrame, so a browser without either, a test environment, or a
 * visitor with reduced motion enabled simply gets no confetti, never an error.
 */

import confetti from 'canvas-confetti'

import { moodDefinition } from '@/domain/moods'
import type { Mood } from '@/domain/types'

/** True when the visitor has asked the system to reduce motion. */
export function prefersReducedMotion(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  try {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return true
  }
}

/** The palette the celebration draws from, matching the design tokens. */
export const CONFETTI_COLOURS = ['#fbbf24', '#fcd34d', '#cdb8e6', '#f4a9b8', '#8ec8e8']

export interface CelebrateOptions {
  /** Skip the reduced motion check, used by a preview or a test. */
  force?: boolean
}

/**
 * Fire confetti for a pleasant mood.
 *
 * Returns true when it actually fired, so a caller can tell the difference without
 * reaching into the library.
 */
export function celebrate(mood: Mood, options: CelebrateOptions = {}): boolean {
  if (!options.force && prefersReducedMotion()) return false
  if (!moodDefinition(mood).pleasant) return false

  try {
    // Two bursts from the lower corners, which reads as a small cheer rather than
    // a full screen takeover.
    confetti({
      particleCount: 34,
      spread: 58,
      startVelocity: 32,
      gravity: 0.9,
      scalar: 0.85,
      origin: { x: 0.15, y: 0.85 },
      colors: CONFETTI_COLOURS,
      disableForReducedMotion: true,
    })
    confetti({
      particleCount: 34,
      spread: 58,
      startVelocity: 32,
      gravity: 0.9,
      scalar: 0.85,
      origin: { x: 0.85, y: 0.85 },
      colors: CONFETTI_COLOURS,
      disableForReducedMotion: true,
    })
    return true
  } catch {
    // A missing canvas is not worth breaking a saved check-in over.
    return false
  }
}
