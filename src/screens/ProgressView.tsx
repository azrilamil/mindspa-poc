/**
 * Progress and history.
 *
 * Everything here is derived by `domain/progress.ts`: the streak, the 30 day
 * calendar, the totals and the wellbeing comparison. The screen holds no arithmetic
 * of its own, so the numbers on it can be tested without rendering.
 */

import { ArrowRight, BarChart3, CalendarDays, Check, NotebookPen, Timer } from 'lucide-react'

import { Card, EmptyState, StatusPill } from '@/components/ui'
import { StreakCalendar } from '@/components/StreakCalendar'
import { moodDefinition } from '@/domain/moods'
import { BAND_COPY } from '@/domain/wellbeing'
import { formatMinutes, type ProgressSummary } from '@/domain/progress'
import type { DailyCheckIn } from '@/domain/types'

export interface ProgressViewProps {
  summary: ProgressSummary
  checkIns: readonly DailyCheckIn[]
  onSelectDate: (date: string) => void
  onOpenFollowUp: () => void
  followUpDue: boolean
}

export function ProgressView({
  summary,
  checkIns,
  onSelectDate,
  onOpenFollowUp,
  followUpDue,
}: ProgressViewProps) {
  const adherenceForCalendar = {
    loggedDays: summary.loggedDays,
    denominator: summary.elapsedDays,
    percent: summary.adherencePercent,
    programmeComplete: summary.programmeComplete,
    caption: summary.programmeComplete
      ? `${summary.loggedDays} of 30 days recorded`
      : `${summary.loggedDays} of ${summary.elapsedDays} days so far`,
  }

  const recent = [...checkIns]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 7)

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Progress</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          Your own record. Nothing here is compared with anyone else.
        </p>
      </header>

      <div className="grid grid-cols-2 gap-2.5">
        <MetricCard
          Icon={CalendarDays}
          label="Days recorded"
          value={`${summary.loggedDays}`}
          detail={`of ${summary.elapsedDays} so far`}
        />
        <MetricCard
          Icon={Timer}
          label="Practice time"
          value={formatMinutes(summary.totalMinutes)}
          detail={`${summary.sessionCount} sessions`}
        />
        <MetricCard
          Icon={Check}
          label="Longest run"
          value={`${summary.longestStreak}`}
          detail={summary.longestStreak === 1 ? 'day' : 'days'}
        />
        <MetricCard
          Icon={NotebookPen}
          label="Journal"
          value={`${summary.journalCount}`}
          detail={summary.journalCount === 1 ? 'entry' : 'entries'}
        />
      </div>

      <StreakCalendar
        days={summary.calendar}
        adherence={adherenceForCalendar}
        streak={summary.streak}
        onSelectDate={onSelectDate}
      />

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-lavender-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-lavender-700">Check-ins by week</h2>
        </div>
        <ul className="flex items-end gap-2" aria-label="Check-ins per week">
          {summary.weeklyCheckIns.map((count, index) => {
            const max = Math.max(6, ...summary.weeklyCheckIns)
            const height = Math.round((count / max) * 100)
            return (
              <li key={index} className="flex flex-1 flex-col items-center gap-1">
                <span className="text-[0.625rem] font-bold tabular-nums text-lavender-700">
                  {count}
                </span>
                <span
                  aria-hidden="true"
                  className="w-full rounded-t-md bg-lavender-300"
                  style={{ height: `${Math.max(4, height)}px` }}
                />
                <span className="text-[0.5625rem] text-lavender-600">
                  W{index + 1}
                </span>
              </li>
            )
          })}
        </ul>
        <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
          Five six-day blocks across the thirty day programme.
        </p>
      </Card>

      <Card className="space-y-2">
        <h2 className="text-sm font-bold text-lavender-700">Wellbeing check</h2>
        {summary.wellbeing?.start ? (
          <>
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs text-lavender-600">At the start</p>
                <p className="text-lg font-bold tabular-nums text-lavender-800">
                  {summary.wellbeing.start.total}/25
                </p>
              </div>
              {summary.wellbeing.latest && (
                <div className="text-right">
                  <p className="text-xs text-lavender-600">Latest</p>
                  <p className="text-lg font-bold tabular-nums text-lavender-800">
                    {summary.wellbeing.latest.total}/25
                  </p>
                </div>
              )}
            </div>
            <StatusPill tone={summary.wellbeing.delta && summary.wellbeing.delta >= 0 ? 'success' : 'neutral'}>
              {summary.wellbeing.copy}
            </StatusPill>
            <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
              Five demo prompts, added up. Not a clinical measure.
            </p>
          </>
        ) : (
          <p className="text-xs leading-relaxed text-lavender-600">
            No wellbeing check on file yet.
          </p>
        )}
        {followUpDue && (
          <button
            type="button"
            onClick={onOpenFollowUp}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl border border-sunflower-500 bg-sunflower-300/40 px-4 text-xs font-bold text-sunflower-800"
          >
            Take the follow-up check
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        )}
      </Card>

      <section className="space-y-2.5">
        <h2 className="text-sm font-bold text-lavender-700">Recent check-ins</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No check-ins yet"
            detail="Your daily mood and practice will appear here as you record them."
          />
        ) : (
          <ul className="space-y-2">
            {recent.map((entry) => {
              const definition = moodDefinition(entry.mood)
              return (
                <li
                  key={entry.id}
                  className="flex items-center gap-2.5 rounded-xl border border-lavender-200 bg-white/70 px-3 py-2.5"
                >
                  <span
                    aria-hidden="true"
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${definition.dotClass}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-semibold text-lavender-800">
                      {definition.label} · Day {entry.programmeDay}
                    </p>
                    <p className="truncate text-[0.625rem] text-lavender-600">
                      {entry.activities.length} done, {entry.minutes} min
                      {entry.note ? ` · ${entry.note}` : ''}
                    </p>
                  </div>
                  <span className="shrink-0 text-[0.625rem] tabular-nums text-lavender-600">
                    {entry.date.slice(5)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </section>

      {summary.wellbeing?.latest && summary.wellbeing.latest.band && (
        <Card className="bg-lavender-50/80 !p-4">
          <p className="text-xs font-bold text-lavender-800">
            {BAND_COPY[summary.wellbeing.latest.band].label}
          </p>
          <p className="mt-1 text-[0.6875rem] leading-relaxed text-lavender-600">
            {BAND_COPY[summary.wellbeing.latest.band].detail}
          </p>
        </Card>
      )}
    </div>
  )
}

function MetricCard({
  Icon,
  label,
  value,
  detail,
}: {
  Icon: typeof Check
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="card-spa flex flex-col gap-0.5 p-3">
      <Icon className="h-4 w-4 text-sunflower-600" aria-hidden="true" />
      <span className="mt-1 text-base font-bold tabular-nums text-lavender-800">
        {value}
      </span>
      <span className="text-[0.625rem] font-medium uppercase tracking-wide text-lavender-600">
        {label}
      </span>
      <span className="text-[0.625rem] text-lavender-600">{detail}</span>
    </div>
  )
}
