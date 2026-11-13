/**
 * Per session write limiting.
 *
 * Pure arithmetic, kept out of the mutation so it can be tested without a Convex
 * deployment. A demo endpoint is public by definition, so the point is not to stop
 * a determined attacker but to stop a runaway loop or an accidental double submit
 * from filling the deployment.
 */

export interface RateLimitRule {
  /** Writes allowed inside the window. */
  max: number
  windowMs: number
}

export const WRITE_RULES = {
  checkIn: { max: 10, windowMs: 60_000 },
  session: { max: 30, windowMs: 60_000 },
  wellbeing: { max: 5, windowMs: 60_000 },
  journal: { max: 10, windowMs: 60_000 },
  demoReset: { max: 3, windowMs: 300_000 },
} as const satisfies Record<string, RateLimitRule>

export type WriteAction = keyof typeof WRITE_RULES

export interface Decision {
  allowed: boolean
  /** The timestamps to persist, already trimmed to the window. */
  timestamps: number[]
  /** Milliseconds until the oldest write falls out of the window. */
  retryAfterMs: number
}

/**
 * Decide whether a write may proceed.
 *
 * Timestamps are trimmed to the window before the comparison, so a session that
 * was busy an hour ago starts this window empty.
 */
export function decideWrite(
  timestamps: readonly number[],
  now: number,
  rule: RateLimitRule,
): Decision {
  const recent = timestamps
    .filter((at) => Number.isFinite(at) && now - at < rule.windowMs)
    .sort((a, b) => a - b)

  if (recent.length >= rule.max) {
    const oldest = recent[0] ?? now
    return {
      allowed: false,
      timestamps: recent,
      retryAfterMs: Math.max(0, rule.windowMs - (now - oldest)),
    }
  }

  return {
    allowed: true,
    timestamps: [...recent, now],
    retryAfterMs: 0,
  }
}

/** A session key with enough entropy that two browsers never collide. */
export function mintSessionKey(random: () => number = Math.random): string {
  const part = () => Math.floor(random() * 0xffffffff).toString(36)
  return `demo-${part()}${part()}`
}

/** The limits on any uploaded media, enforced before a URL is stored. */
export const UPLOAD_LIMITS = {
  maxBytes: 2 * 1024 * 1024,
  allowedTypes: ['audio/mpeg', 'audio/ogg', 'audio/wav'] as const,
}

export function isAllowedUpload(type: string, bytes: number): boolean {
  return (
    (UPLOAD_LIMITS.allowedTypes as readonly string[]).includes(type) &&
    Number.isFinite(bytes) &&
    bytes > 0 &&
    bytes <= UPLOAD_LIMITS.maxBytes
  )
}
