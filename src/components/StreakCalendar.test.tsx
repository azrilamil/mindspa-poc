/**
 * The 30 day calendar.
 *
 * The two rules worth pinning are the denominator and the tone: adherence counts
 * against elapsed days during the programme, and a missed day is labelled as a fact
 * about the day rather than a judgement about the person.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { StreakCalendar } from './StreakCalendar'
import type { AdherenceDisplay, CalendarDay } from '@/domain/checkIn'

function day(
  dayNumber: number,
  status: CalendarDay['status'],
  mood: CalendarDay['mood'] = null,
): CalendarDay {
  return {
    dayNumber,
    date: `2026-01-${String(dayNumber).padStart(2, '0')}`,
    status,
    mood,
    isToday: status === 'todayPending',
    editable: status !== 'future',
  }
}

const adherence: AdherenceDisplay = {
  loggedDays: 3,
  denominator: 5,
  percent: 60,
  programmeComplete: false,
  caption: '3 of 5 days so far',
}

function days(): CalendarDay[] {
  return [
    day(1, 'completed', 'calm'),
    day(2, 'completed', 'joyful'),
    day(3, 'missed'),
    day(4, 'completed'),
    day(5, 'todayPending'),
    ...Array.from({ length: 25 }, (_, index) => day(6 + index, 'future')),
  ]
}

describe('StreakCalendar', () => {
  it('shows the percentage and the caption', () => {
    render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={2}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText('60%')).toBeInTheDocument()
    expect(screen.getByText('3 of 5 days so far')).toBeInTheDocument()
  })

  it('explains the denominator so the figure is not mistaken for out of thirty', () => {
    render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={2}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/counted against the 5 days that have passed/i)).toBeInTheDocument()
  })

  it('shows the streak when there is one, and hides it at zero', () => {
    const { unmount } = render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={2}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/2 days in a row/i)).toBeInTheDocument()
    unmount()

    render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={0}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.queryByText(/in a row/i)).toBeNull()
  })

  it('renders thirty slots with the right legend counts', () => {
    render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={0}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/recorded \(3\)/i)).toBeInTheDocument()
    expect(screen.getByText(/not recorded \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/today, not yet recorded \(1\)/i)).toBeInTheDocument()
    expect(screen.getByText(/still to come \(25\)/i)).toBeInTheDocument()
  })

  it('opens the check-in for an editable day only', async () => {
    const onSelectDate = vi.fn()
    const user = userEvent.setup()
    render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={0}
        onSelectDate={onSelectDate}
      />,
    )
    await user.click(screen.getByRole('button', { name: /^recorded, 2026-01-01$/i }))
    expect(onSelectDate).toHaveBeenCalledWith('2026-01-01')

    // A future day is not a button at all.
    expect(
      screen.queryByRole('button', { name: /still to come, 2026-01-30/i }),
    ).toBeNull()
  })

  it('awards badges only at the milestones', () => {
    const { unmount } = render(
      <StreakCalendar
        days={days()}
        adherence={adherence}
        streak={1}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.queryByText(/milestones/i)).toBeNull()
    unmount()

    render(
      <StreakCalendar
        days={days()}
        adherence={{ ...adherence, loggedDays: 15 }}
        streak={7}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/milestones/i)).toBeInTheDocument()
    expect(screen.getByText(/seven days running/i)).toBeInTheDocument()
    expect(screen.getByText(/halfway/i)).toBeInTheDocument()
  })

  it('switches the caption once the programme is complete', () => {
    render(
      <StreakCalendar
        days={days()}
        adherence={{
          loggedDays: 3,
          denominator: 30,
          percent: 10,
          programmeComplete: true,
          caption: '3 of 30 days recorded',
        }}
        streak={0}
        onSelectDate={vi.fn()}
      />,
    )
    expect(screen.getByText(/counts against the full thirty days/i)).toBeInTheDocument()
  })
})
