/**
 * The relaxation tools hub.
 *
 * A sub-router inside the practise tab. The tools are destinations rather than
 * steps in the programme, so each is local state here instead of a journey phase.
 *
 * Every completed practice is recorded through `onPractice`, which leaves a pending
 * entry for the day's check-in. Nothing here writes a check-in: the person's own
 * submission stays the record of adherence.
 */

import { useCallback, useState, type ReactNode } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  Coffee,
  Ear,
  Headphones,
  PlayCircle,
  Sparkles,
  Wind,
  X,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { BreathingOrb } from '@/components/relaxation/BreathingOrb'
import { GroundingWizard } from '@/components/relaxation/GroundingWizard'
import { InformalMindfulnessWizard } from '@/components/relaxation/InformalMindfulnessWizard'
import { AudioLibraryView } from '@/screens/AudioLibraryView'
import type { PracticeEntry } from '@/domain/practice'

type Tool = 'menu' | 'breathing' | 'grounding' | 'audio' | 'informal'

export interface RelaxationToolsViewProps {
  /** Record a finished practice, to pre-populate the day's check-in. */
  onPractice: (entry: PracticeEntry) => void | Promise<void>
  /** Open the guided session again, after the programme has started. */
  onOpenGuided?: () => void
}

export function RelaxationToolsView({
  onPractice,
  onOpenGuided,
}: RelaxationToolsViewProps) {
  const [tool, setTool] = useState<Tool>('menu')
  /**
   * Why the last finished practice is not in the record, or null.
   *
   * Held here because every tool calls the same recorder. Somebody who finishes a
   * session and finds nothing in their journal needs to know the failure was the
   * recording and not their own work.
   */
  const [practiceError, setPracticeError] = useState<string | null>(null)
  const [groundingRun, setGroundingRun] = useState(0)

  const record = useCallback(
    async (
      activity: PracticeEntry['activity'],
      minutes: number,
      source: PracticeEntry['source'],
    ) => {
      try {
        await onPractice({
          activity,
          minutes,
          completedAt: new Date().toISOString(),
          source,
        })
        setPracticeError(null)
      } catch (cause) {
        const detail =
          cause instanceof Error && cause.message ? cause.message : 'Storage failed.'
        setPracticeError(`Practice finished but was not recorded: ${detail}`)
      }
    },
    [onPractice],
  )

  const notice = practiceError ? (
    <PracticeErrorNotice
      message={practiceError}
      onDismiss={() => setPracticeError(null)}
    />
  ) : null

  if (tool === 'breathing') {
    return (
      <WithBack onBack={() => setTool('menu')} notice={notice}>
        <BreathingOrb
          onComplete={({ minutes }) => {
            void record('breathing', minutes, 'breathing')
          }}
        />
      </WithBack>
    )
  }

  if (tool === 'grounding') {
    return (
      <WithBack onBack={() => setTool('menu')} notice={notice}>
        <GroundingWizard
          sessionKey={groundingRun}
          onComplete={({ secondsSpent }) => {
            // A grounding session is short by nature, so the floor is one minute
            // rather than a rounded zero.
            void record(
              'grounding',
              Math.max(1, Math.round(secondsSpent / 60)),
              'grounding',
            )
            setGroundingRun((run) => run + 1)
          }}
          onDone={() => setTool('menu')}
        />
      </WithBack>
    )
  }

  if (tool === 'audio') {
    return (
      <WithBack onBack={() => setTool('menu')} notice={notice}>
        <AudioLibraryView
          onListened={({ minutes }) => {
            void record('audio', minutes, 'audio')
          }}
        />
      </WithBack>
    )
  }

  if (tool === 'informal') {
    return (
      <WithBack onBack={() => setTool('menu')} notice={notice}>
        <InformalMindfulnessWizard
          onComplete={({ minutes }) => {
            void record('mindful-moment', minutes, 'informal')
          }}
          onDone={() => setTool('menu')}
        />
      </WithBack>
    )
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      {notice}
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Practise</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          Pick one. Anything you finish is offered to today's check-in, and you can
          change it there.
        </p>
      </header>

      <div className="space-y-3">
        {onOpenGuided && (
          <button
            type="button"
            onClick={onOpenGuided}
            className="card-spa flex w-full items-center gap-3 border border-sunflower-300/70 bg-gradient-to-r from-sunflower-100/80 to-white p-4 text-left transition-colors hover:bg-sunflower-100"
          >
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunflower-400 text-slate-950">
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-lavender-800">
                Guided session
              </span>
              <span className="mt-0.5 block text-xs leading-relaxed text-lavender-600">
                The eight minute relaxation with the breathing orb. Finish it and it
                goes on today's record.
              </span>
              <span className="mt-1 block text-[0.625rem] font-medium text-lavender-600">
                8 minutes, audio
              </span>
            </span>
            <ChevronRight
              className="h-5 w-5 shrink-0 text-lavender-600"
              aria-hidden="true"
            />
          </button>
        )}
        <ToolCard
          Icon={Wind}
          title="Breathing exercise"
          detail="4-4-4 or 4-7-8, with a visual pacer and optional chimes."
          meta="2, 5 or 10 minutes"
          onClick={() => setTool('breathing')}
        />
        <ToolCard
          Icon={Ear}
          title="Grounding 5-4-3-2-1"
          detail="Five senses, one at a time, to bring attention back to the room."
          meta="5 steps, nothing typed"
          onClick={() => setTool('grounding')}
        />
        <ToolCard
          Icon={Headphones}
          title="Audio library"
          detail="Four short tracks that keep playing with the screen locked."
          meta="3 to 5 minutes"
          onClick={() => setTool('audio')}
        />
        <ToolCard
          Icon={Coffee}
          title="Mindful moment"
          detail="Four steps for something you were going to do anyway."
          meta="4 activities, 4 steps"
          onClick={() => setTool('informal')}
        />
      </div>

      <p className="mt-auto pt-2 text-center text-[0.6875rem] leading-relaxed text-lavender-600">
        <Sparkles className="mr-1 inline h-3 w-3" aria-hidden="true" />
        Same time each day is easier to keep than a longer session.
      </p>
    </div>
  )
}

