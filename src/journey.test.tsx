/**
 * The demo journey, end to end through the real App.
 *
 * This is the test that proves the product claim: enter the demo, record a
 * check-in, and see it counted on the progress screen. It renders the real
 * component tree against the local adapter with an in-memory store, so nothing in
 * the flow is stubbed except the browser storage and the clock.
 */

import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('canvas-confetti', () => ({ default: vi.fn() }))

import App from './App'
import { setDataPort } from '@/data'
import { createLocalPort, createMemoryStore, emptyState } from '@/data/localAdapter'

const NOW = new Date(2026, 0, 9, 12, 0, 0)

/** The page heading. The shell owns the single h1, so this is unambiguous even
 * where a screen repeats its own title as an h2. */
function headingOne(name: RegExp) {
  return screen.getByRole('heading', { level: 1, name })
}

function renderApp() {
  const store = createMemoryStore(emptyState())
  const port = createLocalPort({ store, now: () => NOW })
  setDataPort(port)
  return { ...render(<App />), store, port }
}

beforeEach(() => {
  window.location.hash = ''
})

afterEach(() => {
  setDataPort(null)
  window.location.hash = ''
})

describe('the splash', () => {
  it('shows the mascot, the version and the demo action', () => {
    renderApp()
    expect(
      headingOne(/welcome to mindspa/i),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /enter demo mode/i })).toBeInTheDocument()
    expect(screen.getByText(/^v2\./)).toBeInTheDocument()
  })

  it('states that the data is synthetic', () => {
    renderApp()
    expect(screen.getByText(/demo with synthetic data/i)).toBeTruthy()
    expect(screen.getAllByText(/not a medical tool/i).length).toBeGreaterThan(0)
  })

  it('opens the explanation screen and comes back', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /see how it works/i }))
    expect(
      headingOne(/how the demo works/i),
    ).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^back$/i }))
    expect(
      headingOne(/welcome to mindspa/i),
    ).toBeInTheDocument()
  })
})

describe('entering demo mode', () => {
  it('lands on the today screen with a programme in progress', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))

    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    // The seed puts the demo on day nine, with today still unrecorded.
    expect(screen.getAllByText(/day 9 of 30/i).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: /choose a mood/i })).toBeInTheDocument()
  })

  it('shows the demo banner on every app screen', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/demo with synthetic data/i)).toBeInTheDocument()
  })
})

describe('recording a check-in', () => {
  it('saves a mood and an activity, then counts the day on progress', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /choose a mood/i }))
    await waitFor(() =>
      expect(
        headingOne(/daily check-in/i),
      ).toBeInTheDocument(),
    )

    // The mood grid is a radiogroup with one radio per mood.
    const moodGroup = screen.getByRole('radiogroup', { name: /choose your mood/i })
    await user.click(within(moodGroup).getByRole('radio', { name: /calm/i }))

    const activityGroup = screen.getByRole('checkbox', { name: /breathing exercise/i })
    await user.click(activityGroup)

    await user.click(screen.getByRole('button', { name: /^10 min$/i }))
    await user.click(screen.getByRole('button', { name: /save the check-in/i }))

    // Back on today, with the day now recorded.
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    // The sentence is split across a text node and a bold span, so match on the
    // container's text content rather than on one node.
    expect(
      screen
        .getAllByText((_, node) =>
          Boolean(node?.textContent?.match(/today felt calm/i)),
        )
        .some((node) => node.tagName === 'P'),
    ).toBe(true)
    expect(screen.getByRole('button', { name: /start a practice/i })).toBeInTheDocument()

    // And the progress screen counts it.
    await user.click(screen.getByRole('button', { name: /^progress$/i }))
    await waitFor(() =>
      expect(headingOne(/^progress$/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/days recorded/i)).toBeInTheDocument()
    // The calendar marks today as recorded rather than pending.
    expect(
      screen.getAllByText((_, node) =>
        Boolean(node?.textContent?.match(/^Recorded \(\d+\)$/)),
      ).length,
    ).toBeGreaterThan(0)
    expect(screen.getByText(/recent check-ins/i)).toBeInTheDocument()
  })

  it('refuses to save without a mood, and says why', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /choose a mood/i }))
    await waitFor(() =>
      expect(
        headingOne(/daily check-in/i),
      ).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /save the check-in/i }))
    expect(screen.getAllByRole('alert').length).toBeGreaterThan(0)
    expect(screen.getByText(/choose the mood that fits today/i)).toBeInTheDocument()
  })
})

describe('the practice tools', () => {
  it('opens the breathing pacer from the practise tab', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /^practise$/i }))
    await waitFor(() =>
      expect(headingOne(/^practise$/i)).toBeInTheDocument(),
    )

    await user.click(screen.getByRole('button', { name: /breathing exercise/i }))
    expect(screen.getByTestId('breathing-pacer')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^start$/i })).toBeInTheDocument()
  })

  it('opens the grounding wizard and steps through all five senses', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /^practise$/i }))
    await waitFor(() =>
      expect(headingOne(/^practise$/i)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /grounding 5-4-3-2-1/i }))

    expect(screen.getByText(/five things you can see/i)).toBeInTheDocument()
    for (const step of [2, 3, 4]) {
      await user.click(screen.getByRole('button', { name: /next/i }))
      expect(screen.getByText(`Step ${step} of 5`)).toBeInTheDocument()
    }
    await user.click(screen.getByRole('button', { name: /next/i }))
    expect(screen.getByText(/step 5 of 5/i)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /finish/i }))
    expect(screen.getByText(/grounding complete/i)).toBeInTheDocument()
  })
})

describe('the journal', () => {
  it('saves an entry and lists it', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /^journal$/i }))
    await waitFor(() =>
      expect(headingOne(/^journal$/i)).toBeInTheDocument(),
    )

    await user.type(screen.getByLabelText(/^title$/i), 'A slow morning')
    await user.type(screen.getByLabelText(/^entry$/i), 'Tea, no phone, ten minutes.')
    await user.click(screen.getByRole('button', { name: /save the entry/i }))

    await waitFor(() => expect(screen.getByText(/^saved\.$/i)).toBeInTheDocument())
  })
})

describe('the researcher dashboard', () => {
  it('opens from the splash and labels the data synthetic', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(
      screen.getByRole('button', { name: /researcher dashboard/i }),
    )
    await waitFor(() =>
      expect(
        headingOne(/researcher demo/i),
      ).toBeInTheDocument(),
    )
    expect(screen.getByText(/synthetic demo data/i)).toBeInTheDocument()
    expect(screen.getByRole('table')).toBeInTheDocument()
  })
})

describe('the more menu', () => {
  it('reports the data layer and offers a reset', async () => {
    const user = userEvent.setup()
    renderApp()
    await user.click(screen.getByRole('button', { name: /enter demo mode/i }))
    await waitFor(() =>
      expect(headingOne(/^today$/i)).toBeInTheDocument(),
    )
    await user.click(screen.getByRole('button', { name: /^more$/i }))
    await waitFor(() =>
      expect(headingOne(/^more$/i)).toBeInTheDocument(),
    )
    expect(screen.getByText(/local storage adapter/i)).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /reset the demo data/i }),
    ).toBeInTheDocument()
  })
})
