/**
 * The audio library.
 *
 * The home practice tracks, plus the same playback support the guided session has.
 * Unlike that session this is not a gate: you listen for as long as is useful, and
 * whatever was heard is recorded when you stop. A partial listen is still practice.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { Headphones, Pause, Play, RotateCcw } from 'lucide-react'

import { Button, Card, StatusPill } from '@/components/ui'
import { cn } from '@/lib/cn'
import { useAudioPlayer } from '@/app/useAudioPlayer'
import { LIBRARY_TRACKS, formatClock } from '@/domain/audioTracks'

export interface AudioLibraryViewProps {
  /** Called when listening stops, if enough was heard to be worth reporting. */
  onListened: (summary: { trackKey: string; minutes: number }) => void
}

/** Below this, a tap through the list is not a practice and is not reported. */
export const MIN_REPORTABLE_SECONDS = 30

export function AudioLibraryView({ onListened }: AudioLibraryViewProps) {
  const [selected, setSelected] = useState<string | null>(null)
  const { snapshot, telemetry, start, toggle, seekFraction, reset } =
    useAudioPlayer(selected)

  /** Furthest position reached, so a backwards seek cannot under-report. */
  const furthest = useRef(0)

  useEffect(() => {
    furthest.current = Math.max(furthest.current, snapshot.position)
  }, [snapshot.position])

  const track = LIBRARY_TRACKS.find((candidate) => candidate.key === selected)
  const progress = snapshot.duration > 0 ? snapshot.position / snapshot.duration : 0

  const reportAndStop = useCallback(
    (reason: 'stop' | 'switch' | 'unmount') => {
      const seconds = furthest.current
      if (selected && seconds >= MIN_REPORTABLE_SECONDS) {
        onListened({
          trackKey: selected,
          minutes: Math.max(1, Math.round(seconds / 60)),
        })
      }
      if (reason !== 'unmount') {
        reset()
        furthest.current = 0
        if (reason === 'stop') setSelected(null)
      }
    },
    [onListened, reset, selected],
  )

  // Report on unmount, so leaving the screen does not lose the practice.
  const reportRef = useRef(reportAndStop)
  useEffect(() => {
    reportRef.current = reportAndStop
  }, [reportAndStop])

  useEffect(() => {
    return () => {
      reportRef.current('unmount')
    }
  }, [])

  if (selected && track) {
    return (
      <div className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-3">
        <header className="space-y-1 text-center">
          <h2 className="text-base font-bold leading-snug text-lavender-700">
            {track.title}
          </h2>
          <p className="text-xs text-lavender-600">{track.subtitle}</p>
        </header>

        <div className="flex flex-col items-center gap-3">
          <div className="relative flex h-28 w-28 items-center justify-center">
            {snapshot.playing && (
              <span className="absolute h-28 w-28 animate-ping rounded-full bg-lavender-200/60" />
            )}
            <span className="relative flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-tranquil-200 to-lavender-200">
              <Headphones className="h-10 w-10 text-lavender-700" aria-hidden="true" />
            </span>
          </div>

          <Card className="w-full space-y-3">
            <div className="space-y-2">
              <input
                type="range"
                min={0}
                max={1000}
                value={Math.round(progress * 1000)}
                onChange={(event) => seekFraction(Number(event.target.value) / 1000)}
                disabled={snapshot.duration === 0 || snapshot.loading}
                aria-label="Playback position"
                aria-valuetext={formatClock(snapshot.position)}
                className="h-2 w-full cursor-pointer appearance-none rounded-full bg-white/70 accent-sunflower-500"
              />
              <div className="flex justify-between text-xs tabular-nums text-lavender-600">
                <span>{formatClock(snapshot.position)}</span>
                <span>
                  -{formatClock(Math.max(0, track.durationSeconds - snapshot.position))}
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-4">
              <Button
                variant="secondary"
                onClick={() => {
                  seekFraction(0)
                  furthest.current = 0
                }}
                aria-label="Restart"
                className="!w-12 !rounded-full !px-0"
              >
                <RotateCcw className="h-5 w-5" aria-hidden="true" />
              </Button>
              <Button
                size="lg"
                onClick={() => void toggle()}
                loading={snapshot.loading}
                aria-label={snapshot.playing ? 'Pause' : 'Play'}
                className="!h-16 !w-16 !rounded-full !px-0"
              >
                {snapshot.playing ? (
                  <Pause className="h-7 w-7" aria-hidden="true" />
                ) : (
                  <Play className="h-7 w-7" aria-hidden="true" />
                )}
              </Button>
              <div className="w-12" aria-hidden="true" />
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              <StatusPill tone={snapshot.playing ? 'success' : 'neutral'}>
                {snapshot.playing ? 'Playing' : 'Ready'}
              </StatusPill>
              {snapshot.tier === 'bundled' && (
                <StatusPill tone="warning">Bundled audio</StatusPill>
              )}
            </div>
          </Card>
        </div>

        {snapshot.error && (
          <p
            role="alert"
            className="rounded-xl border border-rose-deep/40 bg-rose-soft px-3 py-2 text-xs text-rose-deep"
          >
            {snapshot.error}
          </p>
        )}

        <div className="mt-auto space-y-2">
          <p className="text-center text-[0.6875rem] text-lavender-600">
            {telemetry.playedSeconds > 0
              ? `${formatClock(telemetry.playedSeconds)} heard`
              : 'The audio keeps playing with the screen locked.'}
          </p>
          <Button fullWidth onClick={() => reportAndStop('stop')}>
            Save and pick another
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Audio library</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          Pick a track. Whatever you hear is added to today's check-in when you stop.
        </p>
      </header>

      <ul className="space-y-3">
        {LIBRARY_TRACKS.map((candidate) => (
          <li key={candidate.key}>
            <button
              type="button"
              onClick={() => {
                setSelected(candidate.key)
                furthest.current = 0
                void start(candidate.key)
              }}
              className={cn(
                'flex min-h-16 w-full items-center gap-3 rounded-2xl px-4 py-3 text-left',
                'card-spa transition-colors hover:bg-white',
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-lavender-100 text-lavender-700">
                <Play className="h-5 w-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-lavender-700">
                  {candidate.title}
                </span>
                <span className="block text-xs text-lavender-600">
                  {candidate.subtitle} · {formatClock(candidate.durationSeconds)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