function ToolCard({
  Icon,
  title,
  detail,
  meta,
  onClick,
}: {
  Icon: LucideIcon
  title: string
  detail: string
  meta: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="card-spa flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white"
    >
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
        <Icon className="h-5 w-5" aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-lavender-700">{title}</span>
        <span className="mt-0.5 block text-xs leading-relaxed text-lavender-600">
          {detail}
        </span>
        <span className="mt-1 block text-[0.625rem] font-medium text-lavender-600">
          {meta}
        </span>
      </span>
      <ChevronRight className="h-5 w-5 shrink-0 text-lavender-600" aria-hidden="true" />
    </button>
  )
}

function WithBack({
  children,
  onBack,
  notice,
}: {
  children: ReactNode
  onBack: () => void
  notice?: ReactNode
}) {
  return (
    <div className="flex flex-1 flex-col">
      <div className="space-y-3 px-5 pt-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/80 px-4 py-2 text-xs font-semibold text-lavender-700 shadow-2xs transition-colors hover:bg-white hover:text-lavender-900 active:bg-lavender-100"
        >
          <ChevronLeft className="h-4 w-4 shrink-0 text-lavender-600" aria-hidden="true" />
          Back to the tools
        </button>
        {notice}
      </div>
      {children}
    </div>
  )
}

function PracticeErrorNotice({
  message,
  onDismiss,
}: {
  message: string
  onDismiss: () => void
}) {
  return (
    <p
      role="status"
      className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-relaxed text-amber-900"
    >
      <span className="flex-1">{message}</span>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss the practice notice"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2.5 text-amber-700 transition-colors hover:bg-amber-100"
      >
        <X className="h-3.5 w-3.5" aria-hidden="true" />
      </button>
    </p>
  )
}
