/**
 * The application root.
 *
 * Two top level destinations: the participant journey, whose internal phase is
 * governed by the state machine in `app/journey.ts`, and the researcher dashboard
 * at the real `#/admin` URL. The route decides which one is mounted, so a reviewer
 * can link straight to the dashboard.
 *
 * The update banner sits outside both branches on purpose: an app waiting for a
 * reload is exactly when somebody needs to be told a new version is ready.
 */

import { useCallback, useMemo, useState } from 'react'
import { MoreHorizontal, Sparkles } from 'lucide-react'

import { navigateTo } from '@/app/routes'
import { usePwaUpdate, useRoute } from '@/app/hooks'
import { useDemoSession } from '@/app/useDemoSession'
import { resolvePhase, type JourneyPhase } from '@/app/journey'
import { dataMode } from '@/data'
import {
  AppLayout,
  type NavDestination,
} from '@/components/layout/AppLayout'
import { ErrorBoundary } from '@/components/ErrorBoundary'
import { PwaUpdateBanner } from '@/components/pwa/PwaUpdateBanner'
import { SplashScreen } from '@/screens/SplashScreen'
import { LandingScreen } from '@/screens/LandingScreen'
import { WellbeingCheckScreen } from '@/screens/WellbeingCheckScreen'
import { GuidedSessionView } from '@/screens/GuidedSessionView'
import { HomeScreen } from '@/screens/HomeScreen'
import { DailyCheckInScreen } from '@/screens/DailyCheckInScreen'
import { RelaxationToolsView } from '@/screens/RelaxationToolsView'
import { AudioLibraryView } from '@/screens/AudioLibraryView'
import { JournalView } from '@/screens/JournalView'
import { LearnView } from '@/screens/LearnView'
import { ProgressView } from '@/screens/ProgressView'
import { MoreMenuView } from '@/screens/MoreMenuView'
import { ResearcherDashboard } from '@/screens/ResearcherDashboard'
import { summariseProgress } from '@/domain/progress'
import { isFollowUpDue } from '@/app/journey'
import type { PracticeEntry } from '@/domain/practice'

type EntryPhase = 'splash' | 'landing' | 'app'

const NAV_TITLES: Partial<Record<JourneyPhase, string>> = {
  home: 'Today',
  checkIn: 'Daily check-in',
  tools: 'Practise',
  audio: 'Audio library',
  journal: 'Journal',
  learn: 'Learn mindfulness',
  progress: 'Progress',
  wellbeing: 'Wellbeing check',
}

