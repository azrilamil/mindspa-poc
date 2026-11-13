#!/usr/bin/env node
/**
 * Reseed the demo deployment.
 *
 * What it does, in order:
 *
 * 1. Reads `VITE_CONVEX_URL` from the environment (or `.env.local`, via the same
 *    variable name). With no URL it prints what it would do and exits 0, so the
 *    script is safe to run in a repo that has no deployment attached yet.
 * 2. Calls `demo:sweepOldSessions`, which deletes every demo session older than the
 *    cutoff and cascades to its rows. That is the same code path the scheduled job
 *    uses, so a manual reseed and the cron cannot drift.
 * 3. Prints a summary of what was removed.
 *
 * It never touches a real cohort, because the demo deployment has none: the schema
 * holds anonymous demo sessions only.
 *
 * Usage:
 *
 *   npm run reseed
 *   npm run reseed -- --max-age-hours 6
 *   npm run reseed -- --dry-run
 *
 * Documented in docs/data-and-privacy.md.
 */

import { ConvexClient } from 'convex/browser'
import { anyApi } from 'convex/server'

/** The default cutoff: sessions older than a day are stale demo state. */
const DEFAULT_MAX_AGE_HOURS = 24

interface Options {
  dryRun: boolean
  maxAgeHours: number
  url: string | undefined
}

function parseArgs(argv: string[], envUrl: string | undefined): Options {
  let dryRun = false
  let maxAgeHours = DEFAULT_MAX_AGE_HOURS

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index]
    if (arg === '--dry-run') {
      dryRun = true
    } else if (arg === '--max-age-hours') {
      const value = Number(argv[index + 1])
      if (!Number.isFinite(value) || value <= 0) {
        throw new Error('--max-age-hours needs a positive number.')
      }
      maxAgeHours = value
      index += 1
    } else if (arg === '--help' || arg === '-h') {
      console.log(
        [
          'Reseed the MindSpa demo deployment.',
          '',
          'Options:',
          '  --max-age-hours <n>  Delete demo sessions older than n hours (default 24).',
          '  --dry-run            Report the plan without calling the backend.',
          '',
          'Environment:',
          '  VITE_CONVEX_URL      The demo deployment URL.',
        ].join('\n'),
      )
      process.exit(0)
    } else {
      throw new Error(`Unknown argument: ${arg}`)
    }
  }

  return { dryRun, maxAgeHours, url: envUrl }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2), process.env.VITE_CONVEX_URL)

  if (!options.url) {
    console.log('VITE_CONVEX_URL is not set.')
    console.log(
      `Would delete demo sessions older than ${options.maxAgeHours} hours, and cascade to their rows.`,
    )
    console.log('Nothing was called. Set VITE_CONVEX_URL to reseed a deployment.')
    return
  }

  if (options.dryRun) {
    console.log(`Dry run: would delete demo sessions older than ${options.maxAgeHours} hours from ${options.url}.`)
    return
  }

  const client = new ConvexClient(options.url)
  const api = anyApi as unknown as {
    demo: Record<string, unknown>
  }

  try {
    const sweep = api.demo.sweepOldSessions
    if (!sweep) throw new Error('The demo:sweepOldSessions function is missing.')

    const result = (await client.mutation(sweep, {
      maxAgeHours: options.maxAgeHours,
    })) as { removed?: number }

    console.log(
      `Reseed complete. Removed ${result.removed ?? 0} stale demo session(s) older than ${options.maxAgeHours} hours.`,
    )
    console.log(
      'Every remaining session keeps its rows; a visitor who is mid-demo is not interrupted.',
    )
  } finally {
    await client.close()
  }
}

main().catch((error: unknown) => {
  console.error(
    error instanceof Error ? `Reseed failed: ${error.message}` : 'Reseed failed.',
  )
  process.exitCode = 1
})
