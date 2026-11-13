# MindSpa POC

A calm, installable web app for daily wellbeing check-ins, short guided practices and
a thirty day record of both. Built as a public portfolio piece: React 19, TypeScript
in strict mode, Tailwind v4 design tokens, a Convex ready data layer with an offline
adapter underneath, and a test suite that runs with no backend at all.

**Live demo:** [https://mindspa-poc.azril.io](https://mindspa-poc.azril.io)

[![CI](https://github.com/azrilamil/mindspa-poc/actions/workflows/ci.yml/badge.svg)](https://github.com/azrilamil/mindspa-poc/actions/workflows/ci.yml)

> **Demo with synthetic data.** This is a portfolio build, not a clinical study and
> not a medical tool. Every row you see is generated, there is no sign-up, and the
> anonymous demo session can be reset at any time.

## What it is

One tap enters an anonymous demo session seeded with nine days of synthetic practice.
From there you can record a daily mood check-in, run a two minute breathing exercise,
work through the 5-4-3-2-1 grounding steps, listen to a short track with the screen
locked, write a journal page, read five short pieces on attention, and watch the
streak and the thirty day calendar fill in. A separate researcher dashboard shows
charts and a sortable table over a generated cohort.

The whole thing is mobile first, and it is designed to look deliberate at desktop
width rather than merely stretched.

## Screenshots

Images are added to `docs/screenshots/` as they are captured. The expected files:

| File | Screen |
| --- | --- |
| `docs/screenshots/01-splash.png` | Splash with the mascot and the demo action |
| `docs/screenshots/02-wellbeing-check.png` | The five prompt wellbeing check |
| `docs/screenshots/03-guided-session.png` | The guided session with its player |
| `docs/screenshots/04-today.png` | Today, with the hero action and the streak |
| `docs/screenshots/05-check-in.png` | The mood and activity check-in |
| `docs/screenshots/06-breathing.png` | The breathing pacer mid cycle |
| `docs/screenshots/07-grounding.png` | The grounding wizard on step three |
| `docs/screenshots/08-progress.png` | Progress, calendar and weekly chart |
| `docs/screenshots/09-researcher.png` | The researcher demo dashboard |
| `docs/screenshots/10-more.png` | The More menu and the demo reset |

## Features

- **Anonymous demo mode.** No account, no email, no password. The session key is the
  whole identity and lives in the browser.
- **Daily check-in.** Fifteen moods with distinct faces, six activities, a duration
  and an optional note. Any day up to today can be recorded or corrected.
- **Guided session.** An eight minute track with a breathing orb, a seek bar and a
  completion signal taken from the media itself. It opens the programme once, and
  it can be reopened from Practise or Today afterwards: a repeat records the
  session for today and leaves the programme start where it is.
- **Three relaxation tools.** A configurable breathing pacer with optional chimes, a
  five step grounding wizard, and a four step mindful moment with a real countdown.
- **Audio library.** Four tracks, played from a bucket when configured and from the
  bundled copies otherwise.
- **Wellbeing check.** Five fresh prompts, a simple sum, three descriptive bands and a
  plain statement that it is not a clinical measure.
- **Progress.** Streak, longest run, a thirty day calendar with a mood dot per day, a
  weekly chart, and the wellbeing comparison.
- **Researcher demo.** A synthetic cohort, a daily chart and a sortable table behind
  `#/admin`.
- **Installable.** A service worker in prompt mode, with an update banner that waits
  for you rather than reloading mid sentence.
- **Offline first.** With no backend configured, the app runs entirely on a local
  adapter with the same interface and the same rate limits.

## Tech stack

| Concern | Choice |
| --- | --- |
| UI | React 19, TypeScript strict, Vite 8 |
| Styling | Tailwind CSS v4, CSS first theme tokens, no config file |
| Icons | lucide-react |
| Charts | Hand rolled with divs and CSS, no charting dependency |
| Celebration | canvas-confetti, pleasant moods only, reduced motion respected |
| Backend | Convex schema and functions, with an `anyApi` client so the app builds without a deployment |
| Offline | A local `DataPort` adapter over `localStorage`, seeded deterministically |
| PWA | vite-plugin-pwa in prompt mode |
| Tests | Vitest, Testing Library, jsdom |
| Lint | oxlint |
| Deploy | Docker, nginx:alpine |

## Architecture

```
src/
  domain/     pure rules: dates, breathing, grounding, check-in, scoring, progress
  data/       the DataPort seam, local adapter, Convex adapter, synthetic seed
  app/        the journey state machine, routing, hooks, the audio player
  components/ the mascot, mood faces, calendar, tools, PWA banner, UI primitives
  screens/    one file per screen
convex/       schema, demo functions, rate limiter, scheduled sweep
```

Every read and write goes through one interface, `DataPort`. `VITE_CONVEX_URL`
selects the Convex adapter; unset, the app runs on the local adapter with synthetic
data. No screen imports either adapter, which is what lets the whole suite run with no
backend.

`docs/architecture.md` has the full diagram, including the Convex functions, the
Garage S3 audio tiers, the Coolify deployment and the scheduled demo reset.

## Run it locally

Requires Node 22 or newer.

```bash
npm ci
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). No environment variables are
needed: with `VITE_CONVEX_URL` unset the app runs offline on the local adapter with
the synthetic seed.

To point at a demo deployment:

```bash
VITE_CONVEX_URL=https://your-demo-deployment npm run dev
```

## Tests and quality gates

```bash
npm test          # 26 files, 408 tests
npm run lint      # oxlint, zero warnings
npm run build     # tsc -b, then vite build
```

The suite covers the domain rules, both data adapters, every wizard, the calendar,
the researcher dashboard, and one end to end journey through the real app: enter demo
mode, record a check-in, see it counted on the progress screen. `src/hygiene.test.ts`
reads the work tree and fails on forbidden names, leftover non English UI strings, a
hardcoded deployment URL, or a dash character that the house style forbids.

`docs/testing-and-ci.md` has the full breakdown and the seams that make it fast.

## Docker

```bash
docker build -t mindspa-poc .
docker run --rm -p 8080:80 mindspa-poc
```

Open [http://localhost:8080](http://localhost:8080). The image is a two stage build:
Node compiles the bundle, nginx serves it with long lived caching on hashed assets and
no-store on the HTML shell. It is suitable for Coolify as is.

## Where the data lives

Nothing personal is collected. The domain model has no email, phone or name field,
and `convex/schema.ts` has no place to put one. The anonymous session key is minted in
the browser and every backend call names it, so one visitor cannot reach another's
rows.

Demo sessions are swept daily, and `npm run reseed` does the same thing by hand.
`docs/data-and-privacy.md` lists exactly what is stored, what was removed, and the
rate limits on every public mutation.

## My role

Designed and led by **Mohd Azril Amil**, with AI assisted development. The product
shape, the visual identity and the mascot, the scoring and progress decisions, and the
review of every generated change are mine. The implementation was pair written with an
AI agent and verified by the test suite and the hygiene scan in this repository.

## Documentation

- [Architecture](docs/architecture.md)
- [Features, screen by screen](docs/features.md)
- [Data and privacy](docs/data-and-privacy.md)
- [Testing and CI](docs/testing-and-ci.md)
- [Design decisions](docs/design-decisions.md)
- [Changelog](CHANGELOG.md)

## License

MIT. See [LICENSE](LICENSE).
