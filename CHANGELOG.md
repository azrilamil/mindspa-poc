# Changelog

All notable changes to this repository. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0] - 2026-11-13

A full rebuild. The previous 1.0.0 was a thin three screen demo; this release replaces
the screens, the styling, the data layer and the test suite.

### Added

- **Anonymous demo mode.** One tap creates a session seeded with nine days of
  synthetic practice. No account, no email, no password, no personal data field
  anywhere in the domain model or the schema.
- **A typed journey state machine** (`src/app/journey.ts`). The home screen is
  unreachable until the guided session has completed, which is the same moment the
  programme start date is written.
- **Splash, landing, wellbeing check, guided session, today, check-in, practise,
  audio, journal, learn, progress, follow-up, researcher and more screens.**
- **The breathing pacer.** 4-4-4 and 4-7-8, whole cycle rounding, a clock driven orb
  and optional chimes.
- **The 5-4-3-2-1 grounding wizard**, five steps, nothing typed, nothing recorded.
- **The informal mindfulness wizard**, four steps with a real five second countdown.
- **The audio library** with a two tier fallback: the demo bucket first, the bundled
  copy second, both holding real audio.
- **A thirty day calendar** with a mood dot per recorded day, a legend that names each
  state, and a tappable day that opens that check-in.
- **Progress** with the streak, the longest run, weekly buckets, practice totals and
  the wellbeing comparison.
- **A researcher dashboard** at `#/admin`, over a generated synthetic cohort, with a
  live chart and a sortable table.
- **A fresh wellbeing check.** Five prompts written for this build, a simple sum and
  three descriptive bands. Not a clinical instrument, and the copy says so.
- **The `DataPort` seam** with two implementations: a local adapter over
  `localStorage` and a Convex adapter selected by `VITE_CONVEX_URL`.
- **Convex schema and functions** for the demo, with a per session write limiter and a
  scheduled sweep (`convex/crons.ts`).
- **`scripts/reseed-demo.ts`**, the manual equivalent of the scheduled sweep.
- **Service worker** in prompt mode with an update banner, and a manual update check
  in the More menu.
- **A 408 test suite** across 26 files, including one end to end journey through the
  real app and a hygiene test that scans the work tree.

### Changed

- The pastel rose, lavender and sunflower identity now lives in Tailwind v4 theme
  tokens rather than hand written CSS, and the mascot is drawn as inline SVG with
  three expressions.
- The daily check-in asks for a mood, what you did, how long it took and an optional
  note, and it accepts any day up to today.
- Adherence counts against days elapsed during the programme and against thirty once
  it ends, rather than a fixed denominator from day one.
- The Docker image is a two stage build with immutable caching on hashed assets and
  no-store on the HTML shell.

### Removed

- The old three screen structure.
- Every partner, institution and researcher name from the private original.
- The clinical questionnaire, its instrument name and its item wording.
- The original audio bucket and every deployment key.
- Any Malay UI string.

### Fixed

- A completion check that treated a zero duration as finished, which could have
  unlocked the programme before any audio loaded.
- A page with two level one headings, which made the document outline lie to a screen
  reader.

## [1.0.0] - 2026-11-12

Initial public proof of concept: a check-in, a two minute session and a progress
list, stored in the browser. Superseded by 2.0.0.
