import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { SESSION_PROMPTS, CHECK_IN_QUESTIONS } from './data/prompts'

afterEach(() => {
  cleanup()
  localStorage.clear()
  window.location.hash = ''
})

describe('MindSpa POC app', () => {
  it('shows the demo banner and English home copy', () => {
    render(<App />)
    expect(
      screen.getByText('Demo with synthetic data, not a medical tool.'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('MindSpa POC').length).toBeGreaterThan(0)
    expect(
      screen.getByText(/not a medical product/i),
    ).toBeInTheDocument()
    expect(screen.queryByText(/Hannan|Medispa|UPNM|\bATM\b|FFMQ|Selamat/i)).toBeNull()
  })

  it('completes a check-in and lists it on the progress page', async () => {
    const user = userEvent.setup()
    window.location.hash = '#/check-in'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Wellbeing check-in' })).toBeInTheDocument()

    for (const q of CHECK_IN_QUESTIONS) {
      const group = screen.getByRole('radiogroup', { name: q.prompt })
      const four = group.querySelector('button:nth-child(4)')
      expect(four).toBeTruthy()
      await user.click(four as HTMLButtonElement)
    }
    await user.click(screen.getByRole('button', { name: 'Save check-in' }))
    expect(screen.getByText('Check-in saved')).toBeInTheDocument()

    await user.click(screen.getByRole('link', { name: 'See progress' }))
    // hashchange is picked up; force if needed
    window.dispatchEvent(new HashChangeEvent('hashchange'))
    expect(await screen.findByRole('heading', { name: 'Progress' })).toBeInTheDocument()
    expect(screen.getByText('Average 4')).toBeInTheDocument()
  })

  it('shows an original session prompt on the session page', () => {
    window.location.hash = '#/session'
    render(<App />)
    expect(screen.getByRole('heading', { name: 'Guided session' })).toBeInTheDocument()
    const found = SESSION_PROMPTS.some((p) => screen.queryByText(p))
    expect(found).toBe(true)
  })
})
