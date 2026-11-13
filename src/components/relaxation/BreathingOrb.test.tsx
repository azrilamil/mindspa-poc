/**
 * The breathing pacer, driven by fake animation frames.
 *
 * A real requestAnimationFrame loop in jsdom fires about thirty times a second and
 * would make this test a stopwatch. The frames are driven by hand instead, which
 * keeps the assertions about the phase, the orb and the completion signal honest.
 */

import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { BreathingOrb } from './BreathingOrb'

let now = 0
let frameCallback: FrameRequestCallback | null = null

beforeEach(() => {
  now = 0
  frameCallback = null
  vi.stubGlobal('performance', { now: () => now })
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frameCallback = callback
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {
    frameCallback = null
  })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

/** Advance the clock and run one frame. */
function tick(seconds: number) {
  now += seconds * 1000
  const callback = frameCallback
  frameCallback = null
  if (!callback) return
  act(() => {
    callback(now)
  })
}

describe('BreathingOrb', () => {
  it('opens on the settings sheet when asked', () => {
    render(<BreathingOrb onComplete={vi.fn()} initialSettingsOpen />)
    expect(screen.getByTestId('breathing-settings')).toBeInTheDocument()
  })

  it('shows the pacer with a start control', () => {
    render(<BreathingOrb onComplete={vi.fn()} />)
    expect(screen.getByTestId('breathing-pacer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /breathe in/i })).toBeInTheDocument()
  })

  it('switches the readout to pause once running', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /^start$/i }))
    expect(screen.getByRole('button', { name: /pause/i })).toBeInTheDocument()
  })

  it('moves through the phases as time passes', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} />)
    await user.click(screen.getByRole('button', { name: /^start$/i }))

    tick(0.1)
    expect(screen.getByRole('img', { name: /breathe in/i })).toBeInTheDocument()

    tick(4.1)
    expect(screen.getByRole('img', { name: /hold/i })).toBeInTheDocument()

    tick(7.1)
    expect(screen.getByRole('img', { name: /breathe out/i })).toBeInTheDocument()
  })

  it('reports the session once when it finishes', async () => {
    const onComplete = vi.fn()
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={onComplete} />)
    await user.click(screen.getByRole('button', { name: /^start$/i }))

    // The default is five minutes of 4-7-8, so 304 seconds.
    for (let second = 0; second < 320; second += 10) tick(10)

    expect(onComplete).toHaveBeenCalledTimes(1)
    expect(onComplete).toHaveBeenCalledWith(
      expect.objectContaining({ mode: '4-7-8', minutes: 5 }),
    )
    expect(screen.getByRole('img', { name: /done/i })).toBeInTheDocument()
  })

  it('lets the pattern change while stopped', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} initialSettingsOpen />)
    await user.click(screen.getByRole('button', { name: '4-4-4' }))
    expect(screen.getByRole('button', { name: '4-4-4' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('lets the length change while stopped', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} initialSettingsOpen />)
    await user.click(screen.getByRole('button', { name: /^2 min$/i }))
    expect(screen.getByRole('button', { name: /^2 min$/i })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
  })

  it('toggles the chimes', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} initialSettingsOpen />)
    const toggle = screen.getByRole('button', { name: /chimes on/i })
    await user.click(toggle)
    expect(screen.getByRole('button', { name: /chimes off/i })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('offers a reset that is disabled until the clock has moved', async () => {
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} />)
    expect(screen.getByRole('button', { name: /reset/i })).toBeDisabled()
    await user.click(screen.getByRole('button', { name: /^start$/i }))
    tick(2)
    expect(screen.getByRole('button', { name: /reset/i })).toBeEnabled()
  })

  it('fires the phase cue only when the phase changes', async () => {
    const onPhase = vi.fn()
    const user = userEvent.setup()
    render(<BreathingOrb onComplete={vi.fn()} onPhase={onPhase} />)
    await user.click(screen.getByRole('button', { name: /^start$/i }))

    tick(0.1)
    tick(0.2)
    tick(0.3)
    expect(onPhase).toHaveBeenCalledTimes(1)
    expect(onPhase).toHaveBeenCalledWith('inhale')

    tick(4.1)
    expect(onPhase).toHaveBeenCalledTimes(2)
    expect(onPhase).toHaveBeenLastCalledWith('hold')
  })
})
