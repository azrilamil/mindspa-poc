/**
 * The demo session hook.
 *
 * One place that owns the loaded demo data and the actions that change it. Every
 * screen reads from this rather than calling the port directly, so a write always
 * refreshes the view that depends on it and two screens cannot disagree about the
 * current streak.
 *
 * The hook re-reads after each write rather than maintaining a hand written cache.
 * The dataset is a month of a single session, so a re-read is cheaper to reason
 * about than an invalidation graph.
 */

import { useCallback, useEffect, useMemo, useState } from 'react'

import { getDataPort } from '@/data'
import type { DataPort } from '@/data/port'
import { homeAction, programmeDay } from '@/app/journey'
import type {
  CheckInInput,
  DailyCheckIn,
  DemoData,
  JournalInput,
  ResearcherSnapshot,
  SessionInput,
  WellbeingInput,
} from '@/domain/types'

export interface DemoSession {
  /** True until the first read finishes. */
  loading: boolean
  error: string | null
  data: DemoData | null
  today: string
  programmeDay: number | null
  hasLoggedToday: boolean
  nextAction: ReturnType<typeof homeAction> | null
  refresh: () => Promise<void>
  startDemo: () => Promise<void>
  resetDemo: () => Promise<void>
  signOut: () => Promise<void>
  saveCheckIn: (input: CheckInInput) => Promise<DailyCheckIn>
  recordSession: (input: SessionInput) => Promise<void>
  saveWellbeing: (input: WellbeingInput) => Promise<void>
  saveJournal: (input: JournalInput) => Promise<void>
  deleteJournal: (id: string) => Promise<void>
  loadResearcher: () => Promise<ResearcherSnapshot>
  port: DataPort
}

export function useDemoSession(portOverride?: DataPort): DemoSession {
  const port = useMemo(() => portOverride ?? getDataPort(), [portOverride])
  const [data, setData] = useState<DemoData | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [settled, setSettled] = useState(false)
  const [today, setToday] = useState(() => port.today())

  /**
   * Read the session.
   *
   * Deliberately free of a synchronous state write at the top: the effect below
   * calls this on mount, and a `setBusy(true)` before the first `await` would be a
   * render triggered from an effect for no visible gain. `loading` is therefore
   * derived from `settled` rather than stored.
   */
  const refresh = useCallback(async () => {
    try {
      const next = await port.getDemoData()
      setData(next)
      setToday(port.today())
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not load the demo session.',
      )
    } finally {
      setSettled(true)
    }
  }, [port])

  useEffect(() => {
    // A false positive: `refresh` is async and its first state write follows an
    // await, so this effect does not start a cascading synchronous render. There is
    // also no external system to subscribe to here, which is why the read is pulled
    // rather than pushed.
    // eslint-disable-next-line react/set-state-in-effect
    void refresh()
  }, [refresh])

  const startDemo = useCallback(async () => {
    try {
      await port.startDemoSession()
      await refresh()
      setError(null)
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Could not start the demo session.',
      )
    }
  }, [port, refresh])

  const resetDemo = useCallback(async () => {
    try {
      await port.resetDemo()
      await refresh()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset the demo.')
    }
  }, [port, refresh])

  const signOut = useCallback(async () => {
    await port.endSession()
    setData(null)
  }, [port])

  const saveCheckIn = useCallback(
    async (input: CheckInInput) => {
      const record = await port.saveCheckIn(input)
      await port.clearPracticeSeed(input.date)
      await refresh()
      return record
    },
    [port, refresh],
  )

  const recordSession = useCallback(
    async (input: SessionInput) => {
      await port.recordSession(input)
      await refresh()
    },
    [port, refresh],
  )

  const saveWellbeing = useCallback(
    async (input: WellbeingInput) => {
      await port.saveWellbeing(input)
      await refresh()
    },
    [port, refresh],
  )

  const saveJournal = useCallback(
    async (input: JournalInput) => {
      await port.saveJournalEntry(input)
      await refresh()
    },
    [port, refresh],
  )

  const deleteJournal = useCallback(
    async (id: string) => {
      await port.deleteJournalEntry(id)
      await refresh()
    },
    [port, refresh],
  )

  const loadResearcher = useCallback(() => port.getResearcherSnapshot(), [port])

  const snapshot = useMemo(
    () => ({
      hasSession: Boolean(data),
      hasStartCheck: Boolean(data?.wellbeing.some((entry) => entry.type === 'start')),
      hasGuidedSession: Boolean(
        data?.sessions.some((entry) => entry.kind === 'guided' && entry.completed),
      ),
      hasFollowUpCheck: Boolean(
        data?.wellbeing.some((entry) => entry.type === 'follow-up'),
      ),
      hasLoggedToday: Boolean(data?.checkIns.some((entry) => entry.date === today)),
      startDate: data?.user.programmeStartDate,
      today,
    }),
    [data, today],
  )

  return {
    loading: !settled,
    error,
    data,
    today,
    programmeDay: programmeDay(snapshot),
    hasLoggedToday: snapshot.hasLoggedToday,
    nextAction: data ? homeAction(snapshot) : null,
    refresh,
    startDemo,
    resetDemo,
    signOut,
    saveCheckIn,
    recordSession,
    saveWellbeing,
    saveJournal,
    deleteJournal,
    loadResearcher,
    port,
  }
}
