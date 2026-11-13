/**
 * The mood faces.
 *
 * Drawn as inline SVG rather than set as emoji, because emoji are rendered by the
 * platform's own font and look different on every device. Drawing them also lets
 * each face differ in shape rather than only in hue, which keeps the choices apart
 * for anyone who cannot separate the colours.
 */

import { cn } from '@/lib/cn'
import type { MoodExpression } from '@/domain/moods'

export interface MoodFaceProps {
  expression?: MoodExpression
  alt?: string
  className?: string
}

const INK = '#4A3B2A'

export function MoodFace({
  expression = 'happy',
  alt,
  className,
}: MoodFaceProps) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={cn('shrink-0', className)}
      role={alt ? 'img' : 'presentation'}
      aria-hidden={alt ? undefined : true}
      aria-label={alt}
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="32" cy="32" r="28" fill="#FDE68A" />
      <Eyes expression={expression} />
      <Mouth expression={expression} />
      {(expression === 'happy' || expression === 'excited') && (
        <>
          <ellipse cx="17" cy="38" rx="5" ry="3.5" fill="#F4A9B8" opacity="0.7" />
          <ellipse cx="47" cy="38" rx="5" ry="3.5" fill="#F4A9B8" opacity="0.7" />
        </>
      )}
    </svg>
  )
}

function Eyes({ expression }: { expression: MoodExpression }) {
  switch (expression) {
    case 'happy':
      return (
        <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
          <path d="M18 26 q5 -5 10 0" />
          <path d="M36 26 q5 -5 10 0" />
        </g>
      )
    case 'sad':
      return (
        <g>
          <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M17 20 q6 2 10 5" />
            <path d="M47 20 q-6 2 -10 5" />
          </g>
          <circle cx="23" cy="30" r="3" fill={INK} />
          <circle cx="41" cy="30" r="3" fill={INK} />
        </g>
      )
    case 'angry':
      return (
        <g>
          <g stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none">
            <path d="M17 22 l11 5" />
            <path d="M47 22 l-11 5" />
          </g>
          <circle cx="23" cy="32" r="3" fill={INK} />
          <circle cx="41" cy="32" r="3" fill={INK} />
        </g>
      )
    case 'excited':
      return (
        <g>
          <circle cx="22" cy="27" r="5" fill={INK} />
          <circle cx="42" cy="27" r="5" fill={INK} />
          <circle cx="24" cy="25" r="1.8" fill="#FFFFFF" />
          <circle cx="44" cy="25" r="1.8" fill="#FFFFFF" />
        </g>
      )
    case 'neutral':
      return (
        <g fill={INK}>
          <circle cx="23" cy="28" r="3" />
          <circle cx="41" cy="28" r="3" />
        </g>
      )
    case 'uneasy':
      return (
        <g>
          <g stroke={INK} strokeWidth="2.5" strokeLinecap="round" fill="none">
            <path d="M17 20 q6 0 10 3" />
            <path d="M47 24 q-6 -3 -10 0" />
          </g>
          <path d="M19 31 q4 -3 8 0" stroke={INK} strokeWidth="2.5" fill="none" />
          <path d="M37 31 q4 -3 8 0" stroke={INK} strokeWidth="2.5" fill="none" />
        </g>
      )
  }
}

function Mouth({ expression }: { expression: MoodExpression }) {
  switch (expression) {
    case 'happy':
      return (
        <path
          d="M22 40 q10 10 20 0 z"
          fill={INK}
          stroke={INK}
          strokeWidth="2"
          strokeLinejoin="round"
        />
      )
    case 'sad':
      return (
        <path
          d="M22 46 q10 -9 20 0"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )
    case 'angry':
      return (
        <path
          d="M22 46 q10 -7 20 0"
          fill="none"
          stroke={INK}
          strokeWidth="3"
          strokeLinecap="round"
        />
      )
    case 'excited':
      return <ellipse cx="32" cy="44" rx="9" ry="7" fill={INK} />
    case 'neutral':
      return (
        <path d="M24 43 h16" stroke={INK} strokeWidth="3" strokeLinecap="round" />
      )
    case 'uneasy':
      return (
        <path
          d="M23 44 q4 -4 8 0 q4 4 8 0"
          fill="none"
          stroke={INK}
          strokeWidth="2.5"
          strokeLinecap="round"
        />
      )
  }
}
