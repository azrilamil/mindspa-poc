/**
 * The update banner.
 *
 * Shown when a new build has installed and is waiting to take over. It is a prompt
 * rather than an automatic reload, because a reload in the middle of a check-in
 * would throw away what somebody was typing.
 */

import { RefreshCw, X } from 'lucide-react'

import type { PwaUpdate } from '@/app/hooks'

export interface PwaUpdateBannerProps {
  update: PwaUpdate
}

export function PwaUpdateBanner({ update }: PwaUpdateBannerProps) {
  if (!update.needRefresh) return null
  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-40 mx-auto flex max-w-app items-center gap-2 border-b border-sunflower-500 bg-sunflower-300/95 px-3 py-2 backdrop-blur"
      style={{ paddingTop: 'max(0.5rem, env(safe-area-inset-top))' }}
    >
      <RefreshCw
        className="h-4 w-4 shrink-0 text-sunflower-800"
        aria-hidden="true"
      />
      <p className="min-w-0 flex-1 text-[0.6875rem] font-semibold leading-snug text-sunflower-900">
        A new version is ready.
      </p>
      <button
        type="button"
        onClick={update.applyUpdate}
        disabled={update.updating}
        className="min-h-11 shrink-0 rounded-full bg-white/85 px-3 text-xs font-bold text-sunflower-800 disabled:opacity-60"
      >
        {update.updating ? 'Updating...' : 'Reload'}
      </button>
      <button
        type="button"
        onClick={update.dismiss}
        aria-label="Dismiss the update notice"
        className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-sunflower-800"
      >
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  )
}
