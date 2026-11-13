/**
 * The audio library.
 *
 * Every track is served in two tiers:
 *
 *   1. Stream from the demo bucket, `${VITE_S3_AUDIO_BASE}/<key>.mp3`, which
 *      defaults to the dedicated `mindspa-poc-demo` prefix.
 *   2. Fall back to the copy bundled in `public/audio/`.
 *
 * Both tiers hold the same audio, so the player, the seek bar and the natural
 * completion signal all run against real media at either tier. The bundled copies
 * are short generative tones written for this repo, so the demo has audio even
 * with no network at all.
 */

/** Where tier one lives. Overridable so a new bucket is a config change. */
export const S3_AUDIO_BASE =
  (import.meta.env?.VITE_S3_AUDIO_BASE as string | undefined) ??
  'https://s3.azril.io/mindspa-poc-demo/audio'

/** Where tier two lives. Vite copies `public/` to the bundle root. */
export const BUNDLED_AUDIO_BASE = '/audio'

export interface AudioTrack {
  /** Stable key. Also the filename and the stored `trackKey` value. */
  key: string
  title: string
  subtitle: string
  durationSeconds: number
  /** True for the guided session track that starts the programme. */
  isGuidedSession: boolean
}

/** The guided session track. Finishing it starts the programme. */
export const GUIDED_TRACK_KEY = 'guided-session-8min'

/** Its length in seconds, eight minutes. */
export const GUIDED_TRACK_SECONDS = 480

/**
 * How close to the end counts as reaching it.
 *
 * The `ended` event is the real completion signal. This tolerance exists so a
 * slightly different master still counts, and it is a few seconds, never minutes.
 */
export const COMPLETION_TOLERANCE_SECONDS = 5

export const AUDIO_TRACKS: AudioTrack[] = [
  {
    key: GUIDED_TRACK_KEY,
    title: 'Guided relaxation and presence',
    subtitle: 'The eight minute session that opens the programme',
    durationSeconds: GUIDED_TRACK_SECONDS,
    isGuidedSession: true,
  },
  {
    key: 'quiet-flute',
    title: 'Quiet flute',
    subtitle: 'A single line, slow enough to follow',
    durationSeconds: 200,
    isGuidedSession: false,
  },
  {
    key: 'still-room',
    title: 'Still room',
    subtitle: 'Soft room tone with a low drone',
    durationSeconds: 296,
    isGuidedSession: false,
  },
  {
    key: 'evening-pool',
    title: 'Evening pool',
    subtitle: 'Water, then quiet',
    durationSeconds: 270,
    isGuidedSession: false,
  },
  {
    key: 'garden-stillness',
    title: 'Garden stillness',
    subtitle: 'Birds far off, nothing close',
    durationSeconds: 184,
    isGuidedSession: false,
  },
]

/**
 * The home practice tracks.
 *
 * The guided session is excluded deliberately: it happens once, on its own
 * screen, and offering it in the library would turn a one time start into an
 * ordinary track.
 */
export const LIBRARY_TRACKS: AudioTrack[] = AUDIO_TRACKS.filter(
  (track) => track.key !== GUIDED_TRACK_KEY,
)

export function findTrack(key: string): AudioTrack | undefined {
  return AUDIO_TRACKS.find((track) => track.key === key)
}

/** The guided track. Throws rather than returning undefined, since it is required. */
export function guidedTrack(): AudioTrack {
  const track = findTrack(GUIDED_TRACK_KEY)
  if (!track) throw new Error(`The guided track "${GUIDED_TRACK_KEY}" is missing.`)
  return track
}

export function tierOneUrl(key: string): string {
  return `${S3_AUDIO_BASE}/${key}.mp3`
}

export function tierTwoUrl(key: string): string {
  return `${BUNDLED_AUDIO_BASE}/${key}.mp3`
}

/** The candidate URLs, in the order the player should try them. */
export function candidateUrls(key: string): string[] {
  return [tierOneUrl(key), tierTwoUrl(key)]
}

/**
 * Whether a finished playback counts as complete.
 *
 * `ended` is authoritative. A position within tolerance of the end is accepted
 * too, because a different master may stop a second or two short.
 */
export function isCompletePlayback(
  ended: boolean,
  positionSeconds: number,
  durationSeconds: number,
): boolean {
  if (ended) return true
  // A zero or unknown duration cannot be complete: the media never loaded, and
  // treating a started-but-loading player as finished would unlock the programme.
  if (!Number.isFinite(positionSeconds) || !Number.isFinite(durationSeconds)) {
    return false
  }
  if (durationSeconds <= 0) return false
  return durationSeconds - positionSeconds <= COMPLETION_TOLERANCE_SECONDS
}

/** `mm:ss`, for the elapsed and total readouts. */
export function formatClock(seconds: number): string {
  const safe = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0
  const minutes = Math.floor(safe / 60)
  const remainder = safe % 60
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`
}
