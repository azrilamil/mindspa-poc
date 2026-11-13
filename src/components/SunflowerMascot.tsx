/**
 * The mascot: a cheerful sunflower, drawn as inline vector.
 *
 * Inline SVG because it scales cleanly, needs no network fetch and ships in the
 * precached bundle. Every expression shares the same petal and face geometry, so
 * the mascot never appears to change character between screens.
 */

export type MascotExpression = 'welcoming' | 'happy' | 'calm'

export interface SunflowerMascotProps {
  expression?: MascotExpression
  /** Tailwind sizing classes. The SVG scales to fill whatever box it is given. */
  className?: string
  /** Decorative by default; pass a label when the mascot conveys meaning. */
  title?: string
}

const PETAL_COUNT = 12

function Petals() {
  return (
    <g>
      {Array.from({ length: PETAL_COUNT }, (_, index) => (
        <ellipse
          key={index}
          cx="100"
          cy="42"
          rx="15"
          ry="27"
          fill="url(#mascotPetalGradient)"
          stroke="#F59E0B"
          strokeWidth="1.5"
          transform={`rotate(${(360 / PETAL_COUNT) * index} 100 100)`}
        />
      ))}
    </g>
  )
}

function Face({ expression }: { expression: MascotExpression }) {
  const ink = '#4A3B2A'
  return (
    <g>
      <ellipse cx="80" cy="112" rx="11" ry="7" fill="#F4A9B8" opacity="0.55" />
      <ellipse cx="120" cy="112" rx="11" ry="7" fill="#F4A9B8" opacity="0.55" />

      {expression === 'calm' ? (
        <g stroke={ink} strokeWidth="3.5" strokeLinecap="round" fill="none">
          <path d="M70 96 q10 -9 20 0" />
          <path d="M110 96 q10 -9 20 0" />
        </g>
      ) : (
        <g>
          <ellipse cx="80" cy="96" rx="6.5" ry="8" fill={ink} />
          <ellipse cx="120" cy="96" rx="6.5" ry="8" fill={ink} />
          <circle cx="82.5" cy="93" r="2.2" fill="#FFFFFF" />
          <circle cx="122.5" cy="93" r="2.2" fill="#FFFFFF" />
        </g>
      )}

      {expression === 'welcoming' && (
        <path
          d="M88 116 q12 12 24 0"
          fill="none"
          stroke={ink}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
      {expression === 'happy' && (
        <path
          d="M84 113 q16 17 32 0 z"
          fill={ink}
          stroke={ink}
          strokeWidth="3"
          strokeLinejoin="round"
        />
      )}
      {expression === 'calm' && (
        <path
          d="M89 117 q11 7 22 0"
          fill="none"
          stroke={ink}
          strokeWidth="3.5"
          strokeLinecap="round"
        />
      )}
    </g>
  )
}

export function SunflowerMascot({
  expression = 'welcoming',
  className,
  title,
}: SunflowerMascotProps) {
  const decorative = title === undefined
  return (
    <svg
      viewBox="0 0 200 200"
      className={className}
      role={decorative ? 'presentation' : 'img'}
      aria-hidden={decorative ? true : undefined}
      aria-label={title}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title !== undefined && <title>{title}</title>}
      <defs>
        <linearGradient id="mascotPetalGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FCD34D" />
          <stop offset="100%" stopColor="#FBBF24" />
        </linearGradient>
        <radialGradient id="mascotCentreGradient" cx="50%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#A9713F" />
          <stop offset="100%" stopColor="#8A5A2B" />
        </radialGradient>
      </defs>
      <Petals />
      <circle
        cx="100"
        cy="100"
        r="50"
        fill="url(#mascotCentreGradient)"
        stroke="#7A4E23"
        strokeWidth="1.5"
      />
      <Face expression={expression} />
    </svg>
  )
}

export default SunflowerMascot
