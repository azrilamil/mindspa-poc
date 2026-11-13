/**
 * Screen 1: splash.
 *
 * A calm, centred full-height canvas with no chrome, because there is nowhere to go
 * yet. It holds the mascot, the name, the version label and the two entry points:
 * the demo, which is the primary path, and the researcher dashboard, which a
 * reviewer will want to reach without walking the whole flow.
 */

import { ArrowRight, FlaskConical, Sparkles } from 'lucide-react'

import { Button } from '@/components/ui'
import { SunflowerMascot } from '@/components/SunflowerMascot'
import { APP_VERSION } from '@/version'

export interface SplashScreenProps {
  onContinue: () => void
  onOpenDemo: () => void
  onOpenAdmin: () => void
  demoLoading?: boolean
  demoError?: string | null
}

export function SplashScreen({
  onContinue,
  onOpenDemo,
  onOpenAdmin,
  demoLoading = false,
  demoError = null,
}: SplashScreenProps) {
  return (
    <div className="flex min-h-dvh flex-1 flex-col items-center justify-between px-6 py-8 text-center">
      <div className="flex w-full items-start justify-between">
        <span className="rounded-full bg-white/70 px-3 py-1 text-[0.625rem] font-semibold tracking-wide text-lavender-700">
          v{APP_VERSION}
        </span>
        <button
          type="button"
          onClick={onOpenAdmin}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/70 px-3 text-xs font-semibold text-lavender-700 shadow-sm transition-colors hover:bg-white"
        >
          <FlaskConical className="h-3.5 w-3.5" aria-hidden="true" />
          Researcher dashboard
        </button>
      </div>

      <div className="flex flex-col items-center gap-7">
        <SunflowerMascot
          expression="welcoming"
          className="h-44 w-44 animate-spa-float drop-shadow-[0_10px_25px_rgba(217,119,6,0.18)]"
          title="MindSpa mascot"
        />
        <div className="space-y-3">
          <h1 className="text-[1.75rem] font-extrabold leading-tight text-lavender-700">
            Welcome to MindSpa
          </h1>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-lavender-600">
            A calm place to check in, breathe, and keep a small practice going.
          </p>
        </div>
      </div>

      <div className="w-full max-w-sm space-y-3">
        <Button
          size="lg"
          fullWidth
          loading={demoLoading}
          onClick={onOpenDemo}
          className="bg-sunflower-500 font-bold text-lavender-900 shadow-sm hover:bg-sunflower-600"
          icon={<Sparkles className="h-5 w-5 text-lavender-900" aria-hidden="true" />}
        >
          Enter demo mode
        </Button>

        {demoError && (
          <p
            role="alert"
            className="rounded-xl border border-rose-deep/40 bg-rose-soft px-3 py-2 text-xs leading-relaxed text-rose-deep"
          >
            {demoError}
          </p>
        )}

        <Button
          size="lg"
          fullWidth
          variant="secondary"
          onClick={onContinue}
          icon={<ArrowRight className="h-5 w-5 shrink-0" aria-hidden="true" />}
        >
          See how it works
        </Button>

        <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
          Demo with synthetic data. Not a clinical study and not a medical tool.
          No account, no email, nothing personal is stored.
        </p>
      </div>
    </div>
  )
}
