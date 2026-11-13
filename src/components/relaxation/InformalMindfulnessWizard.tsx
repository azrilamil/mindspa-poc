/**
 * The informal mindfulness wizard.
 *
 * Four steps that turn an ordinary activity into a short practice. The step one
 * pause is a real countdown rather than a sentence asking you to pause, because a
 * stated pause is the part people skip.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Clock,
  Coffee,
  Droplets,
  Footprints,
  Smartphone,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button, Card, ProgressBar, StatusPill } from '@/components/ui'
import {
  INFORMAL_ACTIVITIES,
  INFORMAL_PAUSE_SECONDS,
  INFORMAL_STEPS,
  INFORMAL_STEP_COUNT,
  informalProgress,
  tickPause,
  type InformalActivity,
  type InformalActivityId,
} from '@/domain/informalMindfulness'

const ACTIVITY_ICONS: Record<InformalActivityId, LucideIcon> = {
  drink: Coffee,
  walk: Footprints,
  wash: Droplets,
  tidy: Sparkles,
}

export interface InformalMindfulnessWizardProps {
  /** Called on completion with the activity id and the minutes spent. */
  onComplete: (summary: { activityId: string; minutes: number }) => void
  /** Called from the completion screen, to leave the exercise. */
  onDone?: () => void
  /** Remounts the wizard on reset. */
  sessionKey?: number
}

