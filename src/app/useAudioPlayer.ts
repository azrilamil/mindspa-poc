/**
 * The audio player.
 *
 * Wraps a single `HTMLAudioElement` and exposes only what the screens need: a
 * snapshot, play and pause, seeking, and what was actually heard. Two behaviours
 * matter beyond the obvious:
 *
 * - **Tier fallback.** A track is tried from the demo bucket first and from the
 *   bundled copy second. If both fail the element reports an error and the caller
 *   shows a message rather than a silent dead button.
 * - **Heard time is not elapsed time.** Paused time is excluded, because a
 *   practice that took twenty minutes of a locked screen is not twenty minutes of
 *   listening.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { candidateUrls, findTrack, type AudioTrack } from '@/domain/audioTracks'
import type { AudioTier } from '@/domain/types'

export interface PlaybackSnapshot {
  loading: boolean
  playing: boolean
  /** Position in seconds. */
  position: number
  /** Duration in seconds, or 0 before metadata loads. */
  duration: number
  seekable: boolean
  ended: boolean
  error: string | null
  /** Which tier is currently serving the audio. */
  tier: AudioTier
}

export interface PlaybackTelemetry {
  /** Seconds of audio actually heard, excluding pauses. */
  playedSeconds: number
  /** Furthest position reached, so a backwards seek cannot under-report. */
  furthestSeconds: number
  interruptions: number
}

const INITIAL: PlaybackSnapshot = {
  loading: false,
  playing: false,
  position: 0,
  duration: 0,
  seekable: false,
  ended: false,
  error: null,
  tier: 'bundled',
}

export interface UseAudioPlayerResult {
  snapshot: PlaybackSnapshot
  telemetry: PlaybackTelemetry
  track: AudioTrack | undefined
  /** Load and play a track by key. */
  start: (key: string) => Promise<void>
  /** Play or pause the loaded track. */
  toggle: () => Promise<void>
  /** Seek to a fraction of the track. */
  seekFraction: (fraction: number) => void
  /** Stop, unload and clear the telemetry. */
  reset: () => void
}

export function useAudioPlayer(trackKey: string | null): UseAudioPlayerResult {
  const element = useRef<HTMLAudioElement | null>(null)
  const [snapshot, setSnapshot] = useState<PlaybackSnapshot>(INITIAL)
  const [telemetry, setTelemetry] = useState<PlaybackTelemetry>({
    playedSeconds: 0,
    furthestSeconds: 0,
    interruptions: 0,
  })
  const tierAttempt = useRef(0)
  const lastTick = useRef<number>(0)

  const track = useMemo(
    () => (trackKey ? findTrack(trackKey) : undefined),
    [trackKey],
  )

  /** Build the element once. */
  const ensureElement = useCallback((): HTMLAudioElement | null => {
    if (typeof Audio === 'undefined') return null
    if (element.current) return element.current
    const audio = new Audio()
    audio.preload = 'metadata'
    element.current = audio
    return audio
  }, [])

  const attach = useCallback(
    (audio: HTMLAudioElement, key: string) => {
      const urls = candidateUrls(key)

      const onLoaded = () => {
        setSnapshot((current) => ({
          ...current,
          loading: false,
          duration: Number.isFinite(audio.duration) ? audio.duration : 0,
          seekable: audio.seekable.length > 0 || Number.isFinite(audio.duration),
          error: null,
        }))
      }
      const onTime = () => {
        setSnapshot((current) => ({ ...current, position: audio.currentTime }))
        const nowMs = Date.now()
        if (lastTick.current && !audio.paused) {
          const delta = (nowMs - lastTick.current) / 1000
          // Ignore a gap caused by a backgrounded tab rather than counting it as
          // listening, which would inflate every reported session.
          if (delta < 2) {
            setTelemetry((current) => ({
              ...current,
              playedSeconds: current.playedSeconds + delta,
              furthestSeconds: Math.max(current.furthestSeconds, audio.currentTime),
            }))
          }
        }
        lastTick.current = nowMs
      }
      const onEnded = () => {
        setSnapshot((current) => ({ ...current, playing: false, ended: true }))
      }
      const onPause = () => {
        setSnapshot((current) => ({ ...current, playing: false }))
        lastTick.current = 0
      }
      const onPlay = () => {
        setSnapshot((current) => ({ ...current, playing: true }))
        lastTick.current = Date.now()
      }
      const onError = () => {
        // Try the next tier before reporting a failure.
        tierAttempt.current += 1
        if (tierAttempt.current < urls.length) {
          audio.src = urls[tierAttempt.current]
          setSnapshot((current) => ({
            ...current,
            tier: tierAttempt.current === 1 ? 'bundled' : 'generated',
            loading: true,
          }))
          void audio.play().catch(() => undefined)
          return
        }
        setSnapshot((current) => ({
          ...current,
          loading: false,
          playing: false,
          error: 'Audio could not be loaded. Check the connection and try again.',
        }))
      }

      audio.addEventListener('loadedmetadata', onLoaded)
      audio.addEventListener('timeupdate', onTime)
      audio.addEventListener('ended', onEnded)
      audio.addEventListener('pause', onPause)
      audio.addEventListener('play', onPlay)
      audio.addEventListener('error', onError)

      tierAttempt.current = 0
      audio.src = urls[0]
      setSnapshot({
        ...INITIAL,
        loading: true,
        tier: 's3',
      })

      return () => {
        audio.removeEventListener('loadedmetadata', onLoaded)
        audio.removeEventListener('timeupdate', onTime)
        audio.removeEventListener('ended', onEnded)
        audio.removeEventListener('pause', onPause)
        audio.removeEventListener('play', onPlay)
        audio.removeEventListener('error', onError)
      }
    },
    [],
  )

  const detach = useRef<(() => void) | null>(null)

  const start = useCallback(
    async (key: string) => {
      const audio = ensureElement()
      if (!audio) {
        setSnapshot((current) => ({
          ...current,
          error: 'Audio is not available in this browser.',
        }))
        return
      }
      detach.current?.()
      audio.pause()
      setTelemetry({ playedSeconds: 0, furthestSeconds: 0, interruptions: 0 })
      detach.current = attach(audio, key)
      try {
        await audio.play()
      } catch {
        // Autoplay may be blocked until a gesture; the play button remains.
        setSnapshot((current) => ({ ...current, loading: false, playing: false }))
      }
    },
    [attach, ensureElement],
  )

  const toggle = useCallback(async () => {
    const audio = element.current
    if (!audio) return
    if (audio.paused) {
      try {
        await audio.play()
      } catch {
        setSnapshot((current) => ({
          ...current,
          error: 'Playback was blocked. Tap play again.',
        }))
      }
    } else {
      audio.pause()
      setTelemetry((current) => ({
        ...current,
        interruptions: current.interruptions + 1,
      }))
    }
  }, [])

  const seekFraction = useCallback((fraction: number) => {
    const audio = element.current
    if (!audio) return
    const duration = Number.isFinite(audio.duration) ? audio.duration : 0
    if (duration <= 0) return
    audio.currentTime = Math.min(Math.max(fraction, 0), 1) * duration
  }, [])

  const reset = useCallback(() => {
    const audio = element.current
    if (audio) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()
    }
    detach.current?.()
    detach.current = null
    setSnapshot(INITIAL)
    setTelemetry({ playedSeconds: 0, furthestSeconds: 0, interruptions: 0 })
    lastTick.current = 0
  }, [])

  useEffect(() => {
    return () => {
      detach.current?.()
      element.current?.pause()
    }
  }, [])

  return { snapshot, telemetry, track, start, toggle, seekFraction, reset }
}
