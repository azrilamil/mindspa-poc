/**
 * Route and update hooks.
 *
 * `useRoute` subscribes to `hashchange`, so a link to `#/admin` opens the
 * researcher dashboard and the browser back button behaves. `usePwaUpdate` wraps
 * `vite-plugin-pwa`'s registration in the small amount of state a banner needs:
 * whether an update is waiting, and a way to apply it.
 */

import { useCallback, useEffect, useRef, useState } from 'react'
import { registerSW } from 'virtual:pwa-register'

import { parseRoute, type Route } from './routes'

export function useRoute(): Route {
  const [route, setRoute] = useState<Route>(() =>
    parseRoute(typeof window === 'undefined' ? '' : window.location.hash),
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const onChange = () => setRoute(parseRoute(window.location.hash))
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])

  return route
}

export interface PwaUpdate {
  /** True when a new service worker is installed and waiting. */
  needRefresh: boolean
  /** True while the new worker is activating. */
  updating: boolean
  /** Apply the waiting update and reload. */
  applyUpdate: () => void
  /** Dismiss without updating, until the next check. */
  dismiss: () => void
}

/**
 * The update check.
 *
 * `registerType: 'prompt'` means a new build installs but waits, which is what the
 * banner offers to apply. In development there is no service worker, so the hook
 * reports nothing rather than pretending to check.
 */
export function usePwaUpdate(): PwaUpdate {
  const [needRefresh, setNeedRefresh] = useState(false)
  const [updating, setUpdating] = useState(false)
  /** The `vite-plugin-pwa` updater, held in a ref so registering it is not a render. */
  const applyRef = useRef<(() => Promise<void>) | null>(null)

  useEffect(() => {
    if (import.meta.env?.DEV) return
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return

    const updateSW = registerSW({
      immediate: true,
      onNeedRefresh() {
        setNeedRefresh(true)
      },
      onRegisteredSW(_url, registration) {
        if (!registration) return
        // A periodic check, so a long lived tab still sees a new build.
        setInterval(() => {
          void registration.update().catch(() => undefined)
        }, 60 * 60_000)
      },
    })
    applyRef.current = updateSW
    return () => {
      applyRef.current = null
    }
  }, [])

  const applyUpdate = useCallback(() => {
    setUpdating(true)
    void (applyRef.current?.() ?? Promise.resolve())
  }, [])

  const dismiss = useCallback(() => setNeedRefresh(false), [])

  return { needRefresh, updating, applyUpdate, dismiss }
}
