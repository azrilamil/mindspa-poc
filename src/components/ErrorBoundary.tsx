/**
 * The error boundary.
 *
 * One boundary per region, so a crash inside the participant journey does not take
 * the researcher dashboard down with it. The fallback says plainly that nothing was
 * lost, because a blank screen after a crash reads as data loss even when the
 * writes already succeeded.
 */

import { Component, type ErrorInfo, type ReactNode } from 'react'

import { SunflowerMascot } from '@/components/SunflowerMascot'

export interface ErrorBoundaryProps {
  children: ReactNode
  /** The region name shown in the fallback. */
  region?: string
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  message: string | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, State> {
  state: State = { hasError: false, message: null }

  static getDerivedStateFromError(error: unknown): State {
    return {
      hasError: true,
      message: error instanceof Error ? error.message : null,
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    // A real deployment would report this. The demo logs it, which is enough to
    // debug from a browser console and keeps the build free of telemetry hooks.
    console.error('Scene failed to render:', error, info.componentStack)
  }

  private reset = () => {
    this.setState({ hasError: false, message: null })
  }

  render() {
    if (!this.state.hasError) return this.props.children
    if (this.props.fallback) return this.props.fallback

    return (
      <div
        role="alert"
        className="bg-spa-canvas flex min-h-dvh flex-col items-center justify-center gap-5 px-6 py-10 text-center"
      >
        <SunflowerMascot expression="calm" className="h-24 w-24" />
        <div className="space-y-2">
          <h1 className="text-base font-bold text-lavender-800">
            Something did not load
          </h1>
          <p className="mx-auto max-w-xs text-xs leading-relaxed text-lavender-700">
            {this.props.region ?? 'This screen'} could not be shown. Anything you
            already saved is still there.
          </p>
          {this.state.message && (
            <p className="mx-auto max-w-xs break-words text-[0.625rem] text-lavender-600">
              {this.state.message}
            </p>
          )}
          <button
            type="button"
            onClick={this.reset}
            className="mt-2 inline-flex min-h-11 items-center rounded-full bg-lavender-700 px-5 py-2 text-sm font-semibold text-white shadow-xs transition-colors hover:bg-lavender-800"
          >
            Try again
          </button>
        </div>
      </div>
    )
  }
}
