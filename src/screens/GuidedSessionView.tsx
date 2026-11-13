/**
 * The guided session view, formerly the clinic session screen.
 *
 * One eight minute audio track with a breathing orb alongside it, a seek bar, and a
 * completion state. Finishing it for the first time starts the programme, which is
 * why completion is decided from the media's own `ended` event rather than from a
 * timer or a button.
 *
 * Two modes share the screen. `start` is the first run, the one that opens the
 * programme. `repeat` is a session reopened from Practise after the programme is
 * already running: it records the session for today and leaves the existing
 * programme start alone, so a visitor can always hear the track again without
 * resetting their progress.
 *
 * The framing is deliberately soft: it is a guided relaxation, and the copy says
 * plainly that it is a demo track, not a clinical intervention.
 */

import { useEffect, useMemo, useRef, useState } from 'react'
import { Check, ChevronLeft, Headphones, Pause, Play, RotateCcw } from 'lucide-react'

import { Button, Card, ProgressBar, StatusPill } from '@/components/ui'
import { SunflowerMascot } from '@/components/SunflowerMascot'
import { useAudioPlayer } from '@/app/useAudioPlayer'
import {
  COMPLETION_TOLERANCE_SECONDS,
  GUIDED_TRACK_KEY,
  formatClock,
  guidedTrack,
  isCompletePlayback,
} from '@/domain/audioTracks'

/** Whether this run opens the programme or repeats a session already opened. */
export type GuidedSessionMode = 'start' | 'repeat'

export interface GuidedSessionViewProps {
  /** Called once the track has finished, with the minutes heard. */
  onComplete: (summary: { minutes: number; tier: 's3' | 'bundled' | 'generated' }) => void
  /** Leave the screen: after completion, or from the demo shortcut. */
  onSkip?: () => void
  /** Leave the screen mid session, from the back control at the top. */
  onBack?: () => void
  /** `start` opens the programme, `repeat` records a session and keeps it. */
  mode?: GuidedSessionMode
  /** Label for the button on the completion state. */
  doneLabel?: string
}

export function GuidedSessionView({
  onComplete,
  onSkip,
  onBack,
  mode = 'start',
  doneLabel,
}: GuidedSessionViewProps) {
  const track = useMemo(() => guidedTrack(), [])
  const { snapshot, telemetry, start, toggle, seekFraction, reset } = useAudioPlayer(
    GUIDED_TRACK_KEY,
  )
  const [reported, setReported] = useState(false)
  const reportRef = useRef(false)

  const progress =
    snapshot.duration > 0 ? snapshot.position / snapshot.duration : 0

  // Completion is derived rather than stored: `ended` is authoritative, and a
  // position within tolerance of the end is accepted because a different master may
  // stop a second or two short.
  const isFinished = isCompletePlayback(
    snapshot.ended,
    snapshot.position,
    snapshot.duration || track.durationSeconds,
  )
  const finished = isFinished || reported

  // Report once, and only once, the first time the media reaches the end.
  useEffect(() => {
    if (!isFinished || reportRef.current) return
    reportRef.current = true
    onComplete({
      minutes: Math.max(1, Math.round((snapshot.duration || track.durationSeconds) / 60)),
      tier: snapshot.tier,
    })
  }, [isFinished, onComplete, snapshot.duration, snapshot.tier, track])

  if (finished) {
    const copy =
      mode === 'repeat'
        ? {
            title: 'Session complete',
            detail:
              'This session is on your record for today. Your programme carries on from where it was.',
            pill: 'Recorded',
            action: doneLabel ?? 'Back to practise',
          }
        : {
            title: 'Session complete',
            detail:
              'Your programme starts today. From here, a short check-in and a practice whenever you have a few minutes.',
            pill: 'Started',
            action: doneLabel ?? 'Go to today',
          }
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <SunflowerMascot expression="happy" className="h-28 w-28" />
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-lavender-700">{copy.title}</h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-lavender-600">
            {copy.detail}
          </p>
        </div>
        <StatusPill tone="success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          {copy.pill}
        </StatusPill>
        {onSkip && (
          <Button fullWidth className="max-w-xs" onClick={onSkip}>
            {copy.action}
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      {onBack && (
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-lavender-700 shadow-2xs transition-colors hover:bg-white hover:text-lavender-900 active:bg-lavender-100"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-lavender-600" aria-hidden="true" />
          Back to practise
        </button>
      )}
      <Card className="flex items-center gap-3 border border-lavender-200 bg-gradient-to-r from-lavender-50/90 to-white !p-4">
        <SunflowerMascot expression="calm" className="h-14 w-14 shrink-0" />
        <div className="min-w-0 flex-1 space-y-1">
          <h2 className="text-base font-bold leading-snug text-lavender-800">
            {track.title}
          </h2>
          <p className="text-xs leading-relaxed text-lavender-600">{track.subtitle}</p>
        </div>
        <StatusPill
          tone="warning"
          className="shrink-0 whitespace-nowrap !px-2 !py-0.5 !text-[0.625rem]"
        >
          {Math.round(track.durationSeconds / 60)} min
        </StatusPill>
      </Card>

      <div className="flex flex-col items-center gap-3">
        <div className="relative flex h-32 w-32 items-center justify-center">
          {snapshot.playing && (
            <span className="absolute h-32 w-32 animate-ping rounded-full bg-sunflower-300/50" />
          )}
          <span className="relative flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-sunflower-200 to-lavender-200">
            <Headphones className="h-11 w-11 text-lavender-700" aria-hidden="true" />
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
              disabled={snapshot.duration === 0}
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
                reset()
                void start(GUIDED_TRACK_KEY)
              }}
              aria-label="Restart"
              className="!w-12 !rounded-full !px-0"
            >
              <RotateCcw className="h-5 w-5" aria-hidden="true" />
            </Button>
            <Button
              size="lg"
              onClick={() => void (snapshot.position === 0 ? start(GUIDED_TRACK_KEY) : toggle())}
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

      <ProgressBar
        value={progress}
        label={`${Math.round(progress * 100)} per cent through the session`}
      />

      {snapshot.error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-deep/40 bg-rose-soft px-3 py-2 text-xs leading-relaxed text-rose-deep"
        >
          {snapshot.error}
        </p>
      )}

      <div className="mt-auto space-y-2">
        <p className="text-center text-[0.6875rem] leading-relaxed text-lavender-600">
          {telemetry.playedSeconds > 0
            ? `${formatClock(telemetry.playedSeconds)} listened so far.`
            : 'The audio keeps playing with the screen locked.'}
        </p>
        {onSkip && (
          <Button
            fullWidth
            variant="secondary"
            onClick={() => {
              // A reviewer shortcut. It reports the same completion the media
              // would, and is labelled as a demo control so nobody mistakes it
              // for part of the product.
              reportRef.current = true
              setReported(true)
              onComplete({ minutes: 8, tier: snapshot.tier })
            }}
          >
            Skip to the end (demo control)
          </Button>
        )}
        <p className="text-center text-[0.625rem] text-lavender-600">
          Completion is accepted within {COMPLETION_TOLERANCE_SECONDS} seconds of the
          end.
        </p>
      </div>
    </div>
  )
}
