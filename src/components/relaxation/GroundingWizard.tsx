/**
 * The 5-4-3-2-1 grounding wizard.
 *
 * Five steps, each asking you to notice a number of things through one sense. No
 * text fields: the exercise records nothing about what you saw or heard, only that
 * you finished it. The step content lives in `domain/grounding.ts`.
 */

import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Ear,
  Eye,
  Hand,
  Flower2,
  Sparkles,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Button, Card, ProgressBar, StatusPill } from '@/components/ui'
import {
  GROUNDING_STEP_COUNT,
  GROUNDING_STEPS,
  SENSE_LABELS,
  groundingProgress,
  stepLabel,
} from '@/domain/grounding'
import type { Sense } from '@/domain/types'

const SENSE_ICONS: Record<Sense, LucideIcon> = {
  sight: Eye,
  touch: Hand,
  sound: Ear,
  smell: Flower2,
  taste: Sparkles,
}

export interface GroundingWizardProps {
  /** Called on completion with the seconds spent. */
  onComplete: (summary: { secondsSpent: number }) => void
  /** Called from the completion screen, to leave the exercise. */
  onDone?: () => void
  /** Remounts the wizard on reset. */
  sessionKey?: number
}

export function GroundingWizard({ onComplete, onDone }: GroundingWizardProps) {
  const [stepNumber, setStepNumber] = useState(1)
  const [finished, setFinished] = useState(false)
  const [startedAt] = useState(() => Date.now())

  const step = GROUNDING_STEPS[stepNumber - 1]

  useEffect(() => {
    // Nothing to do but keep the accent honest: this effect exists so a future
    // step change has an obvious place to hook an announcement.
    document.title = stepLabel(stepNumber)
  }, [stepNumber])

  const finish = useCallback(() => {
    const secondsSpent = Math.max(1, Math.round((Date.now() - startedAt) / 1000))
    setFinished(true)
    onComplete({ secondsSpent })
  }, [onComplete, startedAt])

  if (finished) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-10 w-10 text-emerald-600" aria-hidden="true" />
        </span>
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-lavender-700">Grounding complete</h2>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-lavender-600">
            Five senses, one at a time. Notice whether the room feels a little more
            present than it did a minute ago.
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

  const Icon = SENSE_ICONS[step.sense]
  const isLast = stepNumber === GROUNDING_STEP_COUNT

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <span className="text-base font-bold text-lavender-700">
            5-4-3-2-1 grounding
          </span>
          <StatusPill tone="neutral">{stepLabel(stepNumber)}</StatusPill>
        </div>
        <ProgressBar
          value={groundingProgress(stepNumber)}
          label={`Step ${stepNumber} of ${GROUNDING_STEP_COUNT}`}
        />
      </header>

      <Card className="space-y-4">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
            <Icon className="h-6 w-6" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="text-[0.625rem] font-bold uppercase tracking-wider text-lavender-600">
              {SENSE_LABELS[step.sense]}
            </p>
            <h2 className="text-base font-bold leading-snug text-lavender-700">
              {step.prompt}
            </h2>
          </div>
        </div>

        <div className="rounded-xl bg-purple-50/70 p-4">
          <p className="text-xs leading-relaxed text-lavender-600">{step.example}</p>
        </div>

        <ul className="space-y-1.5" aria-label="Items to notice">
          {Array.from({ length: step.count }, (_, index) => (
            <li
              key={index}
              className="flex items-center gap-2 text-xs text-lavender-700"
            >
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/80 text-[0.625rem] font-bold text-lavender-600">
                {index + 1}
              </span>
              <span>{step.count === 1 ? 'One thing' : `Thing ${index + 1}`}</span>
            </li>
          ))}
        </ul>
      </Card>

      <p className="text-center text-[0.6875rem] leading-relaxed text-lavender-600">
        Nothing here is typed or recorded. Only that you finished is stored.
      </p>

      <div className="mt-auto flex items-center gap-3 pt-2">
        <Button
          variant="secondary"
          size="lg"
          onClick={() => setStepNumber((current) => Math.max(1, current - 1))}
          disabled={stepNumber === 1}
          icon={<ArrowLeft className="h-5 w-5" aria-hidden="true" />}
        >
          Back
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
            onClick={() => setStepNumber((current) => current + 1)}
            trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
          >
            Next
          </Button>
        )}
      </div>
    </div>
  )
}
