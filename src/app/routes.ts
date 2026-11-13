/**
 * URL routing.
 *
 * A tiny hash based router, because the app is a single page in a static container
 * and a hash route needs no server rewrite rule. The researcher dashboard and the
 * More menu are addressable, so a link can be shared straight to them, which is how
 * a reviewer will actually arrive.
 */

import type { JourneyPhase } from './journey'

export type Route =
  | { name: 'app' }
  | { name: 'admin' }
  | { name: 'more' }
  | { name: 'notFound' }

/** Map the hash to a route. Anything unrecognised lands on the app. */
export function parseRoute(hash: string): Route {
  const cleaned = hash.replace(/^#\/?/, '').split('?')[0].toLowerCase()
  if (cleaned === 'admin' || cleaned === 'researcher') return { name: 'admin' }
  if (cleaned === 'more') return { name: 'more' }
  if (cleaned === '' || cleaned === 'app' || cleaned === 'home') return { name: 'app' }
  return { name: 'notFound' }
}

/** The hash a route should have. */
export function routeHash(route: Route): string {
  switch (route.name) {
    case 'admin':
      return '#/admin'
    case 'more':
      return '#/more'
    case 'notFound':
      return '#/not-found'
    default:
      return '#/'
  }
}

/** Navigate by setting the hash, which also pushes a history entry. */
export function navigateTo(route: Route): void {
  if (typeof window === 'undefined') return
  window.location.hash = routeHash(route)
}

/** The phase a route implies, for the bottom navigation's active tab. */
export function phaseForRoute(route: Route): JourneyPhase | null {
  if (route.name === 'admin') return 'progress'
  if (route.name === 'more') return null
  return 'home'
}
