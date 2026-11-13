/**
 * The breathing pacer.
 *
 * The orb expands on the inhale, holds, and contracts on the exhale, with optional
 * chimes so the exercise can be followed with the eyes closed.
 *
 * Two implementation notes that matter:
 *
 * - The animation is driven by `performance.now()` elapsed time and rendered
 *   through a `requestAnimationFrame` loop, so a dropped frame or a backgrounded
 *   tab cannot make the pacer drift away from the clock. Reading the remaining
 *   time every frame rather than accumulating a delta is what keeps that true.
 * - The session runs to a whole number of cycles, so it never stops somebody
 *   mid inhale.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pause, Play, RotateCcw, Settings, Volume2, VolumeX } from 'lucide-react'

import { Button, Dialog, ProgressBar } from '@/components/ui'
import { cn } from '@/lib/cn'
import {
  BREATHING_MODES,
  DURATION_CHOICES,
  formatDuration,
  orbScale,
  patternFor,
  phaseAt,
  phaseLabel,
  planSession,
  type BreathingMode,
} from '@/domain/breathing'

export interface BreathingOrbProps {
  /** Called once when a session finishes, with the time actually practised. */
  onComplete: (summary: { mode: BreathingMode; minutes: number; cycles: number }) => void
  /** Whether the settings sheet starts open. */
  initialSettingsOpen?: boolean
  /** Chime hook, called on each phase change so audio stays optional. */
  onPhase?: (phase: 'inhale' | 'hold' | 'exhale') => void
}

