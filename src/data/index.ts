/**
 * The data layer entry point.
 *
 * One factory decides which port the app talks to. With `VITE_CONVEX_URL` set the
 * app uses the demo deployment; without it, the whole app runs on the local
 * adapter with synthetic data, which is what makes `npm run dev` and the test
 * suite work with no backend at all.
 *
 * The choice is memoised so a screen cannot accidentally build two ports and end
 * up with two divergent views of the session.
 */

import { createLocalPort } from './localAdapter'
import { createConvexPort } from './convexAdapter'
import type { DataPort } from './port'

export * from './port'

/** The configured Convex deployment, or undefined when running offline. */
export function convexUrl(): string | undefined {
  const value = import.meta.env?.VITE_CONVEX_URL as string | undefined
  if (!value || value.trim() === '') return undefined
  return value.trim()
}

let cached: DataPort | null = null

/** The port the app should use. */
export function getDataPort(): DataPort {
  if (cached) return cached
  const url = convexUrl()
  cached = url ? createConvexPort({ url }) : createLocalPort()
  return cached
}

/** Replace the cached port. Used by tests and by the demo reset control. */
export function setDataPort(port: DataPort | null): void {
  cached = port
}

/** Which backend the current build will use, for the More menu. */
export function dataMode(): 'local' | 'convex' {
  return convexUrl() ? 'convex' : 'local'
}

export { createLocalPort, createConvexPort }
