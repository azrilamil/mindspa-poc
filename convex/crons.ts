import { cronJobs } from 'convex/server'

import { internal } from './_generated/api'

/**
 * The scheduled demo reset.
 *
 * Every demo session older than a day is swept, along with its rows, so the public
 * demo cannot accumulate a year of stray state. The same mutation is exposed as
 * `scripts/reseed-demo.ts`, so a manual reseed and this job run identical code.
 *
 * This is a Convex cron definition. It is only registered once a deployment exists;
 * with no `VITE_CONVEX_URL` the app runs on the local adapter and this file is never
 * reached.
 */
const crons = cronJobs()

crons.daily(
  'reseed demo sessions',
  { hourUTC: 3, minuteUTC: 15 },
  internal.demo.sweepOldSessions,
  { maxAgeHours: 24 },
)

export default crons
