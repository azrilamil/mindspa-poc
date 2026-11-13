/**
 * The screens, rendered against fixed props.
 *
 * The journey test covers the flow end to end. These tests cover the states that
 * are hard to reach by tapping: the follow-up that is due, the empty progress
 * screen, the error path, and the researcher table's sorting.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { HomeScreen } from './HomeScreen'
import { ProgressView } from './ProgressView'
import { WellbeingCheckScreen } from './WellbeingCheckScreen'
import { ResearcherDashboard } from './ResearcherDashboard'
import { summariseProgress } from '@/domain/progress'
import type { DemoData, ResearcherSnapshot } from '@/domain/types'

const TODAY = '2026-01-09'

function demoData(overrides: Partial<DemoData> = {}): DemoData {
  return {
    user: {
      id: 'demo-1',
      displayName: 'Demo guest',
      programmeStartDate: '2026-01-05',
      isSynthetic: true,
      createdAt: '2026-01-05T08:00:00.000Z',
    },
    checkIns: [
      {
        id: 'c1',
        date: '2026-01-05',
        mood: 'calm',
        activities: ['breathing'],
        minutes: 5,
        programmeDay: 1,
        createdAt: '2026-01-05T19:00:00.000Z',
      },
    ],
    sessions: [
      {
        id: 's1',
        date: '2026-01-05',
        kind: 'guided',
        minutes: 8,
        completed: true,
        createdAt: '2026-01-05T09:00:00.000Z',
      },
    ],
    journal: [],
    wellbeing: [],
    ...overrides,
  }
}

const noop = () => undefined

describe('HomeScreen', () => {
  it('asks for the check-in when today is unrecorded', () => {
    render(
      <HomeScreen
        data={demoData()}
        today={TODAY}
        programmeDay={5}
        action="checkIn"
        onOpenCheckIn={noop}
        onOpenTools={noop}
        onOpenProgress={noop}
        onOpenLearn={noop}
      />,
    )
    expect(screen.getByRole('button', { name: /choose a mood/i })).toBeInTheDocument()
    expect(screen.getByText(/pick the mood that fits/i)).toBeInTheDocument()
  })

  it('offers a practice once today is recorded', () => {
    const data = demoData({
      checkIns: [
        ...demoData().checkIns,
        {
          id: 'c2',
          date: TODAY,
          mood: 'joyful',
          activities: ['walk', 'breathing'],
          minutes: 10,
          programmeDay: 5,
          createdAt: `${TODAY}T19:00:00.000Z`,
        },
      ],
    })
    render(
      <HomeScreen
        data={data}
        today={TODAY}
        programmeDay={5}
        action="practice"
        onOpenCheckIn={noop}
        onOpenTools={noop}
        onOpenProgress={noop}
        onOpenLearn={noop}
      />,
    )
    expect(screen.getByRole('button', { name: /start a practice/i })).toBeInTheDocument()
    expect(screen.getByText(/today is recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/2 things done/i)).toBeInTheDocument()
  })

  it('shows the streak, the recorded count and this week in minutes', () => {
    render(
      <HomeScreen
        data={demoData()}
        today={TODAY}
        programmeDay={5}
        action="checkIn"
        onOpenCheckIn={noop}
        onOpenTools={noop}
        onOpenProgress={noop}
        onOpenLearn={noop}
      />,
    )
    expect(screen.getByText(/^streak$/i)).toBeInTheDocument()
    expect(screen.getByText(/^recorded$/i)).toBeInTheDocument()
    expect(screen.getByText(/^this week$/i)).toBeInTheDocument()
  })

  it('opens progress and learn from their entry points', async () => {
    const onOpenProgress = vi.fn()
    const onOpenLearn = vi.fn()
    const user = userEvent.setup()
    render(
      <HomeScreen
        data={demoData()}
        today={TODAY}
        programmeDay={5}
        action="checkIn"
        onOpenCheckIn={noop}
        onOpenTools={noop}
        onOpenProgress={onOpenProgress}
        onOpenLearn={onOpenLearn}
      />,
    )
    await user.click(screen.getByRole('button', { name: /open progress/i }))
    expect(onOpenProgress).toHaveBeenCalled()
    await user.click(screen.getByRole('button', { name: /new to mindfulness/i }))
    expect(onOpenLearn).toHaveBeenCalled()
  })
})

describe('ProgressView', () => {
  function summaryFor(data: DemoData, today = TODAY) {
    return summariseProgress({
      startDate: data.user.programmeStartDate,
      today,
      checkIns: data.checkIns,
      sessions: data.sessions,
      journal: data.journal,
      wellbeing: data.wellbeing,
    })
  }

  it('shows the metrics and the calendar', () => {
    const data = demoData()
    render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={noop}
        onOpenFollowUp={noop}
        followUpDue={false}
      />,
    )
    expect(screen.getByText(/days recorded/i)).toBeInTheDocument()
    expect(screen.getByText(/longest run/i)).toBeInTheDocument()
    expect(screen.getByText(/check-ins by week/i)).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar').length).toBeGreaterThan(0)
  })

  it('offers the follow-up only when it is due', async () => {
    const data = demoData()
    const onOpenFollowUp = vi.fn()
    const user = userEvent.setup()
    const { unmount } = render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={noop}
        onOpenFollowUp={onOpenFollowUp}
        followUpDue={false}
      />,
    )
    expect(screen.queryByRole('button', { name: /follow-up check/i })).toBeNull()
    unmount()

    render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={noop}
        onOpenFollowUp={onOpenFollowUp}
        followUpDue
      />,
    )
    await user.click(screen.getByRole('button', { name: /take the follow-up check/i }))
    expect(onOpenFollowUp).toHaveBeenCalled()
  })

  it('opens the check-in for a date tapped on the calendar', async () => {
    const data = demoData()
    const onSelectDate = vi.fn()
    const user = userEvent.setup()
    render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={onSelectDate}
        onOpenFollowUp={noop}
        followUpDue={false}
      />,
    )
    await user.click(screen.getByRole('button', { name: /recorded, 2026-01-05/i }))
    expect(onSelectDate).toHaveBeenCalledWith('2026-01-05')
  })

  it('shows an empty state with no check-ins', () => {
    const data = demoData({ checkIns: [], sessions: [] })
    render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={noop}
        onOpenFollowUp={noop}
        followUpDue={false}
      />,
    )
    expect(screen.getByText(/no check-ins yet/i)).toBeInTheDocument()
    expect(screen.getByText(/no wellbeing check on file/i)).toBeInTheDocument()
  })

  it('summarises the wellbeing comparison and labels the band', () => {
    const data = demoData({
      wellbeing: [
        {
          id: 'w1',
          date: '2026-01-05',
          type: 'start',
          answers: { mood: 2, energy: 2, sleep: 2, focus: 2, gratitude: 2 },
          total: 10,
          band: 'stretched',
          createdAt: '2026-01-05T08:00:00.000Z',
        },
        {
          id: 'w2',
          date: '2026-01-09',
          type: 'follow-up',
          answers: { mood: 4, energy: 4, sleep: 4, focus: 4, gratitude: 4 },
          total: 20,
          band: 'steady',
          createdAt: '2026-01-09T08:00:00.000Z',
        },
      ],
    })
    render(
      <ProgressView
        summary={summaryFor(data)}
        checkIns={data.checkIns}
        onSelectDate={noop}
        onOpenFollowUp={noop}
        followUpDue={false}
      />,
    )
    expect(screen.getByText('10/25')).toBeInTheDocument()
    expect(screen.getByText('20/25')).toBeInTheDocument()
    expect(screen.getByText(/up 10 points/i)).toBeInTheDocument()
    expect(screen.getByText(/^steady$/i)).toBeInTheDocument()
  })
})

describe('WellbeingCheckScreen', () => {
  it('cannot save until all five prompts are answered', async () => {
    const user = userEvent.setup()
    render(<WellbeingCheckScreen mode="start" onSubmit={vi.fn()} />)
    const save = screen.getByRole('button', { name: /save answers/i })
    expect(save).toBeDisabled()

    for (const dimension of ['Mood', 'Energy', 'Sleep', 'Focus', 'Gratitude']) {
      await user.click(screen.getByRole('radio', { name: `${dimension}: 4 of 5` }))
    }
    expect(screen.getByRole('button', { name: /save answers/i })).toBeEnabled()
  })

  it('submits the answers and shows a descriptive band', async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined)
    const user = userEvent.setup()
    render(<WellbeingCheckScreen mode="start" onSubmit={onSubmit} />)
    for (const dimension of ['Mood', 'Energy', 'Sleep', 'Focus', 'Gratitude']) {
      await user.click(screen.getByRole('radio', { name: `${dimension}: 5 of 5` }))
    }
    await user.click(screen.getByRole('button', { name: /save answers/i }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1))
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ type: 'start' })
    expect(await screen.findByText(/answers saved/i)).toBeInTheDocument()
    expect(screen.getByText(/^steady$/i)).toBeInTheDocument()
  })

  it('says plainly that it is not a clinical measure', () => {
    render(<WellbeingCheckScreen mode="follow-up" onSubmit={vi.fn()} />)
    expect(screen.getByText(/not a clinical measure/i)).toBeInTheDocument()
  })

  it('reports a save failure rather than pretending it worked', async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error('The server said no.'))
    const user = userEvent.setup()
    render(<WellbeingCheckScreen mode="start" onSubmit={onSubmit} />)
    for (const dimension of ['Mood', 'Energy', 'Sleep', 'Focus', 'Gratitude']) {
      await user.click(screen.getByRole('radio', { name: `${dimension}: 3 of 5` }))
    }
    await user.click(screen.getByRole('button', { name: /save answers/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('The server said no.')
  })
})

describe('ResearcherDashboard', () => {
  const snapshot: ResearcherSnapshot = {
    rows: [
      { participant: 'S-001', day: 30, checkIns: 20, sessions: 18, minutes: 90, streak: 7, adherence: 66 },
      { participant: 'S-002', day: 28, checkIns: 9, sessions: 8, minutes: 40, streak: 2, adherence: 32 },
    ],
    totals: {
      participants: 2,
      checkIns: 29,
      sessions: 26,
      minutes: 130,
      averageAdherence: 49,
    },
    daily: [
      { date: '2026-01-08', checkIns: 2, sessions: 1 },
      { date: '2026-01-09', checkIns: 1, sessions: 2 },
    ],
    generatedAt: '2026-01-09T06:00:00.000Z',
    synthetic: true,
  }

  it('labels the data synthetic and renders the table', async () => {
    render(<ResearcherDashboard load={async () => snapshot} onBack={noop} />)
    expect(screen.getByText(/synthetic demo data/i)).toBeInTheDocument()
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())
    expect(screen.getByText('S-001')).toBeInTheDocument()
    expect(screen.getByText('S-002')).toBeInTheDocument()
  })

  it('sorts by a column when the header is tapped', async () => {
    const user = userEvent.setup()
    render(<ResearcherDashboard load={async () => snapshot} onBack={noop} />)
    await waitFor(() => expect(screen.getByRole('table')).toBeInTheDocument())

    await user.click(screen.getByRole('button', { name: /^checks/i }))
    const rows = within(screen.getByRole('table')).getAllByRole('row')
    // The header first, then the row with the higher check-in count.
    expect(within(rows[1]).getByText('S-001')).toBeInTheDocument()
  })

  it('reports a load failure', async () => {
    render(
      <ResearcherDashboard
        load={async () => {
          throw new Error('The cohort did not load.')
        }}
        onBack={noop}
      />,
    )
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The cohort did not load.',
    )
  })

  it('returns to the app from its back control', async () => {
    const onBack = vi.fn()
    const user = userEvent.setup()
    render(<ResearcherDashboard load={async () => snapshot} onBack={onBack} />)
    await user.click(screen.getByRole('button', { name: /back to the app/i }))
    expect(onBack).toHaveBeenCalled()
  })
})