export default function App() {
  const route = useRoute()
  const update = usePwaUpdate()
  const session = useDemoSession()
  const [entry, setEntry] = useState<EntryPhase>('splash')
  const [phase, setPhase] = useState<JourneyPhase>('home')
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined)

  const snapshot = useMemo(
    () => ({
      hasSession: Boolean(session.data),
      hasStartCheck: Boolean(
        session.data?.wellbeing.some((entry_) => entry_.type === 'start'),
      ),
      hasGuidedSession: Boolean(
        session.data?.sessions.some(
          (entry_) => entry_.kind === 'guided' && entry_.completed,
        ),
      ),
      hasFollowUpCheck: Boolean(
        session.data?.wellbeing.some((entry_) => entry_.type === 'follow-up'),
      ),
      hasLoggedToday: session.hasLoggedToday,
      startDate: session.data?.user.programmeStartDate,
      today: session.today,
    }),
    [session.data, session.hasLoggedToday, session.today],
  )

  const derived = resolvePhase(snapshot)

  /**
   * The phase actually rendered.
   *
   * A gated phase always wins over a chosen destination, so the gate cannot be
   * navigated around once the data says otherwise. Deriving it here rather than
   * syncing it into state from an effect means there is no window in which the
   * screen and the data disagree, and no extra render.
   */
  const activePhase: JourneyPhase =
    derived === 'wellbeingStart' || derived === 'guided' ? derived : phase

  const openDemo = useCallback(async () => {
    await session.startDemo()
    setEntry('app')
    setPhase('home')
  }, [session])

  const goTo = useCallback((next: JourneyPhase) => {
    setPhase(next)
  }, [])

  const handleNav = useCallback(
    (destination: NavDestination) => {
      switch (destination) {
        case 'home':
          setPhase('home')
          break
        case 'learn':
          setPhase('learn')
          break
        case 'tools':
          setPhase('tools')
          break
        case 'journal':
          setPhase('journal')
          break
        case 'progress':
          setPhase('progress')
          break
      }
    },
    [],
  )

  const activeNav: NavDestination | undefined = useMemo(() => {
    switch (activePhase) {
      case 'home':
        return 'home'
      case 'learn':
        return 'learn'
      case 'tools':
      case 'audio':
      case 'guided':
        return 'tools'
      case 'journal':
      case 'checkIn':
        return 'journal'
      case 'progress':
      case 'wellbeing':
        return 'progress'
      default:
        return undefined
    }
  }, [activePhase])

  const openAdmin = useCallback(() => navigateTo({ name: 'admin' }), [])
  const openApp = useCallback(() => navigateTo({ name: 'app' }), [])

  const headerAction = (
    <button
      type="button"
      onClick={() => navigateTo({ name: 'more' })}
      aria-label="More"
      title="More"
      className="inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border border-lavender-200 bg-white/80 text-lavender-600 shadow-2xs transition-colors hover:bg-white hover:text-lavender-800"
    >
      <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
    </button>
  )

  const progressSummary = useMemo(() => {
    if (!session.data) return null
    return summariseProgress({
      startDate: session.data.user.programmeStartDate,
      today: session.today,
      checkIns: session.data.checkIns,
      sessions: session.data.sessions,
      journal: session.data.journal,
      wellbeing: session.data.wellbeing,
    })
  }, [session.data, session.today])

  if (route.name === 'admin') {
    return (
      <div className="bg-spa-canvas min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col sm:shadow-[0_0_40px_rgba(109,79,146,0.08)]">
          <ErrorBoundary region="The researcher dashboard">
            <ResearcherDashboard load={session.loadResearcher} onBack={openApp} />
          </ErrorBoundary>
        </div>
        <PwaUpdateBanner update={update} />
      </div>
    )
  }

  if (route.name === 'more') {
    return (
      <div className="bg-spa-canvas min-h-dvh">
        <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col sm:shadow-[0_0_40px_rgba(109,79,146,0.08)]">
          <AppLayout
            title="More"
            subtitle="About this build"
            headerAction={
              <button
                type="button"
                onClick={openApp}
                className="min-h-11 rounded-full border border-lavender-200 bg-white/80 px-3 text-xs font-semibold text-lavender-700"
              >
                Back
              </button>
            }
          >
            <MoreMenuView
              dataMode={dataMode()}
              onResetDemo={session.resetDemo}
              onOpenAdmin={openAdmin}
              update={update}
            />
          </AppLayout>
        </div>
        <PwaUpdateBanner update={update} />
      </div>
    )
  }

  // The splash and the landing are pre-session, so they own their own chrome. A
  // returning session resolves in the background, and until it does the splash is
  // a truthful screen to show: it is where an unstarted visit belongs anyway.
  if (!session.data) {
    if (entry === 'splash') {
      return (
        <>
          <div className="bg-spa-canvas min-h-dvh">
            <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
              <SplashScreen
                onContinue={() => setEntry('landing')}
                onOpenDemo={() => void openDemo()}
                onOpenAdmin={openAdmin}
                demoLoading={session.loading}
                demoError={session.error}
              />
            </div>
          </div>
          <PwaUpdateBanner update={update} />
        </>
      )
    }
    return (
      <>
        <div className="bg-spa-canvas min-h-dvh">
          <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col">
            <LandingScreen
              onStartDemo={() => void openDemo()}
              onBack={() => setEntry('splash')}
              demoLoading={session.loading}
              demoError={session.error}
            />
          </div>
        </div>
        <PwaUpdateBanner update={update} />
      </>
    )
  }

  const data = session.data
  const startDate = data.user.programmeStartDate
  const followUpDue = isFollowUpDue(snapshot)

  const shell = (children: React.ReactNode, options?: { nav?: boolean; title?: string; subtitle?: string }) => (
    <div className="bg-spa-canvas min-h-dvh">
      <div className="mx-auto flex min-h-dvh w-full max-w-app flex-col sm:shadow-[0_0_40px_rgba(109,79,146,0.08)]">
        <ErrorBoundary region={options?.title ?? 'This screen'}>
          <AppLayout
            nav={options?.nav ?? true}
            activeNav={activeNav}
            onNavigate={handleNav}
            title={options?.title ?? NAV_TITLES[activePhase]}
            subtitle={
              options?.subtitle ??
              (session.programmeDay
                ? `Day ${session.programmeDay} of 30`
                : 'Before day one')
            }
            headerAction={headerAction}
          >
            {children}
          </AppLayout>
        </ErrorBoundary>
      </div>
      <PwaUpdateBanner update={update} />
    </div>
  )

  if (activePhase === 'wellbeingStart' || activePhase === 'guided') {
    if (!snapshot.hasStartCheck) {
      return shell(
        <WellbeingCheckScreen
          mode="start"
          onSubmit={async (input) => {
            await session.saveWellbeing(input)
          }}
          onDone={() => goTo('guided')}
        />,
        { nav: false, title: 'Wellbeing check' },
      )
    }
    // The first run opens the programme. Any later run is a repeat: it records the
    // session for today and leaves the programme start where it is.
    const isRepeat = Boolean(startDate)
    return shell(
      <GuidedSessionView
        mode={isRepeat ? 'repeat' : 'start'}
        onComplete={async ({ minutes, tier }) => {
          await session.recordSession({
            kind: 'guided',
            minutes,
            completed: true,
            date: session.today,
            audioTier: tier,
          })
        }}
        onSkip={() => goTo(isRepeat ? 'tools' : 'home')}
        onBack={isRepeat ? () => goTo('tools') : undefined}
      />,
      { nav: isRepeat, title: 'Guided session' },
    )
  }

  if (activePhase === 'checkIn') {
    if (!startDate) {
      return shell(
        <p className="px-6 py-10 text-center text-sm text-lavender-600">
          The guided session has not finished, so the programme has not started.
        </p>,
      )
    }
    return shell(
      <DailyCheckInScreen
        startDate={startDate}
        today={session.today}
        checkIns={data.checkIns}
        initialDate={selectedDate}
        loadSeed={(date) => session.port.getPracticeSeed(date)}
        onSubmit={async (input) => {
          await session.saveCheckIn(input)
          setSelectedDate(undefined)
        }}
        onDone={() => {
          setSelectedDate(undefined)
          goTo('home')
        }}
      />,
    )
  }

  if (activePhase === 'tools') {
    return shell(
      <RelaxationToolsView
        onPractice={async (entry_: PracticeEntry) => {
          await session.port.recordPractice(entry_, session.today)
        }}
        onOpenGuided={() => goTo('guided')}
      />,
    )
  }

  if (activePhase === 'audio') {
    return shell(
      <AudioLibraryView
        onListened={async ({ trackKey, minutes }) => {
          await session.port.recordSession({
            kind: 'audio',
            minutes,
            completed: false,
            date: session.today,
            trackKey,
            audioTier: 'bundled',
          })
          await session.port.recordPractice(
            {
              activity: 'audio',
              minutes,
              completedAt: new Date().toISOString(),
              source: 'audio',
            },
            session.today,
          )
        }}
      />,
    )
  }

  if (activePhase === 'journal') {
    return shell(
      <JournalView
        entries={data.journal}
        today={session.today}
        onSave={session.saveJournal}
        onDelete={session.deleteJournal}
      />,
    )
  }

  if (activePhase === 'learn') {
    return shell(<LearnView />)
  }

  if (activePhase === 'progress' && progressSummary) {
    return shell(
      <ProgressView
        summary={progressSummary}
        checkIns={data.checkIns}
        onSelectDate={(date) => {
          setSelectedDate(date)
          goTo('checkIn')
        }}
        onOpenFollowUp={() => goTo('wellbeing')}
        followUpDue={followUpDue}
      />,
    )
  }

  if (activePhase === 'wellbeing') {
    return shell(
      <WellbeingCheckScreen
        mode="follow-up"
        initialAnswers={data.wellbeing.at(-1)?.answers}
        onSubmit={async (input) => {
          await session.saveWellbeing(input)
        }}
        onDone={() => goTo('progress')}
      />,
      { title: 'Follow-up check' },
    )
  }

  return shell(
    <HomeScreen
      data={data}
      today={session.today}
      programmeDay={session.programmeDay}
      action={session.nextAction ?? 'practice'}
      onOpenCheckIn={() => goTo('checkIn')}
      onOpenTools={() => goTo('tools')}
      onOpenProgress={() => goTo('progress')}
      onOpenLearn={() => goTo('learn')}
      onOpenGuided={() => goTo('guided')}
    />,
    { title: 'Today' },
  )
}

export { Sparkles }
