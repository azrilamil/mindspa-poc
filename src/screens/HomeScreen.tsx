/**
 * Screen 3: the home screen.
 *
 * One hero action, so there is never a question of what to do next: the check-in
 * if today has not been recorded yet, a practice if it has. Everything else lives
 * one tap away in the bottom navigation or the quick cards below, and nothing here
 * repeats that navigation.
 */

import { useMemo } from 'react'
import {
  ArrowRight,
  BookOpen,
  Flame,
  PlayCircle,
  Smile,
  Sparkles,
  TrendingUp,
} from 'lucide-react'

import { Card, ProgressBar, StatusPill } from '@/components/ui'
import { SunflowerMascot } from '@/components/SunflowerMascot'
import { adherenceSummary } from '@/domain/studyDay'
import { moodDefinition } from '@/domain/moods'
import { formatMinutes } from '@/domain/progress'
import type { DailyCheckIn, DemoData, SessionRecord } from '@/domain/types'
import { PROGRAMME_LENGTH_DAYS } from '@/domain/types'
import type { HomeAction } from '@/app/journey'

export interface HomeScreenProps {
  data: DemoData
  today: string
  programmeDay: number | null
  action: HomeAction
  onOpenCheckIn: () => void
  onOpenTools: () => void
  onOpenProgress: () => void
  onOpenLearn: () => void
  /** Reopen the guided session after the programme has already started. */
  onOpenGuided?: () => void
}

export function HomeScreen({
  data,
  today,
  programmeDay,
  action,
  onOpenCheckIn,
  onOpenTools,
  onOpenProgress,
  onOpenLearn,
  onOpenGuided,
}: HomeScreenProps) {
  const summary = useMemo(
    () =>
      adherenceSummary(
        data.user.programmeStartDate,
        data.checkIns.map((entry) => entry.date),
        today,
      ),
    [data.checkIns, data.user.programmeStartDate, today],
  )

  const todayCheckIn = data.checkIns.find((entry) => entry.date === today)
  const recentSessions = useMemo(
    () =>
      [...data.sessions]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 3),
    [data.sessions],
  )
  const minutesThisWeek = useMemo(
    () =>
      data.sessions
        .slice(-7)
        .reduce((sum, session) => sum + session.minutes, 0),
    [data.sessions],
  )

  const isLogged = Boolean(todayCheckIn)
  const heroCopy = heroFor(action, isLogged)

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <Card className="flex items-center gap-3 border border-lavender-200 bg-gradient-to-r from-lavender-50/90 to-white">
        <SunflowerMascot
          expression={isLogged ? 'calm' : 'happy'}
          className="h-16 w-16 shrink-0"
        />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-2">
            <p className="text-base font-bold text-lavender-800">{heroCopy.title}</p>
            <StatusPill
              tone={isLogged ? 'success' : 'warning'}
              className="shrink-0 whitespace-nowrap !px-2 !py-0.5 !text-[0.625rem]"
            >
              {isLogged ? 'Logged' : 'Not yet'}
            </StatusPill>
          </div>
          <p className="text-xs leading-relaxed text-lavender-600">
            {heroCopy.detail}
          </p>
          <button
            type="button"
            onClick={action === 'checkIn' ? onOpenCheckIn : onOpenTools}
            className="inline-flex min-h-11 w-full items-center justify-center gap-1.5 rounded-xl bg-lavender-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-lavender-700 active:bg-lavender-800"
          >
            {action === 'checkIn' ? (
              <>
                <Smile className="h-4 w-4 shrink-0" aria-hidden="true" />
                Choose a mood
              </>
            ) : (
              <>
                <PlayCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
                Start a practice
              </>
            )}
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-3 gap-2.5">
        <StatCard
          Icon={Flame}
          label="Streak"
          value={summary.streak === 1 ? '1 day' : `${summary.streak} days`}
        />
        <StatCard
          Icon={TrendingUp}
          label="Recorded"
          value={`${summary.loggedDays}/${summary.elapsedDays || 0}`}
        />
        <StatCard
          Icon={Sparkles}
          label="This week"
          value={formatMinutes(minutesThisWeek)}
        />
      </div>

      <Card className="space-y-2.5 !p-4">
        <div className="flex items-baseline justify-between gap-2">
          <h2 className="text-sm font-bold text-lavender-700">
            {programmeDay ? `Day ${programmeDay} of ${PROGRAMME_LENGTH_DAYS}` : 'Before day one'}
          </h2>
          <span className="text-xs font-bold tabular-nums text-sunflower-600">
            {summary.adherencePercent}%
          </span>
        </div>
        <ProgressBar
          value={summary.elapsedDays > 0 ? summary.loggedDays / summary.elapsedDays : 0}
          label={`${summary.loggedDays} of ${summary.elapsedDays} elapsed days recorded`}
        />
        <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
          {summary.elapsedDays === 0
            ? 'Finish the guided session to start the programme.'
            : `Counted against the ${summary.elapsedDays} days that have passed, not all 30.`}
        </p>
        <button
          type="button"
          onClick={onOpenProgress}
          className="inline-flex min-h-11 items-center gap-1 text-xs font-semibold text-lavender-700 underline decoration-lavender-300 underline-offset-4"
        >
          Open progress
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </Card>

      {todayCheckIn && <MoodRow checkIn={todayCheckIn} />}

      <Card className="space-y-2 !p-4">
        <h2 className="text-sm font-bold text-lavender-700">Recent sessions</h2>
        {recentSessions.length === 0 ? (
          <p className="text-xs leading-relaxed text-lavender-600">
            Nothing yet. A two minute breathing exercise is a fine place to begin.
          </p>
        ) : (
          <ul className="space-y-2">
            {recentSessions.map((session) => (
              <SessionRow key={session.id} session={session} />
            ))}
          </ul>
        )}
      </Card>

      {onOpenGuided && programmeDay !== null && (
        <button
          type="button"
          onClick={onOpenGuided}
          className="card-spa flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
            <PlayCircle className="h-5 w-5" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-bold text-lavender-700">
              Guided session
            </span>
            <span className="mt-0.5 block text-xs leading-relaxed text-lavender-600">
              Eight minutes with the breathing orb. Repeating it does not restart
              the programme.
            </span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-lavender-600" aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={onOpenLearn}
        className="card-spa flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white"
      >
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
          <BookOpen className="h-5 w-5" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-lavender-700">
            New to mindfulness?
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-lavender-600">
            Five short reads on attention, breath and the wandering mind.
          </span>
        </span>
        <ArrowRight className="h-4 w-4 shrink-0 text-lavender-600" aria-hidden="true" />
      </button>
    </div>
  )
}

