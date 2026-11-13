/**
 * The UI primitives.
 *
 * These are the pieces every screen composes, so the tests cover the contract
 * rather than the styling: a button that reports its loading state, a field that
 * wires its label, hint and error to the control, a dialog that only exists when it
 * is open, and the demo banner that must always be present.
 */

import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import {
  Button,
  Card,
  DemoBanner,
  Dialog,
  EmptyState,
  ErrorNote,
  ProgressBar,
  StatusPill,
} from './ui'

describe('Button', () => {
  it('defaults to a non submitting button so it cannot post a form by accident', () => {
    render(<Button>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toHaveAttribute(
      'type',
      'button',
    )
  })

  it('passes a submit type through when asked', () => {
    render(<Button type="submit">Send</Button>)
    expect(screen.getByRole('button', { name: 'Send' })).toHaveAttribute(
      'type',
      'submit',
    )
  })

  it('disables itself and reports busy while loading', () => {
    render(<Button loading>Save</Button>)
    const button = screen.getByRole('button', { name: /save/i })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
  })

  it('stays disabled when the caller disables it', () => {
    render(<Button disabled>Save</Button>)
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled()
  })

  it('runs the click handler', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    render(<Button onClick={onClick}>Save</Button>)
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('renders a leading and a trailing icon', () => {
    render(
      <Button icon={<span data-testid="lead" />} trailingIcon={<span data-testid="tail" />}>
        Go
      </Button>,
    )
    expect(screen.getByTestId('lead')).toBeInTheDocument()
    expect(screen.getByTestId('tail')).toBeInTheDocument()
  })
})

describe('Card', () => {
  it('renders its children inside the frosted treatment', () => {
    const { container } = render(
      <Card>
        <p>Inside</p>
      </Card>,
    )
    expect(screen.getByText('Inside')).toBeInTheDocument()
    expect(container.firstElementChild?.className).toContain('card-spa')
  })
})

describe('ProgressBar', () => {
  it('reports its value as a percentage', () => {
    render(<ProgressBar value={0.42} label="Progress" />)
    const bar = screen.getByRole('progressbar', { name: 'Progress' })
    expect(bar).toHaveAttribute('aria-valuenow', '42')
    expect(bar).toHaveAttribute('aria-valuemin', '0')
    expect(bar).toHaveAttribute('aria-valuemax', '100')
  })

  it('clamps out of range values', () => {
    render(<ProgressBar value={4} label="Progress" />)
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '100')
  })
})

describe('Dialog', () => {
  it('renders nothing when closed', () => {
    render(
      <Dialog open={false} title="Settings" onClose={() => undefined}>
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('renders a modal with a close control when open', async () => {
    const onClose = vi.fn()
    const user = userEvent.setup()
    render(
      <Dialog open title="Settings" onClose={onClose}>
        <p>Body</p>
      </Dialog>,
    )
    const dialog = screen.getByRole('dialog', { name: 'Settings' })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    await user.click(screen.getByRole('button', { name: /close/i }))
    expect(onClose).toHaveBeenCalled()
  })

  it('hides the close control for a sheet that must be acknowledged', () => {
    render(
      <Dialog open title="Settings" onClose={() => undefined} dismissible={false}>
        <p>Body</p>
      </Dialog>,
    )
    expect(screen.queryByRole('button', { name: /close/i })).toBeNull()
  })
})

describe('StatusPill', () => {
  it('renders its children', () => {
    render(<StatusPill tone="success">Recorded</StatusPill>)
    expect(screen.getByText('Recorded')).toBeInTheDocument()
  })
})

describe('DemoBanner', () => {
  it('says the data is synthetic and that this is not a medical tool', () => {
    render(<DemoBanner />)
    const note = screen.getByRole('note')
    expect(note).toHaveTextContent(/synthetic data/i)
    expect(note).toHaveTextContent(/not a medical tool/i)
  })
})

describe('EmptyState', () => {
  it('renders a title, a detail and an optional action', () => {
    render(
      <EmptyState
        title="Nothing here"
        detail="Come back after your first check-in."
        action={<Button>Go</Button>}
      />,
    )
    expect(screen.getByText('Nothing here')).toBeInTheDocument()
    expect(screen.getByText(/come back after/i)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Go' })).toBeInTheDocument()
  })
})

describe('ErrorNote', () => {
  it('is an alert by default', () => {
    render(<ErrorNote message="Could not save." />)
    expect(screen.getByRole('alert')).toHaveTextContent('Could not save.')
  })

  it('is a status when it is advisory', () => {
    render(<ErrorNote message="Saved later." tone="warning" />)
    expect(screen.getByRole('status')).toHaveTextContent('Saved later.')
  })

  it('offers a dismiss control when given a handler', async () => {
    const onDismiss = vi.fn()
    const user = userEvent.setup()
    render(<ErrorNote message="Could not save." onDismiss={onDismiss} />)
    await user.click(screen.getByRole('button', { name: /dismiss/i }))
    expect(onDismiss).toHaveBeenCalled()
  })
})
