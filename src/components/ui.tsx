/**
 * Shared UI primitives.
 *
 * These encode the design system in one place: sunflower yellow for primary
 * actions, lavender for text, soft pastel borders and the frosted card treatment.
 * Screens compose these rather than restating Tailwind strings, so the visual
 * language stays consistent and a change lands everywhere at once.
 *
 * Every control is at least 44px tall, which is the minimum comfortable touch
 * target.
 */

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2, X } from 'lucide-react'

import { cn } from '@/lib/cn'

/* ------------------------------------------------------------------- Button */

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger'
export type ButtonSize = 'sm' | 'md' | 'lg'

const BUTTON_VARIANTS: Record<ButtonVariant, string> = {
  primary:
    'bg-sunflower-400 text-slate-950 hover:bg-sunflower-500 active:bg-sunflower-600 shadow-sm font-bold disabled:bg-slate-200 disabled:text-slate-700 disabled:shadow-none',
  secondary:
    'bg-white/80 text-lavender-700 border border-purple-300 hover:bg-white active:bg-lavender-100 disabled:bg-slate-100 disabled:text-slate-500 disabled:border-slate-200 disabled:shadow-none',
  ghost: 'bg-transparent text-lavender-600 hover:bg-white/60 disabled:text-slate-400',
  danger:
    'bg-rose-deep text-white hover:brightness-95 font-semibold disabled:bg-slate-200 disabled:text-slate-600 disabled:shadow-none',
}

const BUTTON_SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-11 px-3 text-sm',
  md: 'min-h-12 px-4 text-base',
  lg: 'min-h-14 px-6 text-lg',
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  fullWidth?: boolean
  /** Optional leading icon. Hidden while loading so the label does not shift. */
  icon?: ReactNode
  /** Optional trailing icon rendered after the label. */
  trailingIcon?: ReactNode
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    icon,
    trailingIcon,
    className,
    children,
    disabled,
    type = 'button',
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl',
        'transition-colors duration-150',
        'disabled:cursor-not-allowed',
        BUTTON_VARIANTS[variant],
        BUTTON_SIZES[size],
        fullWidth && 'w-full',
        className,
      )}
      {...rest}
    >
      {loading ? (
        <Loader2 className="h-5 w-5 shrink-0 animate-spin" aria-hidden="true" />
      ) : (
        icon
      )}
      {children}
      {!loading && trailingIcon}
    </button>
  )
})

/* --------------------------------------------------------------------- Card */

export interface CardProps {
  children: ReactNode
  className?: string
}

/** The frosted glass panel used throughout the app. */
export function Card({ children, className }: CardProps) {
  return <div className={cn('card-spa p-5', className)}>{children}</div>
}

/* -------------------------------------------------------------- ProgressBar */

export interface ProgressBarProps {
  /** 0..1 */
  value: number
  label: string
  className?: string
}

export function ProgressBar({ value, label, className }: ProgressBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1)
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamped * 100)}
      aria-label={label}
      className={cn('h-2 w-full overflow-hidden rounded-full bg-white/60', className)}
    >
      <div
        className="h-full rounded-full bg-sunflower-400 transition-[width] duration-300 ease-out"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  )
}

/* ------------------------------------------------------------------- Dialog */

export interface DialogProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  /** Hide the close affordance for a sheet that must be acknowledged. */
  dismissible?: boolean
}

/**
 * A centred modal panel.
 *
 * Rendered inline rather than through a portal: at this app's scale the dialog is
 * always a direct child of the screen that owns it, so a portal would add a DOM
 * layer without changing anything.
 */
export function Dialog({
  open,
  title,
  onClose,
  children,
  dismissible = true,
}: DialogProps) {
  if (!open) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="card-spa max-h-[85dvh] w-full max-w-app overflow-y-auto p-5">
        <div className="mb-3 flex items-start justify-between gap-4">
          <h2 className="text-lg font-bold text-lavender-700">{title}</h2>
          {dismissible && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="-mr-1 -mt-1 inline-flex min-h-11 min-w-11 items-center justify-center rounded-full text-lavender-600 transition-colors hover:bg-white/70 hover:text-lavender-900 active:bg-lavender-100"
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          )}
        </div>
        {children}
      </div>
    </div>
  )
}

/* --------------------------------------------------------------- StatusPill */

export interface StatusPillProps {
  children: ReactNode
  tone?: 'neutral' | 'success' | 'warning'
  className?: string
}

const PILL_TONES = {
  neutral: 'bg-white/70 text-lavender-700',
  success: 'bg-emerald-100 text-emerald-800',
  warning: 'bg-sunflower-300 text-sunflower-800',
} as const

export function StatusPill({ children, tone = 'neutral', className }: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
        PILL_TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  )
}

/* ------------------------------------------------------------ DemoBanner */

/**
 * The demo and privacy notice.
 *
 * Present on every screen. It is deliberately not dismissible: the one thing a
 * visitor must never be able to forget while looking at a chart is that the data
 * is synthetic and this is not a medical tool.
 */
export function DemoBanner({ className }: { className?: string }) {
  return (
    <p
      role="note"
      className={cn(
        'rounded-xl border border-lavender-200 bg-lavender-50/90 px-3 py-2 text-[0.6875rem] leading-relaxed text-lavender-700',
        className,
      )}
    >
      <span className="font-bold">Demo with synthetic data.</span> This is a
      portfolio build, not a clinical study and not a medical tool.
    </p>
  )
}

/* ---------------------------------------------------------------- EmptyState */

export interface EmptyStateProps {
  title: string
  detail: string
  action?: ReactNode
  className?: string
}

/** A soft, non-apologetic empty state. */
export function EmptyState({ title, detail, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-2 rounded-2xl border border-dashed border-lavender-300 bg-white/50 px-5 py-8 text-center',
        className,
      )}
    >
      <p className="text-sm font-bold text-lavender-700">{title}</p>
      <p className="max-w-xs text-xs leading-relaxed text-lavender-600">{detail}</p>
      {action && <div className="pt-2">{action}</div>}
    </div>
  )
}

/* --------------------------------------------------------------- ErrorNote */

export interface ErrorNoteProps {
  message: string
  onDismiss?: () => void
  tone?: 'error' | 'warning'
}

export function ErrorNote({ message, onDismiss, tone = 'error' }: ErrorNoteProps) {
  return (
    <p
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn(
        'flex items-start gap-2 rounded-xl px-3 py-2 text-xs leading-relaxed',
        tone === 'error'
          ? 'border border-rose-deep/40 bg-rose-soft text-rose-deep'
          : 'border border-amber-200 bg-amber-50 text-amber-900',
      )}
    >
      <span className="flex-1">{message}</span>
      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full p-2.5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      )}
    </p>
  )
}
