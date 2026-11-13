/**
 * The version label.
 *
 * Read by the splash, the More menu and the update banner. Kept as a single
 * constant so a release bumps one line, and the build can be told the value at
 * build time through `VITE_APP_VERSION`.
 */

export const APP_VERSION: string =
  (import.meta.env?.VITE_APP_VERSION as string | undefined) ?? '2.0.0'

/** The date this build was cut, shown in the More menu. */
export const BUILD_LABEL = '2026-11'
