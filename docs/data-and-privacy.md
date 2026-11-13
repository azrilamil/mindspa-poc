# Data and privacy

## The short version

Every row in this build is synthetic. There is no sign-up, no email field, no phone
number, no date of birth and no name a person would fill in. The demo session is
anonymous, and the researcher dashboard reads from a generated cohort that never
touches the visitor's own session.

## What a visitor produces

Only what they type or tap inside the demo:

| Table | What it holds | Personal identifiers |
| --- | --- | --- |
| `demoUsers` | An anonymous session key, a display label, a programme start date | None |
| `checkIns` | Date, mood, activities, minutes, optional note | None |
| `sessions` | Date, kind, minutes, completion flag, audio tier | None |
| `journalEntries` | Date, title, body, optional mood | None |
| `wellbeingChecks` | Date, five 1 to 5 ratings, optional gratitude line | None |
| `writeLog` | Per session write timestamps, for the rate limiter | None |

The session key is minted in the browser, is the whole identity, and is kept in
`localStorage`. Every backend call names it, and every query filters by it, so one
visitor cannot reach another's rows.

## What was removed

This build replaces an earlier, private system. Nothing from that system is present
here:

- No partner, institution or clinic names.
- No researcher or participant names.
- No clinical questionnaire and no clinical instrument name: the wellbeing check is
  five freshly written prompts with a plain sum, and the code and the tests both
  assert that the old instrument's name does not appear.
- No participant codes, enrolment codes or access codes.
- No real cohort size, no study date range, no statistical export shaped like the
  original study.
- No original audio bucket. The demo bucket is a separate prefix, and the bundled
  fallback tracks are original generative tones written for this repo.
- No `.env` with real values, and no deployment keys. `VITE_CONVEX_URL` is read from
  the environment and is unset in this repository.

`src/hygiene.test.ts` enforces the parts a test can see: the forbidden names, the
absence of Malay UI strings, no hardcoded Convex URL, no original bucket, no en or em
dashes, and no contact fields in the domain model.

## Reset and reseed

Two ways to get back to a known state.

**From the UI.** More, then "Reset the demo data". This wipes everything the current
session wrote and reseeds the synthetic baseline. It is rate limited, so a stuck
button cannot hammer the deployment.

**From a terminal.**

```bash
VITE_CONVEX_URL=https://your-demo-deployment npm run reseed
```

`scripts/reseed-demo.ts` calls `demo:sweepOldSessions`, which deletes every demo
session older than the cutoff and cascades to its rows. Flags:

```
--max-age-hours <n>   Delete sessions older than n hours. Default 24.
--dry-run             Report the plan without calling the backend.
```

With `VITE_CONVEX_URL` unset the script prints what it would do and exits 0, so it is
safe to run in a checkout with no deployment attached.

**Scheduled.** `convex/crons.ts` runs the same mutation daily at 03:15 UTC with a 24
hour cutoff. A manual reseed and the scheduled job run identical code, so they cannot
drift.

## Rate limiting

Every public mutation passes through one helper. The limits are per session, per
action, in a rolling window:

| Action | Writes | Window |
| --- | --- | --- |
| Check-in | 10 | 60 s |
| Session | 30 | 60 s |
| Wellbeing check | 5 | 60 s |
| Journal | 10 | 60 s |
| Demo reset | 3 | 5 min |

The local adapter enforces the same table, so the demo behaves identically with no
backend. A refused write surfaces as a message with the wait, not a silent failure.

Uploads, if any are ever added, are bounded to 2 MB and audio/mpeg, audio/ogg or
audio/wav. Nothing in this build uploads a file.

## What this is not

This is a portfolio demonstration. It is not a medical device, it does not diagnose
anything, and it does not give health advice. The wellbeing check is a five item self
report with a simple sum, and the copy on screen says so.