export function BreathingOrb({
  onComplete,
  initialSettingsOpen = false,
  onPhase,
}: BreathingOrbProps) {
  const [mode, setMode] = useState<BreathingMode>('4-7-8')
  const [minutes, setMinutes] = useState<number>(5)
  const [sheetOpen, setSheetOpen] = useState(initialSettingsOpen)
  const [elapsed, setElapsed] = useState(0)
  const [running, setRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [chimesOn, setChimesOn] = useState(true)

  const plan = useMemo(() => planSession(mode, minutes), [minutes, mode])

  const lastPhase = useRef<string>('')
  const startedAt = useRef<number>(0)
  const baseElapsed = useRef<number>(0)
  const frame = useRef<number | null>(null)
  const completedRef = useRef(false)

  useEffect(() => {
    if (!running) return
    startedAt.current = performance.now() - baseElapsed.current * 1000

    const tick = () => {
      const seconds = (performance.now() - startedAt.current) / 1000
      if (seconds >= plan.totalSeconds) {
        baseElapsed.current = plan.totalSeconds
        setElapsed(plan.totalSeconds)
        setRunning(false)
        setFinished(true)
        return
      }
      setElapsed(seconds)
      frame.current = requestAnimationFrame(tick)
    }
    frame.current = requestAnimationFrame(tick)
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current)
    }
  }, [plan.totalSeconds, running])

  const state = phaseAt(plan, elapsed)

  // Cue once per phase boundary, and only at a boundary.
  useEffect(() => {
    if (!running) return
    const key = `${state.cycle}:${state.phase}`
    if (lastPhase.current === key) return
    lastPhase.current = key
    if (chimesOn) onPhase?.(state.phase)
  }, [chimesOn, onPhase, running, state.cycle, state.phase])

  // Report the session once it finishes, and only once.
  useEffect(() => {
    if (!finished || completedRef.current) return
    completedRef.current = true
    onComplete({
      mode,
      // Rounded to the nearest whole minute: a 5 minute session that ran 5:08
      // still reports 5.
      minutes: Math.max(1, Math.round(plan.totalSeconds / 60)),
      cycles: plan.cycles,
    })
  }, [finished, mode, onComplete, plan.cycles, plan.totalSeconds])

  const reset = useCallback(() => {
    baseElapsed.current = 0
    lastPhase.current = ''
    completedRef.current = false
    setElapsed(0)
    setFinished(false)
    setRunning(false)
  }, [])

  const start = useCallback(() => {
    if (finished) reset()
    lastPhase.current = ''
    // A running session shows only the orb, so the sheet never stays open.
    setSheetOpen(false)
    setRunning(true)
  }, [finished, reset])

  const pause = useCallback(() => {
    baseElapsed.current = elapsed
    setRunning(false)
    lastPhase.current = ''
  }, [elapsed])

  const pattern = patternFor(mode)
  const scale = finished ? 0.655 : orbScale(plan, elapsed)

  return (
    <div className="flex flex-1 flex-col gap-3 px-5 pb-4 pt-3">
      <header className="flex items-start justify-between gap-3">
        <h1 className="text-lg font-bold leading-tight text-lavender-700">
          Breathing exercise
        </h1>
        <button
          type="button"
          onClick={() => setSheetOpen(true)}
          aria-label="Exercise settings"
          aria-haspopup="dialog"
          aria-expanded={sheetOpen}
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border transition-colors',
            sheetOpen
              ? 'border-purple-300 bg-lavender-200 text-lavender-800'
              : 'border-purple-200 bg-white/80 text-lavender-600 hover:bg-white',
          )}
        >
          <Settings className="h-5 w-5" aria-hidden="true" />
        </button>
      </header>

      <div
        data-testid="breathing-pacer"
        className="flex flex-1 flex-col items-center justify-center gap-2"
      >
        <div className="relative flex h-44 w-44 items-center justify-center">
          <span
            aria-hidden="true"
            className="absolute h-44 w-44 rounded-full border-2 border-dashed border-purple-200/80"
          />
          <div
            role="img"
            aria-label={
              finished
                ? 'Done'
                : `${phaseLabel(state.phase)}, ${state.secondsRemaining} seconds left`
            }
            className="flex h-44 w-44 items-center justify-center rounded-full bg-[#c8b5ed] shadow-[0_12px_45px_rgba(200,181,237,0.45)]"
            style={{ transform: `scale(${scale})` }}
          >
            <div className="text-center">
              <p className="text-base font-bold text-slate-800 drop-shadow-sm">
                {finished ? 'Done' : phaseLabel(state.phase)}
              </p>
              {!finished && (
                <p className="text-3xl font-extrabold tabular-nums text-slate-800 drop-shadow-sm">
                  {state.secondsRemaining}
                </p>
              )}
            </div>
          </div>
        </div>

        <p className="text-sm font-semibold tabular-nums text-lavender-700">
          {formatDuration(elapsed)} / {formatDuration(plan.totalSeconds)}
        </p>
        <p className="text-xs tabular-nums text-lavender-600">
          Cycle {state.cycle} of {plan.cycles}
        </p>
        <ProgressBar
          className="max-w-xs"
          value={state.sessionProgress}
          label={`${Math.round(state.sessionProgress * 100)} per cent complete`}
        />

        <div className="flex w-full items-center gap-3 pt-2">
          <Button
            variant="secondary"
            size="lg"
            onClick={reset}
            aria-label="Reset"
            disabled={elapsed === 0}
            className="!w-14 !px-0"
          >
            <RotateCcw className="h-5 w-5" aria-hidden="true" />
          </Button>
          <Button
            fullWidth
            size="lg"
            onClick={running ? pause : start}
            icon={
              running ? (
                <Pause className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Play className="h-5 w-5" aria-hidden="true" />
              )
            }
          >
            {running
              ? 'Pause'
              : finished
                ? 'Again'
                : elapsed > 0
                  ? 'Continue'
                  : 'Start'}
          </Button>
        </div>
      </div>

      <Dialog open={sheetOpen} title="Exercise settings" onClose={() => setSheetOpen(false)}>
        <div data-testid="breathing-settings" className="space-y-4">
          <p className="text-xs leading-relaxed text-lavender-600">
            {pattern.description}
          </p>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-lavender-700">Pattern</p>
            <div className="grid grid-cols-2 gap-2">
              {BREATHING_MODES.map((candidate) => (
                <button
                  key={candidate}
                  type="button"
                  disabled={running}
                  onClick={() => {
                    setMode(candidate)
                    reset()
                  }}
                  aria-pressed={mode === candidate}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors',
                    mode === candidate
                      ? 'border-sunflower-500 bg-sunflower-300/50 text-sunflower-600'
                      : 'border-purple-200 bg-white/70 text-lavender-700',
                    running && 'opacity-60',
                  )}
                >
                  {candidate}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-xs font-semibold text-lavender-700">Length</p>
            <div className="grid grid-cols-3 gap-2">
              {DURATION_CHOICES.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  disabled={running}
                  onClick={() => {
                    setMinutes(choice)
                    reset()
                  }}
                  aria-pressed={minutes === choice}
                  className={cn(
                    'min-h-11 rounded-xl border px-3 text-sm font-semibold transition-colors',
                    minutes === choice
                      ? 'border-sunflower-500 bg-sunflower-300/50 text-sunflower-600'
                      : 'border-purple-200 bg-white/70 text-lavender-700',
                    running && 'opacity-60',
                  )}
                >
                  {choice} min
                </button>
              ))}
            </div>
          </div>

          <div className="pt-1">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setChimesOn((on) => !on)}
              aria-pressed={chimesOn}
              className="text-xs"
              icon={
                chimesOn ? (
                  <Volume2 className="h-4 w-4 shrink-0" aria-hidden="true" />
                ) : (
                  <VolumeX className="h-4 w-4 shrink-0" aria-hidden="true" />
                )
              }
            >
              {chimesOn ? 'Chimes on' : 'Chimes off'}
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  )
}
