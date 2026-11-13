/**
 * The demo journey, as a typed state machine.
 *
 * The flow is a sequence, not a set of independent pages: you cannot reach the
 * home screen before the guided session has finished, and you cannot reach the
 * follow-up wellbeing check before the programme has run its course. Modelling
 * that as state rather than as route guards means "unreachable" is something the
 * compiler and the tests enforce, instead of something a new screen can forget to
 * check.
 *
 * Every phase after `home` is a destination rather than a step, so the bottom
 * navigation can reach it and none of them advances the programme on their own.
 */

import { PROGRAMME_LENGTH_DAYS } from '@/domain/types'
import { programmeDayNumber } from '@/domain/studyDay'

export const JOURNEY_PHASES = [
  'splash',
  'landing',
  'wellbeingStart',
  'guided',
  'home',
  'checkIn',
  'tools',
  'audio',
  'journal',
  'learn',
  'progress',
  'wellbeing',
] as const

export type JourneyPhase = (typeof JOURNEY_PHASES)[number]

/** Phases that need an active demo session. */
export const SESSION_PHASES: readonly JourneyPhase[] = [
  'wellbeingStart',
  'guided',
  'home',
  'checkIn',
  'tools',
  'audio',
  'journal',
  'learn',
  'progress',
  'wellbeing',
]

export function needsSession(phase: JourneyPhase): boolean {
  return SESSION_PHASES.includes(phase)
}

export interface JourneySnapshot {
  /** True once the anonymous demo session exists. */
  hasSession: boolean
  /** True once the opening wellbeing check has been submitted. */
  hasStartCheck: boolean
  /** True once the guided session has been completed. */
  hasGuidedSession: boolean
  /** True once the follow-up check has been submitted. */
  hasFollowUpCheck: boolean
  /** True when a check-in already exists for today. */
  hasLoggedToday: boolean
  /** The session's programme start date, YYYY-MM-DD, or undefined. */
  startDate?: string
  /** Local calendar date, YYYY-MM-DD. */
  today: string
}

export function emptySnapshot(date: string): JourneySnapshot {
  return {
    hasSession: false,
    hasStartCheck: false,
    hasGuidedSession: false,
    hasFollowUpCheck: false,
    hasLoggedToday: false,
    today: date,
  }
}

/**
 * Where a person belongs right now.
 *
 * The one gate that matters: `startDate` is only set when the guided session
 * completes, so somebody who entered the demo but never finished the session can
 * never reach the home screen with a programme already running.
 *
 * Once the programme is running the guided session is a destination rather than a
 * gate: `canOpen` permits it again from home and from the tools, so a visitor can
 * hear the track a second time. A repeat records a session for today and leaves
 * `startDate` alone.
 */
export function resolvePhase(snapshot: JourneySnapshot): JourneyPhase {
  if (!snapshot.hasSession) return 'landing'
  if (!snapshot.hasStartCheck) return 'wellbeingStart'
  if (!snapshot.hasGuidedSession || !snapshot.startDate) return 'guided'
  return 'home'
}

/** The programme day, or null before the guided session. */
export function programmeDay(snapshot: JourneySnapshot): number | null {
  if (!snapshot.startDate) return null
  const day = programmeDayNumber(snapshot.startDate, snapshot.today)
  if (day === null || day < 1) return null
  return Math.min(day, PROGRAMME_LENGTH_DAYS)
}

/** True once the final day has been reached and the follow-up is still open. */
export function isFollowUpDue(snapshot: JourneySnapshot): boolean {
  const day = programmeDay(snapshot)
  return day !== null && day >= PROGRAMME_LENGTH_DAYS && !snapshot.hasFollowUpCheck
}

/** The transitions the machine permits. */
const TRANSITIONS: Record<JourneyPhase, readonly JourneyPhase[]> = {
  splash: ['landing'],
  landing: ['wellbeingStart'],
  wellbeingStart: ['guided'],
  guided: ['home', 'tools'],
  home: ['checkIn', 'tools', 'audio', 'journal', 'learn', 'progress', 'wellbeing', 'guided'],
  checkIn: ['home'],
  tools: ['home'],
  audio: ['home'],
  journal: ['home'],
  learn: ['home'],
  progress: ['home', 'wellbeing'],
  wellbeing: ['home', 'progress'],
}

export function canTransition(from: JourneyPhase, to: JourneyPhase): boolean {
  return TRANSITIONS[from].includes(to)
}

export function allowedTransitions(from: JourneyPhase): readonly JourneyPhase[] {
  return TRANSITIONS[from]
}

/** The single phase after finishing the action for `phase`, or null. */
export function nextPhaseAfter(phase: JourneyPhase): JourneyPhase | null {
  switch (phase) {
    case 'splash':
      return 'landing'
    case 'landing':
      return 'wellbeingStart'
    case 'wellbeingStart':
      return 'guided'
    case 'guided':
      return 'home'
    default:
      return null
  }
}

/** What the home screen should offer as the single most useful next action. */
export type HomeAction = 'checkIn' | 'guided' | 'followUp' | 'practice' | 'progress'

export function homeAction(snapshot: JourneySnapshot): HomeAction {
  const phase = resolvePhase(snapshot)
  if (phase === 'guided') return 'guided'
  if (isFollowUpDue(snapshot)) return 'followUp'
  if (!snapshot.hasLoggedToday) return 'checkIn'
  return 'practice'
}

/**
 * Whether a destination may be opened from the current phase.
 *
 * The tools are always reachable from home, so the guard exists only to stop a
 * pre session phase from jumping straight into a destination it has no context
 * for.
 */
export function canOpen(snapshot: JourneySnapshot, destination: JourneyPhase): boolean {
  const phase = resolvePhase(snapshot)
  if (phase === destination) return true
  if (needsSession(phase) && TRANSITIONS[phase].includes(destination)) return true
  // `progress` and `wellbeing` are a two way pair within the session.
  if (phase === 'wellbeing' && destination === 'progress') return true
  if (phase === 'progress' && destination === 'wellbeing') return true
  return false
}
