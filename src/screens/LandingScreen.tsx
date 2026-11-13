/**
 * The landing screen behind "See how it works".
 *
 * It explains the shape of the demo in a few honest lines and offers the same
 * single primary action. There is no sign-up form and no password field: the only
 * way in is the anonymous demo session, which is a deliberate product decision for
 * a public portfolio build and is stated on the screen rather than hidden.
 */

import { ChevronLeft, ShieldCheck, Sparkles } from 'lucide-react'

import { Button, Card } from '@/components/ui'
import { SunflowerMascot } from '@/components/SunflowerMascot'

export interface LandingScreenProps {
  onStartDemo: () => void
  onBack: () => void
  demoLoading?: boolean
  demoError?: string | null
}

const STEPS = [
  {
    title: 'A one tap demo session',
    detail:
      'You arrive in an anonymous session already seeded with a month of synthetic practice.',
  },
  {
    title: 'Check in, then practise',
    detail:
      'A mood check, a breathing orb, a grounding walk through five senses, and guided audio.',
  },
  {
    title: 'See it add up',
    detail:
      'Streaks, a 30 day calendar, and a researcher view over a separate synthetic cohort.',
  },
]

export function LandingScreen({
  onStartDemo,
  onBack,
  demoLoading = false,
  demoError = null,
}: LandingScreenProps) {
  return (
    <div className="flex flex-1 flex-col gap-5 px-5 py-6">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-lavender-700 shadow-2xs transition-colors hover:bg-white"
      >
        <ChevronLeft className="h-4 w-4 shrink-0" aria-hidden="true" />
        Back
      </button>

      <header className="flex items-center gap-3">
        <SunflowerMascot expression="happy" className="h-16 w-16 shrink-0" />
        <div className="space-y-1">
          <h1 className="text-lg font-bold leading-tight text-lavender-700">
            How the demo works
          </h1>
          <p className="text-xs leading-relaxed text-lavender-600">
            Three screens in a row, then the parts you can wander through.
          </p>
        </div>
      </header>

      <ul className="space-y-3">
        {STEPS.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunflower-400 text-[0.625rem] font-bold text-sunflower-800">
              {index + 1}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-lavender-700">{step.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-lavender-600">
                {step.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>

      <Card className="space-y-1.5 bg-lavender-50/80 text-[0.6875rem] leading-relaxed text-lavender-700">
        <p className="flex items-center gap-1.5 font-bold">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          What is stored
        </p>
        <p>
          Only what you type in the demo: a mood, a note, a journal page. The
          session is anonymous and can be reset from the More menu at any time.
        </p>
      </Card>

      <div className="mt-auto space-y-2 pt-2">
        {demoError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-deep/40 bg-rose-soft px-3 py-2 text-xs text-rose-deep"
          >
            {demoError}
          </p>
        )}
        <Button
          fullWidth
          size="lg"
          loading={demoLoading}
          onClick={onStartDemo}
          icon={<Sparkles className="h-5 w-5" aria-hidden="true" />}
        >
          Start the demo
        </Button>
      </div>
    </div>
  )
}
