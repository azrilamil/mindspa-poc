/**
 * The informal mindfulness wizard.
 *
 * Two things are worth testing here: the pause countdown actually counts down and
 * stops at zero, and the wizard cannot finish without walking the four steps. The
 * countdown uses a real interval, so the timers are faked and advanced by hand.
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { InformalMindfulnessWizard } from './InformalMindfulnessWizard'

beforeEach(() => {
  // Only the interval is faked. userEvent schedules its own timeouts, and faking
  // those makes every click wait for a clock the test never advances.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval'] })
})

afterEach(() => {
  vi.useRealTimers()
})

/** userEvent and fake timers need a shared advance. */
function setup() {
  return userEvent.setup()
}

async function enter(user: ReturnType<typeof setup>) {
  await user.click(screen.getByRole('button', { name: /drinking tea or water/i }))
}

describe('InformalMindfulnessWizard', () => {
  it('offers four everyday activities', () => {
    render(<InformalMindfulnessWizard onComplete={vi.fn()} />)
    expect(screen.getAllByRole('button')).toHaveLength(4)
    expect(screen.getByRole('button', { name: /drinking tea or water/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /walking a short distance/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /washing up/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /tidying one surface/i })).toBeInTheDocument()
  })

  it('counts the opening pause down to zero and back to the start label', async () => {
    const user = setup()
    render(<InformalMindfulnessWizard onComplete={vi.fn()} />)
    await enter(user)

    expect(screen.getByTestId('pause-seconds')).toHaveTextContent('5s')
    await user.click(screen.getByRole('button', { name: /start 5 seconds/i }))

    await act(async () => {
      vi.advanceTimersByTime(2000)
    })
    expect(screen.getByTestId('pause-seconds')).toHaveTextContent('3s')

    await act(async () => {
      vi.advanceTimersByTime(4000)
    })
    expect(screen.getByTestId('pause-seconds')).toHaveTextContent('0s')
    expect(screen.getByRole('button', { name: /again/i })).toBeInTheDocument()
  })

  it('walks the four steps and reports the activity', async () => {
    const onComplete = vi.fn()
    const user = setup()
    render(<InformalMindfulnessWizard onComplete={onComplete} />)
    await enter(user)

    expect(screen.getByText('Pause for a moment')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Engage the senses')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Do it with attention')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Return without judging')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^finish$/i }))
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ activityId: 'drink' }),
    )
    expect(screen.getByText(/mindful moment complete/i)).toBeInTheDocument()
  })

  it('returns to the activity list from the first step', async () => {
    const user = setup()
    render(<InformalMindfulnessWizard onComplete={vi.fn()} />)
    await enter(user)
    await user.click(screen.getByRole('button', { name: /^activity$/i }))
    expect(screen.getByRole('button', { name: /washing up/i })).toBeInTheDocument()
  })
})
