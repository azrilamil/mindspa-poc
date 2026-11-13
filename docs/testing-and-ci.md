# Testing and CI

## Running the gates

```bash
npm ci
npm test          # vitest, 26 files, 408 tests
npm run lint      # oxlint
npm run build     # tsc -b, then vite build
```

All three must exit 0. There is no watch mode in CI: `npm test` is `vitest run`.

## How the suite is arranged

The tests sit next to the code they cover, and they are layered the same way the app
is. Domain tests need no DOM; component tests render one component; one journey test
renders the real app.

| Area | Files | What it pins |
| --- | --- | --- |
| Dates | `src/domain/studyDay.test.ts` | Local date maths, the streak grace day, elapsed day adherence |
| Breathing | `src/domain/breathing.test.ts` | Cycle rounding, phase boundaries, orb scale, formatting |
| Grounding | `src/domain/grounding.test.ts` | 5-4-3-2-1 counts, English copy, progress |
| Check-in | `src/domain/checkIn.test.ts` | Editable dates, validation, calendar statuses, badges |
| Practice merge | `src/domain/practice.test.ts` | Accumulation, seed precedence, fallback minutes |
| Wellbeing | `src/domain/wellbeing.test.ts` | Clamping, bands, cut points, change copy |
| Progress | `src/domain/progress.test.ts` | Totals, longest run, weekly buckets, delta |
| Audio | `src/domain/audioTracks.test.ts` | Tier URLs, completion tolerance, clock format |
| Moods | `src/domain/moods.test.ts` | Every mood labelled and faced, no leftovers |
| Journey | `src/app/journey.test.ts` | The gate, transitions, the next action |
| Routes | `src/app/routes.test.ts` | Hash parsing, round trips, the data factory |
| Local adapter | `src/data/localAdapter.test.ts` | Seeding, validation, rate limits, reset |
| Convex adapter | `src/data/convexAdapter.test.ts` | Argument shape, error classification, mapping |
| Synthetic seed | `src/data/synthetic.test.ts` | Determinism, privacy, the researcher cohort |
| UI primitives | `src/components/ui.test.tsx` | Busy state, dialog, banner, error tones |
| Mascot | `src/components/SunflowerMascot.test.tsx` | Decorative by default, distinct faces |
| Orb | `src/components/relaxation/BreathingOrb.test.tsx` | Phase changes, cues, single completion |
| Grounding wizard | `src/components/relaxation/GroundingWizard.test.tsx` | Step counts, blocked back, finish |
| Informal wizard | `src/components/relaxation/InformalMindfulnessWizard.test.tsx` | Countdown, four steps |
| Calendar | `src/components/StreakCalendar.test.tsx` | Denominator, legend, tappable days |
| Celebration | `src/lib/celebrate.test.ts` | Pleasant only, reduced motion, never throws |
| Screens | `src/screens/screens.test.tsx` | Home states, progress states, dashboard sorting |
| Journey | `src/journey.test.tsx` | Enter demo, check in, see it counted |
| Hygiene | `src/hygiene.test.ts` | Forbidden names, house style, no secrets |
| Backend contract | `convex/apiContract.test.ts` | Client and backend function names agree |
| Rate limiter | `convex/lib/rateLimit.test.ts` | Window arithmetic, upload caps |

## The journey test

`src/journey.test.tsx` renders the real `App` against the local adapter with an
in-memory store and a fixed clock. It proves the product claim rather than a mock:
enter demo mode, record a mood and an activity, and see the day counted on progress.
The same file covers the splash copy, the refusal to save an empty check-in, the
breathing pacer, the grounding walkthrough, the journal, the researcher dashboard and
the More menu.

## Fakes, not stubs

Three seams make the suite fast and honest:

- **The clock.** `createLocalPort({ now })` takes a date, so "today" in a test is a
  date the test chose. Nothing depends on the day the suite runs.
- **The store.** `createMemoryStore()` is the same `StateStore` interface the browser
  implementation uses, so `localStorage` is never needed.
- **The Convex client.** `createConvexPort({ client })` takes anything with
  `mutation` and `query`, so the adapter's argument shape is asserted without a
  deployment.

## The hygiene test

`src/hygiene.test.ts` reads the work tree and fails on:

- Partner, institution and instrument names that belong to the private original.
- Any en dash (U+2013) or em dash (U+2014).
- Malay UI strings in code.
- A hardcoded Convex deployment URL or the original audio bucket.
- A contact field in the domain model.
- Copy that affirms a diagnosis or a treatment rather than denying one.

That test is why the public repo can be checked by anyone in one command.

## CI

`.github/workflows/ci.yml` runs on every push to `main` and on every pull request:
Node 24, `npm ci`, then lint, test and build. It needs no secrets: the app runs on the
local adapter when `VITE_CONVEX_URL` is unset, which is exactly what CI does.

There are no Coolify or Convex tokens in Actions, and none are needed.
