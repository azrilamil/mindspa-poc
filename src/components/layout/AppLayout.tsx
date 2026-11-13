/**
 * The application shell.
 *
 * Responsibilities:
 *
 * - Confine the app to a comfortable mobile column and centre it on a tablet or
 *   desktop, so the layout is genuinely mobile-first rather than merely narrow.
 * - Honour `env(safe-area-inset-*)` so the iPhone home indicator and notch never
 *   clip content.
 * - Provide the top status bar, the demo banner and the bottom navigation.
 *
 * The bottom bar appears only inside a session. The splash and landing screens have
 * nowhere to navigate to yet, and offering a nav bar there would be a lie.
 */

import type { ReactNode } from 'react'
import {
  BookOpen,
  Home,
  MoreHorizontal,
  NotebookPen,
  Sparkles,
  TrendingUp,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '@/lib/cn'
import { SunflowerMascot } from '@/components/SunflowerMascot'
import { DemoBanner, StatusPill } from '@/components/ui'

export type NavDestination =
  | 'home'
  | 'learn'
  | 'tools'
  | 'journal'
  | 'progress'

export interface AppLayoutProps {
  children: ReactNode
  /** Suppress all shell chrome for a full-bleed screen such as the splash. */
  bare?: boolean
  title?: string
  /** Shown under the title, e.g. "Day 4 of 30". */
  subtitle?: string
  /** Rendered at the trailing edge of the status bar. */
  headerAction?: ReactNode
  /** Show the bottom navigation. */
  nav?: boolean
  activeNav?: NavDestination
  onNavigate?: (destination: NavDestination) => void
  /** Hide the demo banner on the splash, where the copy already says it. */
  banner?: boolean
}

export function AppLayout({
  children,
  bare = false,
  title,
  subtitle,
  headerAction,
  nav = false,
  activeNav,
  onNavigate,
  banner = true,
}: AppLayoutProps) {
  const showNav = !bare && nav
  return (
    <div className="bg-spa-canvas min-h-dvh">
      <div
        className={cn(
          'mx-auto flex min-h-dvh w-full max-w-app flex-col',
          // The column edge, visible only when the viewport is wider than the app.
          'sm:shadow-[0_0_40px_rgba(109,79,146,0.08)]',
        )}
      >
        {!bare && (
          <header
            className={cn(
              'sticky top-0 z-30',
              'pt-[env(safe-area-inset-top)]',
              'bg-white/60 backdrop-blur-md',
              'border-b border-white/50',
            )}
          >
            <div className="flex items-center gap-2 px-3 py-2 sm:gap-3 sm:px-5 sm:py-2.5">
              <SunflowerMascot
                expression="happy"
                className="h-8 w-8 shrink-0 sm:h-10 sm:w-10"
              />
              <div className="min-w-0 flex-1">
                {/*
                  A label rather than a heading. The screen below owns the page's
                  single h1, so a heading here would give every page two, which
                  makes the document outline lie to a screen reader.
                */}
                {title && (
                  <h1 className="truncate text-sm font-bold leading-tight text-lavender-700 sm:text-base">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="truncate text-[0.6875rem] font-medium leading-tight text-lavender-600 sm:text-xs">
                    {subtitle}
                  </p>
                )}
              </div>
              {headerAction && (
                <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
                  {headerAction}
                </div>
              )}
            </div>
          </header>
        )}

        <main
          className={cn(
            'flex flex-1 flex-col',
            // Clear the fixed bottom bar, and keep the last row above the home
            // indicator.
            showNav && 'pb-[calc(4rem+env(safe-area-inset-bottom))]',
          )}
        >
          {banner && !bare && (
            <div className="px-5 pt-3">
              <DemoBanner />
            </div>
          )}
          {children}
        </main>

        {showNav && <BottomNav active={activeNav} onNavigate={onNavigate} />}
      </div>
    </div>
  )
}

export interface BottomNavProps {
  active?: NavDestination
  onNavigate?: (destination: NavDestination) => void
}

/** The five tabs, in reading order. */
const NAV_ITEMS = [
  { key: 'home', label: 'Today', Icon: Home },
  { key: 'learn', label: 'Learn', Icon: BookOpen },
  { key: 'tools', label: 'Practise', Icon: Sparkles },
  { key: 'journal', label: 'Journal', Icon: NotebookPen },
  { key: 'progress', label: 'Progress', Icon: TrendingUp },
] as const satisfies readonly {
  key: NavDestination
  label: string
  Icon: LucideIcon
}[]

/**
 * The bottom navigation bar.
 *
 * Fixed rather than sticky so it stays put while the content scrolls, and padded
 * for the home indicator. Buttons carry both an icon and a label, because the
 * icons alone are ambiguous.
 */
export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav
      aria-label="Main navigation"
      className={cn(
        'fixed bottom-0 z-30 w-full max-w-app',
        'border-t border-white/50 bg-white/80 backdrop-blur-md',
        'pb-[env(safe-area-inset-bottom)]',
      )}
    >
      <ul className="flex items-stretch">
        {NAV_ITEMS.map(({ key, label, Icon }) => {
          const isActive = active === key
          return (
            <li key={key} className="flex-1">
              <button
                type="button"
                onClick={() => onNavigate?.(key)}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 py-2',
                  'text-[0.6875rem] font-medium transition-colors',
                  isActive
                    ? 'text-sunflower-700'
                    : 'text-lavender-600 hover:text-lavender-700',
                )}
              >
                <Icon
                  className={cn('h-5 w-5', isActive && 'stroke-[2.5]')}
                  aria-hidden="true"
                />
                {label}
              </button>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}

/** A centred loading state, used while the session resolves. */
export function LoadingScreen({ message = 'Opening the demo...' }: { message?: string }) {
  return (
    <div className="bg-spa-canvas flex min-h-dvh flex-col items-center justify-center gap-4 px-6">
      <SunflowerMascot
        expression="calm"
        className="h-24 w-24 animate-pulse"
        title="Loading"
      />
      <p className="text-sm text-lavender-600" role="status">
        {message}
      </p>
    </div>
  )
}

/** A centred message for an unrecoverable load failure. */
export function ErrorScreen({
  message,
  onRetry,
}: {
  message: string
  onRetry?: () => void
}) {
  return (
    <div className="bg-spa-canvas flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <SunflowerMascot expression="calm" className="h-24 w-24" />
      <p className="max-w-xs text-sm text-lavender-700" role="alert">
        {message}
      </p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="min-h-11 rounded-xl border border-purple-300 bg-white/80 px-5 text-sm font-semibold text-lavender-700"
        >
          Try again
        </button>
      )}
    </div>
  )
}

/** The version label, shown in the shell footer and in the More menu. */
export function VersionLabel({ version }: { version: string }) {
  return (
    <StatusPill tone="neutral" className="text-[0.625rem]">
      Version {version}
    </StatusPill>
  )
}

export { MoreHorizontal }