function heroFor(
  action: HomeAction,
  isLogged: boolean,
): { title: string; detail: string } {
  switch (action) {
    case 'guided':
      return {
        title: 'Finish the guided session',
        detail: 'The eight minute session opens the rest of the programme.',
      }
    case 'followUp':
      return {
        title: 'Your follow-up check is open',
        detail: 'Thirty days in. Five questions, the same as at the start.',
      }
    case 'checkIn':
      return {
        title: 'How is today going?',
        detail: 'Pick the mood that fits, and anything you did for a few minutes.',
      }
    case 'practice':
    case 'progress':
    default:
      return {
        title: isLogged ? 'Today is recorded' : 'Keep the practice going',
        detail: isLogged
          ? 'A short breathing or grounding session fits in the gap before dinner.'
          : 'A few minutes of breathing or grounding is enough for today.',
      }
  }
}

function StatCard({
  Icon,
  label,
  value,
}: {
  Icon: typeof Flame
  label: string
  value: string
}) {
  return (
    <div className="card-spa flex flex-col items-center gap-1 p-3 text-center">
      <Icon className="h-4 w-4 text-sunflower-600" aria-hidden="true" />
      <span className="text-sm font-bold tabular-nums text-lavender-800">{value}</span>
      <span className="text-[0.625rem] font-medium uppercase tracking-wide text-lavender-600">
        {label}
      </span>
    </div>
  )
}

function MoodRow({ checkIn }: { checkIn: DailyCheckIn }) {
  const definition = moodDefinition(checkIn.mood)
  return (
    <div className="flex items-center gap-2 rounded-2xl border border-lavender-200 bg-white/70 px-4 py-2.5">
      <span className={`h-2.5 w-2.5 rounded-full ${definition.dotClass}`} aria-hidden="true" />
      <p className="min-w-0 flex-1 text-xs text-lavender-700">
        Today felt <span className="font-bold">{definition.label.toLowerCase()}</span>
        {checkIn.activities.length > 0 &&
          `, ${checkIn.activities.length} ${checkIn.activities.length === 1 ? 'thing' : 'things'} done.`}
      </p>
      <span className="text-[0.625rem] font-semibold tabular-nums text-lavender-600">
        {checkIn.minutes} min
      </span>
    </div>
  )
}

function SessionRow({ session }: { session: SessionRecord }) {
  const label: Record<SessionRecord['kind'], string> = {
    guided: 'Guided session',
    breathing: 'Breathing',
    grounding: 'Grounding',
    informal: 'Mindful moment',
    audio: 'Audio',
  }
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <span className="min-w-0 truncate text-lavender-700">{label[session.kind]}</span>
      <span className="shrink-0 text-[0.625rem] text-lavender-600">
        {session.date} · {session.minutes} min
      </span>
    </li>
  )
}
