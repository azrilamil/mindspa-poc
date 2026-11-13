/**
 * The mascot.
 *
 * The mascot is the one piece of the reference design carried across, so its shape
 * and its accessibility behaviour are both pinned: decorative by default, labelled
 * only when it carries meaning, and the same geometry for every expression.
 */

import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { SunflowerMascot } from './SunflowerMascot'

describe('SunflowerMascot', () => {
  it('is decorative by default', () => {
    const { container } = render(<SunflowerMascot />)
    const svg = container.querySelector('svg')
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
    expect(svg?.getAttribute('role')).toBe('presentation')
  })

  it('becomes an image with a label when given a title', () => {
    render(<SunflowerMascot title="MindSpa mascot" />)
    const svg = screen.getByRole('img', { name: 'MindSpa mascot' })
    expect(svg).toBeInTheDocument()
    expect(svg.querySelector('title')?.textContent).toBe('MindSpa mascot')
    expect(svg.getAttribute('aria-hidden')).toBeNull()
  })

  it('draws twelve petals for every expression', () => {
    for (const expression of ['welcoming', 'happy', 'calm'] as const) {
      const { container, unmount } = render(<SunflowerMascot expression={expression} />)
      const svg = container.querySelector('svg')
      // The petals are the twelve ellipses inside the first group.
      expect(svg?.querySelectorAll('ellipse').length).toBeGreaterThanOrEqual(12)
      unmount()
    }
  })

  it('uses a different face for each expression', () => {
    const markup = (['welcoming', 'happy', 'calm'] as const).map((expression) => {
      const { container, unmount } = render(<SunflowerMascot expression={expression} />)
      const value = container.innerHTML
      unmount()
      return value
    })
    expect(new Set(markup).size).toBe(3)
  })

  it('accepts sizing classes', () => {
    const { container } = render(<SunflowerMascot className="h-24 w-24" />)
    expect(container.querySelector('svg')?.getAttribute('class')).toContain('h-24')
  })
})