export function InformalMindfulnessWizard({
  onComplete,
  onDone,
}: InformalMindfulnessWizardProps) {
  const [activity, setActivity] = useState<InformalActivity | null>(null)
  const [step, setStep] = useState(1)
  const [pauseLeft, setPauseLeft] = useState(INFORMAL_PAUSE_SECONDS)
  const [pauseRunning, setPauseRunning] = useState(false)
  const [finished, setFinished] = useState(false)
  const [startedAt] = useState(() => Date.now())

  // The countdown. The remaining value is deliberately not a dependency: it
  // changes every tick, and including it would rebuild the interval every second.
  // The functional update reads the current value instead.
  useEffect(() => {
    if (!pauseRunning) return
    const timer = setInterval(() => {
      setPauseLeft((current) => {
        const next = tickPause(current)
        if (next.done) setPauseRunning(false)
        return next.secondsLeft
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [pauseRunning])

  const finish = useCallback(() => {
    const seconds = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    setFinished(true)
    onComplete({
      activityId: activity?.id ?? 'drink',
      minutes: Math.max(1, Math.round(seconds / 60)),
    })
  }, [activity, onComplete, startedAt])

  if (finished) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-lavender-700">
            Mindful moment complete
          </h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-lavender-600">
            {activity?.title ?? 'The activity'} done with attention. Notice whether
            the rest of the day feels slightly less automatic.
          </p>
        </div>
        {onDone && (
          <Button fullWidth className="max-w-xs" onClick={onDone}>
            Done
          </Button>
        )}
      </div>
    )
  }

  if (!activity) {
    return (
      <div className="flex flex-1 flex-col gap-4 px-5 py-6">
        <header className="space-y-1">
          <h1 className="text-lg font-bold text-lavender-700">Mindful moment</h1>
          <p className="text-xs leading-relaxed text-lavender-600">
            Pick something you were going to do anyway. Four short steps, no extra
            time in the day.
          </p>
        </header>

        <div className="space-y-3">
          {INFORMAL_ACTIVITIES.map((candidate) => {
            const Icon = ACTIVITY_ICONS[candidate.id]
            return (
              <button
                key={candidate.id}
                type="button"
                onClick={() => {
                  setActivity(candidate)
                  setStep(1)
                  setPauseLeft(INFORMAL_PAUSE_SECONDS)
                  setPauseRunning(false)
                }}
                className="card-spa flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white"
              >
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
                  <Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-lavender-700">
                    {candidate.title}
                  </span>
                  <span className="mt-0.5 block text-xs leading-relaxed text-lavender-600">
                    {candidate.description}
                  </span>
                </span>
              </button>
            )
          })}
        </div>

        <Card className="mt-auto space-y-1 bg-lavender-50/80 p-3 text-[0.6875rem] leading-relaxed text-lavender-700">
          <p className="font-semibold">Why so small</p>
          <p className="text-lavender-600">
            Brief attention during ordinary tasks is easier to keep than a long sit,
            and it is the version most people actually repeat.
          </p>
        </Card>
      </div>
    )
  }

  const stepInfo = INFORMAL_STEPS[step - 1]
  const isFirst = step === 1
  const isLast = step === INFORMAL_STEP_COUNT
  const Icon = ACTIVITY_ICONS[activity.id]

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-lavender-700">
            <Icon className="h-4 w-4 text-sunflower-600" aria-hidden="true" />
            {activity.title}
          </span>
          <StatusPill tone="neutral">
            Step {step} of {INFORMAL_STEP_COUNT}
          </StatusPill>
        </div>
        <ProgressBar
          value={informalProgress(step)}
          label={`Step ${step} of ${INFORMAL_STEP_COUNT}`}
        />
      </header>

      <Card className="space-y-4">
        <div className="space-y-1">
          <h2 className="text-base font-bold text-lavender-700">{stepInfo.title}</h2>
          <p className="text-xs leading-relaxed text-lavender-600">
            {stepInfo.instruction}
          </p>
        </div>

        {step === 1 && (
          <div className="flex flex-col items-center gap-3 rounded-xl bg-purple-50/70 p-4 text-center">
            <div className="flex items-center gap-3 text-lavender-600">
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600"
                aria-label="Put the phone down"
              >
                <Smartphone className="h-6 w-6" aria-hidden="true" />
              </span>
              <Clock className="h-6 w-6 text-lavender-500" aria-hidden="true" />
            </div>
            <p className="text-xs text-lavender-700">
              Put the phone down and let your shoulders drop before you begin.
            </p>
            <div className="flex items-center gap-3">
              <span
                className="text-2xl font-extrabold tabular-nums text-lavender-800"
                data-testid="pause-seconds"
              >
                {pauseLeft}s
              </span>
              <Button
                size="sm"
                variant={pauseRunning ? 'secondary' : 'primary'}
                onClick={() => {
                  if (pauseRunning) {
                    setPauseRunning(false)
                  } else {
                    if (pauseLeft === 0) setPauseLeft(INFORMAL_PAUSE_SECONDS)
                    setPauseRunning(true)
                  }
                }}
              >
                {pauseRunning ? 'Pause' : pauseLeft === 0 ? 'Again' : 'Start 5 seconds'}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-1.5 rounded-xl bg-purple-50/70 p-4">
            <p className="text-xs font-semibold text-lavender-700">
              For {activity.title.toLowerCase()}:
            </p>
            <p className="text-xs leading-relaxed text-lavender-600">
              {activity.sensoryCue}
            </p>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-1.5 rounded-xl bg-purple-50/70 p-4">
            <p className="text-xs font-semibold text-lavender-700">Where to look:</p>
            <p className="text-xs leading-relaxed text-lavender-600">
              {activity.actionCue}
            </p>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-1.5 rounded-xl bg-purple-50/70 p-4">
            <p className="text-xs font-semibold text-lavender-700">Stay here:</p>
            <p className="text-xs leading-relaxed text-lavender-600">
              Do not judge the wandering mind. Notice it, gently, and come back to the
              small action in front of you.
            </p>
          </div>
        )}
      </Card>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => {
            if (isFirst) setActivity(null)
            else setStep((current) => current - 1)
          }}
          icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}
        >
          {isFirst ? 'Activity' : 'Back'}
        </Button>
        {isLast ? (
          <Button
            fullWidth
            size="lg"
            onClick={finish}
            icon={<Check className="h-5 w-5" aria-hidden="true" />}
          >
            Finish
          </Button>
        ) : (
          <Button
            fullWidth
            size="lg"
            onClick={() => setStep((current) => current + 1)}
            trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
