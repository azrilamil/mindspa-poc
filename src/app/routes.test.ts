/**
 * Routing and the data layer factory.
 *
 * Both are small, and both have one behaviour that would be invisible until a
 * reviewer hit it: an unknown hash has to land somewhere sensible rather than
 * blanking the app, and the factory has to choose the backend from the environment
 * rather than from a hardcoded guess.
 */

import { afterEach, describe, expect, it } from 'vitest'

import { navigateTo, parseRoute, routeHash } from './routes'
import { convexUrl, dataMode, getDataPort, setDataPort } from '@/data'

afterEach(() => {
  setDataPort(null)
  window.location.hash = ''
})

describe('parseRoute', () => {
  it('treats an empty hash as the app', () => {
    expect(parseRoute('')).toEqual({ name: 'app' })
    expect(parseRoute('#')).toEqual({ name: 'app' })
    expect(parseRoute('#/')).toEqual({ name: 'app' })
  })

  it('recognises the researcher dashboard under either name', () => {
    expect(parseRoute('#/admin')).toEqual({ name: 'admin' })
    expect(parseRoute('#/researcher')).toEqual({ name: 'admin' })
  })

  it('recognises the more menu', () => {
    expect(parseRoute('#/more')).toEqual({ name: 'more' })
  })

  it('ignores case and a query string', () => {
    expect(parseRoute('#/ADMIN?ref=readme')).toEqual({ name: 'admin' })
  })

  it('reports an unknown route rather than guessing', () => {
    expect(parseRoute('#/nope')).toEqual({ name: 'notFound' })
  })
})

describe('routeHash', () => {
  it('round trips every route', () => {
    for (const route of [
      { name: 'app' },
      { name: 'admin' },
      { name: 'more' },
      { name: 'notFound' },
    ] as const) {
      expect(parseRoute(routeHash(route))).toEqual(route)
    }
  })
})

describe('navigateTo', () => {
  it('sets the hash', () => {
    navigateTo({ name: 'admin' })
    expect(window.location.hash).toBe('#/admin')
  })
})

describe('the data layer factory', () => {
  it('reports no Convex url in the test environment', () => {
    expect(convexUrl()).toBeUndefined()
    expect(dataMode()).toBe('local')
  })

  it('returns a local port when no URL is configured', () => {
    expect(getDataPort().kind).toBe('local')
  })

  it('memoises the port, so two screens share one session', () => {
    expect(getDataPort()).toBe(getDataPort())
  })

  it('lets a caller replace the port, which is how tests isolate themselves', () => {
    const first = getDataPort()
    setDataPort(null)
    expect(getDataPort()).not.toBe(first)
  })
})
