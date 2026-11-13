/**
 * Audio catalogue and URLs.
 *
 * The important assertions are the third tier rule and the completion tolerance: a
 * differently mastered file that stops a couple of seconds early must still count as
 * complete, and a file that stops a minute early must not.
 */

import { describe, expect, it } from 'vitest'

import {
  AUDIO_TRACKS,
  BUNDLED_AUDIO_BASE,
  COMPLETION_TOLERANCE_SECONDS,
  GUIDED_TRACK_KEY,
  GUIDED_TRACK_SECONDS,
  LIBRARY_TRACKS,
  S3_AUDIO_BASE,
  candidateUrls,
  findTrack,
  formatClock,
  guidedTrack,
  isCompletePlayback,
  tierOneUrl,
  tierTwoUrl,
} from './audioTracks'

describe('catalogue', () => {
  it('has a guided track of exactly eight minutes', () => {
    const track = guidedTrack()
    expect(track.durationSeconds).toBe(GUIDED_TRACK_SECONDS)
    expect(GUIDED_TRACK_SECONDS).toBe(480)
    expect(track.isGuidedSession).toBe(true)
  })

  it('gives every track a unique key', () => {
    const keys = AUDIO_TRACKS.map((track) => track.key)
    expect(new Set(keys).size).toBe(keys.length)
  })

  it('gives every track a title, a subtitle and a positive duration', () => {
    for (const track of AUDIO_TRACKS) {
      expect(track.title.length).toBeGreaterThan(2)
      expect(track.subtitle.length).toBeGreaterThan(2)
      expect(track.durationSeconds).toBeGreaterThan(0)
    }
  })

  it('keeps the guided track out of the home library', () => {
    expect(LIBRARY_TRACKS.some((track) => track.key === GUIDED_TRACK_KEY)).toBe(false)
    expect(LIBRARY_TRACKS.length).toBe(AUDIO_TRACKS.length - 1)
  })

  it('finds a track by key, and reports an unknown one', () => {
    expect(findTrack(GUIDED_TRACK_KEY)?.isGuidedSession).toBe(true)
    expect(findTrack('nope')).toBeUndefined()
  })
})

describe('urls', () => {
  it('points tier one at the demo bucket, not the original one', () => {
    expect(S3_AUDIO_BASE).toContain('mindspa-poc-demo')
    expect(S3_AUDIO_BASE).not.toMatch(/\/spa-minda\b/)
    expect(tierOneUrl('quiet-flute')).toBe(`${S3_AUDIO_BASE}/quiet-flute.mp3`)
  })

  it('points tier two at the bundled copy', () => {
    expect(tierTwoUrl('quiet-flute')).toBe(`${BUNDLED_AUDIO_BASE}/quiet-flute.mp3`)
    expect(BUNDLED_AUDIO_BASE.startsWith('/')).toBe(true)
  })

  it('offers the tiers in fallback order', () => {
    const urls = candidateUrls('evening-pool')
    expect(urls).toHaveLength(2)
    expect(urls[0]).toContain('mindspa-poc-demo')
    expect(urls[1].startsWith('/audio/')).toBe(true)
  })

  it('never builds a url with a double slash', () => {
    for (const track of AUDIO_TRACKS) {
      expect(tierOneUrl(track.key)).not.toMatch(/([^:]\/)\/+/)
    }
  })
})

describe('isCompletePlayback', () => {
  it('accepts the ended event whatever the position says', () => {
    expect(isCompletePlayback(true, 0, 480)).toBe(true)
  })

  it('accepts a position inside the tolerance', () => {
    expect(
      isCompletePlayback(false, 480 - COMPLETION_TOLERANCE_SECONDS, 480),
    ).toBe(true)
  })

  it('refuses a position outside the tolerance', () => {
    expect(
      isCompletePlayback(false, 480 - COMPLETION_TOLERANCE_SECONDS - 1, 480),
    ).toBe(false)
  })

  it('refuses an unknown or zero duration', () => {
    expect(isCompletePlayback(false, 10, 0)).toBe(false)
    expect(isCompletePlayback(false, Number.NaN, 480)).toBe(false)
  })

  it('does not accept a start position as completion of a long track', () => {
    expect(isCompletePlayback(false, 5, 480)).toBe(false)
  })
})

describe('formatClock', () => {
  it('pads both halves', () => {
    expect(formatClock(0)).toBe('00:00')
    expect(formatClock(65)).toBe('01:05')
    expect(formatClock(480)).toBe('08:00')
  })

  it('treats a bad value as zero', () => {
    expect(formatClock(Number.NaN)).toBe('00:00')
    expect(formatClock(-1)).toBe('00:00')
  })
})
