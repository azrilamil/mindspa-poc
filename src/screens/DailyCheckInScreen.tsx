/**
 * The daily check-in.
 *
 * Mood, what was done, how long it took, and an optional note. Two behaviours are
 * worth stating:
 *
 * - Any day up to today can be filed or corrected, and a future day is not
 *   offered at all. The date stepper is bounded at the programme start and at
 *   today.
 * - Pending practices arrive pre-ticked, so finishing a breathing exercise and
 *   then checking in does not ask for the same thing twice. The person can still
 *   change any of it, and their submission is the record.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from 'lucide-react'

import { Button, Card, ErrorNote, StatusPill } from '@/components/ui'
import { MoodFace } from '@/components/MoodFace'
import { cn } from '@/lib/cn'
import {
  CHECK_IN_ACTIVITIES,
  DURATION_PILLS,
  MAX_NOTE_LENGTH,
  MOOD_CHOICES,
} from '@/domain/moods'
import {
  checkInWindow,
  isEditable,
  programmeDayFor,
  validateCheckIn,
} from '@/domain/checkIn'
import { addDays } from '@/domain/studyDay'
import { celebrate } from '@/lib/celebrate'
import type { Activity, DailyCheckIn, Mood } from '@/domain/types'
import type { CheckInSeed } from '@/domain/practice'

export interface DailyCheckInScreenProps {
  startDate: string
  today: string
  checkIns: readonly DailyCheckIn[]
  loadSeed: (date: string) => Promise<CheckInSeed>
  onSubmit: (input: {
    date: string
    mood: Mood
    activities: Activity[]
    minutes: number
    note?: string
  }) => Promise<void>
  onDone: () => void
  initialDate?: string
}

export function DailyCheckInScreen(props: DailyCheckInScreenProps) {
  const initial = props.initialDate ?? props.today
  // Keyed by date so changing the day remounts the form with fresh state: there is
  // nothing stale to reset, because the component did not exist a moment ago.
  return <CheckInForm key={initial} {...props} />
}

function CheckInForm({
  startDate,
  today,
  checkIns,
  loadSeed,
  onSubmit,
  onDone,
  initialDate,
}: DailyCheckInScreenProps) {
  const range = useMemo(() => checkInWindow(startDate, today), [startDate, today])
  const [date, setDate] = useState(initialDate ?? range.defaultDate)
  const [mood, setMood] = useState<Mood | null>(null)
  const [activities, setActivities] = useState<Activity[]>([])
  const [minutes, setMinutes] = useState<number>(0)
  const [note, setNote] = useState('')
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const existing = checkIns.find((entry) => entry.date === date) ?? null

  useEffect(() => {
    let cancelled = false
    const log = checkIns.find((entry) => entry.date === date) ?? null
    void loadSeed(date).then(
      (seed) => {
        if (cancelled) return
        // A submitted check-in wins over the tools' guess, which wins over blank.
        if (log) {
          setMood(log.mood)
          setActivities([...log.activities])
          setMinutes(log.minutes)
          setNote(log.note ?? '')
        } else {
          setMood(null)
          setActivities([...seed.activities])
          setMinutes(seed.minutes)
          setNote('')
        }
        setLoaded(true)
      },
      () => {
        if (!cancelled) setLoaded(true)
      },
    )
    return () => {
      cancelled = true
    }
  }, [checkIns, date, loadSeed])

  const toggleActivity = useCallback((activity: Activity) => {
    setActivities((current) =>
      current.includes(activity)
        ? current.filter((entry) => entry !== activity)
        : [...current, activity],
    )
  }, [])

  const handleSubmit = useCallback(async () => {
    const result = validateCheckIn({ mood, activities, minutes, note }, date, today)
    if (!result.ok) {
      setErrors(result.errors as Record<string, string>)
      setFormError('A mood, at least one activity and a duration are needed.')
      return
    }
    setErrors({})
    setFormError(null)
    setSaving(true)
    try {
      await onSubmit(result.values)
      celebrate(result.values.mood)
      onDone()
    } catch (cause) {
      setFormError(
        cause instanceof Error ? cause.message : 'Could not save the check-in.',
      )
    } finally {
      setSaving(false)
    }
  }, [activities, date, minutes, mood, note, onDone, onSubmit, today])

  const editable = isEditable(date, today)
  const dayNumber = programmeDayFor(startDate, date)
  const previousDate = addDays(date, -1)
  const nextDate = addDays(date, 1)

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Daily check-in</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          Pick the mood that fits today, then anything you did for a few minutes.
        </p>
      </header>

      <Card className="flex items-center gap-2 !p-3">
        <button
          type="button"
          onClick={() => setDate(previousDate)}
          disabled={previousDate < range.earliest}
          aria-label="Previous day"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lavender-700 transition-colors hover:bg-lavender-100 disabled:opacity-40"
        >
          <ChevronLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold text-lavender-700">
            {date === today ? 'Today' : date}
          </p>
          <p className="text-[0.6875rem] text-lavender-600">
            {dayNumber ? `Day ${dayNumber} of 30` : 'Outside the programme window'}
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDate(nextDate)}
          disabled={nextDate > range.latest}
          aria-label="Next day"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-lavender-700 transition-colors hover:bg-lavender-100 disabled:opacity-40"
        >
          <ChevronRight className="h-5 w-5" aria-hidden="true" />
        </button>
      </Card>

      {existing && (
        <StatusPill tone="success">
          <Check className="h-3.5 w-3.5" aria-hidden="true" />
          Already recorded. You can update it.
        </StatusPill>
      )}

      {!loaded ? (
        <div className="flex flex-1 items-center justify-center py-10" role="status">
          <Loader2 className="h-6 w-6 animate-spin text-lavender-600" aria-hidden="true" />
          <span className="sr-only">Loading the day</span>
        </div>
      ) : (
        <>
          <Card className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-lavender-700">Mood</h2>
              {errors.mood && (
                <span role="alert" className="text-xs text-rose-deep">
                  {errors.mood}
                </span>
              )}
            </div>
            <div
              role="radiogroup"
              aria-label="Choose your mood"
              className="grid grid-cols-3 gap-2.5 sm:grid-cols-5"
            >
              {MOOD_CHOICES.map((choice) => {
                const selected = mood === choice.mood
                return (
                  <button
                    key={choice.mood}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => setMood(choice.mood)}
                    className={cn(
                      'flex min-h-24 flex-col items-center justify-center gap-1.5 rounded-2xl border-2 p-2 transition-all',
                      selected
                        ? `${choice.selectedClass} scale-[1.02] shadow-md`
                        : `${choice.idleClass} hover:bg-white`,
                    )}
                  >
                    <MoodFace
                      expression={choice.expression}
                      alt={choice.label}
                      className="h-12 w-12"
                    />
                    <span
                      className={cn(
                        'text-center text-xs',
                        selected
                          ? 'font-bold text-slate-800'
                          : 'font-medium text-lavender-700',
                      )}
                    >
                      {choice.label}
                    </span>
                  </button>
                )
              })}
            </div>
          </Card>

          <Card className="space-y-3">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-lavender-700">What did you do?</h2>
              {errors.activities && (
                <span role="alert" className="text-xs text-rose-deep">
                  {errors.activities}
                </span>
              )}
            </div>
            <ul className="space-y-2">
              {CHECK_IN_ACTIVITIES.map((definition) => {
                const checked = activities.includes(definition.activity)
                return (
                  <li key={definition.activity}>
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={checked}
                      onClick={() => toggleActivity(definition.activity)}
                      className={cn(
                        'flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors',
                        checked
                          ? 'border-sunflower-500 bg-sunflower-300/40'
                          : 'border-purple-200 bg-white/70 hover:bg-white',
                      )}
                    >
                      <span
                        aria-hidden="true"
                        className={cn(
                          'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border',
                          checked
                            ? 'border-sunflower-600 bg-sunflower-500 text-white'
                            : 'border-purple-300 bg-white',
                        )}
                      >
                        {checked && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold text-lavender-800">
                          {definition.label}
                        </span>
                        <span className="block text-[0.6875rem] text-lavender-600">
                          {definition.detail}
                        </span>
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>

          <Card className="space-y-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <h2 className="text-sm font-bold text-lavender-700">How long?</h2>
              {errors.minutes && (
                <span role="alert" className="text-xs text-rose-deep">
                  {errors.minutes}
                </span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              {DURATION_PILLS.map((choice) => (
                <button
                  key={choice}
                  type="button"
                  aria-pressed={minutes === choice}
                  onClick={() => setMinutes(choice)}
                  className={cn(
                    'min-h-11 rounded-xl border text-sm font-semibold transition-colors',
                    minutes === choice
                      ? 'border-sunflower-500 bg-sunflower-300/60 text-sunflower-800'
                      : 'border-purple-200 bg-white/70 text-lavender-700 hover:bg-white',
                  )}
                >
                  {choice} min
                </button>
              ))}
            </div>
          </Card>

          <Card className="space-y-2">
            <label htmlFor="checkin-note" className="text-sm font-bold text-lavender-700">
              Anything worth remembering? (optional)
            </label>
            <textarea
              id="checkin-note"
              value={note}
              maxLength={MAX_NOTE_LENGTH}
              rows={3}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Short practice after lunch, quieter than yesterday."
              className="w-full resize-none rounded-xl border border-purple-300 bg-white/90 px-4 py-3 leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
            />
            <p className="text-right text-[0.625rem] text-lavender-600">
              {note.length}/{MAX_NOTE_LENGTH}
            </p>
          </Card>

          {formError && <ErrorNote message={formError} />}

          <div className="mt-auto space-y-3 pt-2">
            <Button
              fullWidth
              size="lg"
              loading={saving}
              disabled={!editable}
              onClick={() => void handleSubmit()}
              icon={<CalendarDays className="h-5 w-5" aria-hidden="true" />}
            >
              {existing ? 'Update the check-in' : 'Save the check-in'}
            </Button>
            <p className="text-center text-[0.6875rem] leading-relaxed text-lavender-600">
              Any day up to today can be recorded or corrected.
            </p>
          </div>
        </>
      )}
    </div>
  )
}
