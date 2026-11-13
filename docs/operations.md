# Operations

Short notes for anyone running or inspecting the public MindSpa demo.

## Live demo

The site is at [https://mindspa-poc.azril.io](https://mindspa-poc.azril.io). Source is this repository. The live demo talks to a dedicated Convex deployment at [https://convex-demo.azril.io](https://convex-demo.azril.io), used only for these public portfolio apps and never for any private deployment.

## Demo data reset

A Convex cron runs every day at 03:15 UTC (11:15 Malaysia Time). It removes demo sessions older than 24 hours, together with the check-ins, practice sessions, journal entries and wellbeing rows that belong to them. Visitors can also reset their own session from the More menu. `npm run reseed` runs the same sweep by hand.

All stored data is synthetic. There are no user accounts and no clinical questionnaire items.

## Backends

- Session metadata is stored in Convex when `VITE_CONVEX_URL` is set. The More menu then names the Convex demo deployment.
- If Convex is not configured or is unreachable, the app uses a local storage adapter and the badge says so.
- Guided session audio is served from files bundled with the app. Object storage is not used for public audio because the current object store does not offer anonymous public read.

## Researcher view

The researcher dashboard shows a client-generated synthetic cohort. A visitor's own check-ins never appear there. That is a deliberate privacy choice.

## Deploy

The live site is deployed from the `main` branch. Do a normal merge and a normal Coolify deploy. Do not force-push. Scan for secrets before every push.
