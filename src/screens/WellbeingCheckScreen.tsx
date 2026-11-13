/**
 * The wellbeing check.
 *
 * Five prompts, each a 1..5 scale with plain anchors, plus an optional line about
 * what went well. The screen is used twice: once before the programme starts and
 * once at the follow-up, so the copy changes and the questions do not.
 *
 * The result is shown as a short descriptive band and never as a diagnosis. The
 * wording says "this is a demo check", because a person looking at their own score
 * deserves to know what it is not.
 */

import { useMemo, useState } from 'react'
import { ArrowRight, Check, Sparkles } from 'lucide-react'

import { Button, Card, ProgressBar, StatusPill } from '@/components/ui'
import { SunflowerMascot } from '@/components/SunflowerMascot'
import {
  BAND_COPY,
  WELLBEING_MAX,
  WELLBEING_MIN,
  WELLBEING_ORDER,
  WELLBEING_PROMPTS,
  isComplete,
  scoreWellbeing,
} from '@/domain/wellbeing'
import type { WellbeingDimension } from '@/domain/types'

export interface WellbeingCheckScreenProps {
  mode: 'start' | 'follow-up'
  initialAnswers?: Partial<Record<WellbeingDimension, number>>
  onSubmit: (input: {
    type: 'start' | 'follow-up'
    answers: Record<WellbeingDimension, number>
    gratitudeNote?: string
  }) => Promise<void>
  onDone?: () => void
}

const DEFAULT_ANSWERS: Record<WellbeingDimension, number> = {
  mood: 3,
  energy: 3,
  sleep: 3,
  focus: 3,
  gratitude: 3,
}

export function WellbeingCheckScreen({
  mode,
  initialAnswers,
  onSubmit,
  onDone,
}: WellbeingCheckScreenProps) {
  const [answers, setAnswers] = useState<Record<WellbeingDimension, number>>(
    () => ({ ...DEFAULT_ANSWERS, ...initialAnswers }),
  )
  const [touched, setTouched] = useState<Set<WellbeingDimension>>(new Set())
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const scores = useMemo(() => scoreWellbeing(answers), [answers])
  const answered = touched.size
  const complete = isComplete(answers) && answered === WELLBEING_ORDER.length

  const setAnswer = (dimension: WellbeingDimension, value: number) => {
    setAnswers((current) => ({ ...current, [dimension]: value }))
    setTouched((current) => new Set(current).add(dimension))
  }

  const handleSubmit = async () => {
    setSaving(true)
    setError(null)
    try {
      await onSubmit({
        type: mode,
        answers,
        gratitudeNote: note.trim() || undefined,
      })
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save your answers.')
    } finally {
      setSaving(false)
    }
  }

  if (saved) {
    const band = BAND_COPY[scores.band]
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-10 text-center">
        <SunflowerMascot expression="calm" className="h-24 w-24" />
        <div className="space-y-2">
          <h2 className="text-lg font-bold text-lavender-700">Answers saved</h2>
          <StatusPill tone="success">
            <Check className="h-3.5 w-3.5" aria-hidden="true" />
            {band.label}
          </StatusPill>
          <p className="mx-auto max-w-xs text-sm leading-relaxed text-lavender-600">
            {band.detail}
          </p>
        </div>
        <p className="max-w-xs text-[0.6875rem] leading-relaxed text-lavender-600">
          This is a demo check with a simple sum. It is not a clinical measure and
          it does not diagnose anything.
        </p>
        {onDone && (
          <Button fullWidth className="max-w-xs" onClick={onDone}>
            Continue
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">
          {mode === 'start' ? "Before we start" : 'How is it going?'}
        </h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          {mode === 'start'
            ? 'Five short questions, so the demo has a starting point to compare against later.'
            : 'Five short questions, the same as at the start.'}
        </p>
      </header>

      <ProgressBar
        value={answered / WELLBEING_ORDER.length}
        label={`${answered} of ${WELLBEING_ORDER.length} answered`}
      />

      <div className="space-y-3">
        {WELLBEING_ORDER.map((dimension) => {
          const prompt = WELLBEING_PROMPTS[dimension]
          return (
            <Card key={dimension} className="space-y-2.5 !p-4">
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-lavender-700">
                  {prompt.label}
                </h2>
                <p className="text-xs leading-relaxed text-lavender-600">
                  {prompt.question}
                </p>
              </div>
              <div
                role="radiogroup"
                aria-label={prompt.question}
                className="flex items-center gap-1.5"
              >
                {Array.from({ length: WELLBEING_MAX - WELLBEING_MIN + 1 }, (_, index) => {
                  const value = WELLBEING_MIN + index
                  const selected = answers[dimension] === value && touched.has(dimension)
                  return (
                    <button
                      key={value}
                      type="button"
                      role="radio"
                      aria-checked={answers[dimension] === value}
                      aria-label={`${prompt.label}: ${value} of ${WELLBEING_MAX}`}
                      onClick={() => setAnswer(dimension, value)}
                      className={
                        selected
                          ? 'min-h-11 flex-1 rounded-xl border-2 border-sunflower-500 bg-sunflower-300/60 text-sm font-bold text-sunflower-800'
                          : 'min-h-11 flex-1 rounded-xl border border-purple-200 bg-white/70 text-sm font-semibold text-lavender-700 transition-colors hover:bg-white'
                      }
                    >
                      {value}
                    </button>
                  )
                })}
              </div>
              <div className="flex justify-between text-[0.625rem] text-lavender-600">
                <span>{prompt.lowLabel}</span>
                <span>{prompt.highLabel}</span>
              </div>
            </Card>
          )
        })}
      </div>

      <Card className="space-y-2 !p-4">
        <label
          htmlFor="wellbeing-note"
          className="text-sm font-bold text-lavender-700"
        >
          One thing that went well (optional)
        </label>
        <textarea
          id="wellbeing-note"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          rows={3}
          maxLength={280}
          placeholder="A walk, a conversation, a quiet cup of tea."
          className="w-full resize-none rounded-xl border border-purple-300 bg-white/90 px-4 py-3 leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
        />
      </Card>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-rose-deep/40 bg-rose-soft px-3 py-2 text-xs text-rose-deep"
        >
          {error}
        </p>
      )}

      <div className="space-y-2">
        <Button
          fullWidth
          size="lg"
          loading={saving}
          disabled={!complete}
          onClick={() => void handleSubmit()}
          trailingIcon={<ArrowRight className="h-5 w-5" aria-hidden="true" />}
        >
          Save answers
        </Button>
        <p className="text-center text-[0.6875rem] leading-relaxed text-lavender-600">
          <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
          Answer all five to continue. This is a demo check, not a clinical measure.
        </p>
      </div>
    </div>
  )
}
