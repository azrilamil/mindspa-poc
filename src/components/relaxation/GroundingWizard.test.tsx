/**
 * The grounding wizard.
 *
 * The count is the exercise, so the test walks every step and checks the number of
 * items each one asks for. It also checks the two behaviours that make the wizard
 * usable: back is blocked on the first step, and the finish control appears only on
 * the last.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import { GroundingWizard } from './GroundingWizard'

describe('GroundingWizard', () => {
  it('starts on the first sense with live progress', () => {
    render(<GroundingWizard onComplete={vi.fn()} />)
    expect(screen.getByText(/five things you can see/i)).toBeInTheDocument()
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '20')
  })

  it('blocks going back from the first step', () => {
    render(<GroundingWizard onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /^back$/i })).toBeDisabled()
  })

  it('lists the number of items the step asks for', () => {
    render(<GroundingWizard onComplete={vi.fn()} />)
    const items = screen.getByRole('list', { name: /items to notice/i })
    expect(items.querySelectorAll('li')).toHaveLength(5)
  })

  it('walks all five steps and finishes', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<GroundingWizard onComplete={onComplete} />)

    for (const [index, count] of [5, 4, 3, 2, 1].entries()) {
      const items = screen.getByRole('list', { name: /items to notice/i })
      expect(items.querySelectorAll('li')).toHaveLength(count)
      if (index < 4) {
        await user.click(screen.getByRole('button', { name: /next/i }))
      }
    }

    expect(screen.getByText('Step 5 of 5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^finish$/i }))
    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete.mock.calls[0][0].secondsSpent).toBeGreaterThanOrEqual(1)
    expect(screen.getByText(/grounding complete/i)).toBeInTheDocument()
  })

  it('can step back and forward again', async () => {
    const user = userEvent.setup()
    render(<GroundingWizard onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument()
  })

  it('offers a done control from the completion screen when given one', async () => {
    const onDone = vi.fn()
    const user = userEvent.setup()
    render(<GroundingWizard onComplete={vi.fn()} onDone={onDone} />)
    for (let index = 0; index < 4; index += 1) {
      await user.click(screen.getByRole('button', { name: /next/i }))
    }
    await user.click(screen.getByRole('button', { name: /^finish$/i }))
    await user.click(screen.getByRole('button', { name: /^done$/i }))
    expect(onDone).toHaveBeenCalled()
  })

  it('says plainly that nothing typed is stored', () => {
    render(<GroundingWizard onComplete={vi.fn()} />)
    expect(screen.getByText(/nothing here is typed or recorded/i)).toBeInTheDocument()
  })
})
