/**
 * The 30 day adherence calendar.
 *
 * Three presentation rules are implemented here:
 *
 * - The denominator is the days that have elapsed, not a fixed 30. Somebody on day
 *   four who has recorded four days sees 4/4 and 100 per cent, not 4/30. A fixed
 *   denominator in week one reads as failure and is a plausible reason to stop
 *   opening the app.
 * - A missed day is marked and named without scolding: "Not recorded" describes the
 *   day, not the person. There is no broken streak styling and no red.
 * - A recorded day shows its mood, so the month reads as how it felt rather than
 *   only as a tally.
 *
 * Every day from today backwards is tappable, which is what makes "file
 * yesterday's check-in" reachable from the calendar.
 */

import { Check, Flame, Lock, Minus } from 'lucide-react'

import { Card, ProgressBar, StatusPill } from '@/components/ui'
import { cn } from '@/lib/cn'
import { moodDefinition } from '@/domain/moods'
import {
  DAY_STATUS_LABELS,
  badgesFor,
  statusCounts,
  type AdherenceDisplay,
  type CalendarDay,
} from '@/domain/checkIn'
import { PROGRAMME_LENGTH_DAYS } from '@/domain/types'

export interface StreakCalendarProps {
  days: CalendarDay[]
  adherence: AdherenceDisplay
  streak: number
  /** Open the check-in for a date. Only called for editable days. */
  onSelectDate: (date: string) => void
}

export function StreakCalendar({
  days,
  adherence,
  streak,
  onSelectDate,
}: StreakCalendarProps) {
  const counts = statusCounts(days)
  const badges = badgesFor(adherence.loggedDays, streak, adherence.programmeComplete)

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-bold text-lavender-700">
            Record over {PROGRAMME_LENGTH_DAYS} days
          </h2>
          <span className="text-sm font-bold tabular-nums text-sunflower-600">
            {adherence.percent}%
          </span>
        </div>

        <ProgressBar
          value={
            adherence.denominator > 0 ? adherence.loggedDays / adherence.denominator : 0
          }
          label={`${adherence.caption}, ${adherence.percent} per cent`}
        />

        <div className="flex items-baseline justify-between gap-3">
          <p className="text-sm text-lavender-700">{adherence.caption}</p>
          {streak > 0 && (
            <StatusPill tone="warning">
              <Flame className="h-3.5 w-3.5" aria-hidden="true" />
              {streak} {streak === 1 ? 'day' : 'days'} in a row
            </StatusPill>
          )}
        </div>

        <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
          {adherence.programmeComplete
            ? 'The programme is complete, so this counts against the full thirty days.'
            : `Counted against the ${adherence.denominator} days that have passed.`}
        </p>
      </Card>

      <Card className="space-y-3">
        <ul className="grid grid-cols-6 gap-2">
          {days.map((day) => (
            <li key={day.dayNumber}>
              <DayCell day={day} onSelect={onSelectDate} />
            </li>
          ))}
        </ul>

        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 pt-1">
          <LegendItem status="completed" count={counts.completed} />
          <LegendItem status="missed" count={counts.missed} />
          <LegendItem status="todayPending" count={counts.todayPending} />
          <LegendItem status="future" count={counts.future} />
        </ul>
      </Card>

      {badges.length > 0 && (
        <Card className="space-y-2">
          <h2 className="text-sm font-bold text-lavender-700">Milestones</h2>
          <ul className="space-y-2">
            {badges.map((badge) => (
              <li key={badge.key} className="flex items-start gap-2.5">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-sunflower-400 text-sunflower-700">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} aria-hidden="true" />
                </span>
                <span className="min-w-0">
                  <span className="block text-xs font-semibold text-lavender-700">
                    {badge.label}
                  </span>
                  <span className="block text-[0.6875rem] text-lavender-600">
                    {badge.detail}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  )
}

function DayCell({
  day,
  onSelect,
}: {
  day: CalendarDay
  onSelect: (date: string) => void
}) {
  const label = `${DAY_STATUS_LABELS[day.status]}${day.date ? `, ${day.date}` : ''}`
  const mood = day.mood ? moodDefinition(day.mood) : null

  const content = (
    <>
      <span
        aria-hidden="true"
        className={cn(
          'flex h-7 w-7 items-center justify-center rounded-full text-[0.625rem] font-bold',
          day.status === 'completed' && 'bg-emerald-500 text-white',
          day.status === 'missed' &&
            'bg-white/80 text-lavender-600 ring-1 ring-purple-200',
          day.status === 'todayPending' &&
            'bg-sunflower-300 text-sunflower-700 ring-2 ring-sunflower-500',
          day.status === 'future' && 'bg-white/50 text-lavender-600/60',
        )}
      >
        {day.status === 'completed' ? (
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        ) : day.status === 'future' ? (
          <Lock className="h-3 w-3" />
        ) : day.status === 'missed' ? (
          <Minus className="h-3.5 w-3.5" />
        ) : (
          day.dayNumber
        )}
      </span>
      <span
        aria-hidden="true"
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          mood ? mood.dotClass : 'bg-transparent',
        )}
      />
    </>
  )

  if (!day.editable || !day.date) {
    return (
      <span
        className="flex min-h-14 flex-col items-center justify-center gap-1"
        aria-label={label}
        title={label}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      onClick={() => onSelect(day.date)}
      aria-label={label}
      title={label}
      className={cn(
        'flex min-h-14 w-full flex-col items-center justify-center gap-1 rounded-xl',
        'transition-colors hover:bg-white/70',
        day.isToday && 'bg-sunflower-300/30',
      )}
    >
      {content}
    </button>
  )
}

function LegendItem({
  status,
  count,
}: {
  status: CalendarDay['status']
  count: number
}) {
  if (count === 0) return null
  const swatch: Record<CalendarDay['status'], string> = {
    completed: 'bg-emerald-500',
    missed: 'bg-white ring-1 ring-purple-200',
    todayPending: 'bg-sunflower-300 ring-2 ring-sunflower-500',
    future: 'bg-white/60',
  }
  return (
    <li className="flex items-center gap-1.5 text-[0.625rem] text-lavender-600">
      <span
        aria-hidden="true"
        className={cn('h-2.5 w-2.5 rounded-full', swatch[status])}
      />
      {DAY_STATUS_LABELS[status]} ({count})
    </li>
  )
}
