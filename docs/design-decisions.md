# Design decisions

Each entry below is a decision that a reader might otherwise assume was accidental,
with the reasoning and the trade off.

## 1. A state machine for the journey, not route guards

`src/app/journey.ts` declares the phases, the transitions and the one gate that
matters: the home screen is unreachable until the guided session has completed, which
is the same moment the programme start date is set.

**Why:** a guard is a check a screen can forget. A machine makes "unreachable"
something the compiler and the tests enforce, and `resolvePhase` becomes the single
source of truth.

**Trade off:** a destination like the journal needs a small amount of local state as
well, because it is a place to visit rather than a step. That is handled in `App.tsx`
by deriving the rendered phase from the gate and the chosen destination together.

## 2. The animation is driven by the clock, not by frames

The breathing orb computes its state from elapsed seconds, read from
`performance.now()` on every frame, rather than accumulating deltas.

**Why:** a dropped frame or a backgrounded tab then cannot make the pacer drift away
from the instruction. Reloading the remaining time each frame is what keeps that
true.

**Trade off:** one extra subtraction per frame, which does not matter.

## 3. Sessions run to whole cycles

`planSession` rounds up to a whole number of breaths, never down.

**Why:** cutting someone off mid inhale is a poor way to end a relaxation exercise.
Rounding down would also silently deliver less than the duration they chose.

**Trade off:** a five minute 4-7-8 session actually runs 5:04. The plan reports the
overshoot, and the readout shows the real total, so nothing is hidden.

## 4. Adherence counts against elapsed days

During the programme, the denominator is the days that have passed; once it ends it
becomes 30.

**Why:** four out of four reads as success. Four out of thirty on day four reads as
failure, and a number that says you are failing is a plausible reason to stop opening
the app.

**Trade off:** the figure is not directly comparable mid programme and at the end. The
caption says which denominator is in use, so a reader is never guessing.

## 5. A missed day is named, not scolded

The label is "Not recorded", there is no red, and there is no broken streak styling.

**Why:** a gap is a fact the data will show regardless. Turning it into a reprimand
does not change the fact and does make the app worse to open.

## 6. The wellbeing check is fresh and deliberately plain

Five prompts, a 1 to 5 scale, a simple sum and three descriptive bands.

**Why:** the private original carried a clinical instrument. Reusing it would drag a
study's measurement model into a portfolio demo, and reusing its name would be a
privacy problem. Writing five generic prompts keeps the demo honest about what it is.

**Trade off:** the number means nothing clinically. The screen says so in plain
words, twice.

## 7. One data interface, two implementations

Every read and write goes through `DataPort`. The local adapter is the default; the
Convex adapter is selected by `VITE_CONVEX_URL`.

**Why:** the app and the whole test suite run with no backend, which is what makes
`npm run dev` and CI work in a checkout with no deployment attached. It also means the
backend is a configuration detail rather than an architectural dependency.

**Trade off:** two implementations to keep in step. `convex/apiContract.test.ts`
compares the function names on both sides, which catches the one failure mode that
would otherwise appear only in production.

## 8. The researcher view is generated on the client

The dashboard builds its cohort from a seeded generator rather than querying rows.

**Why:** there is then no code path by which a visitor's own demo session could appear
in a chart. "Synthetic" becomes structural rather than a claim.

**Trade off:** the chart is not live in the sense of reflecting real usage. For a demo
that is the point.

## 9. Audio falls back, and the fallback is real

Tier one is the demo bucket, tier two is the bundled copy, and the bundled copy is the
same audio rather than a degraded placeholder.

**Why:** a visitor with no network, or a bucket that is not configured yet, still gets
a working player, seek bar and completion signal. A silent dead button is the
alternative.

**Trade off:** the bundled tracks add a couple of megabytes to the repository. They
are short, low bitrate mono files, which keeps that reasonable.

## 10. The demo banner is not dismissible

**Why:** the one thing a visitor must never be able to forget while looking at a chart
is that the data is synthetic and this is not a medical tool. A dismissible banner is
a banner that is dismissed.

## 11. Rate limiting lives at the data seam

Both adapters enforce the same table, and the Convex functions enforce it again
server side.

**Why:** a demo endpoint is public by definition. The goal is not to stop a determined
attacker but to stop a runaway loop or an accidental double submit, and to make the
limit visible to a reviewer as a real concern that was handled.

## 12. Prompt mode for the service worker

**Why:** a reload in the middle of a check-in would throw away what was being typed.
The banner offers the update instead of taking it.

## 13. No dash characters in any copy

Not an aesthetic preference. The house style for this repository is commas, colons
and regular hyphens, and `src/hygiene.test.ts` fails the build on an en or em dash so
the rule cannot drift.

## 14. The mascot is inline SVG

**Why:** it scales cleanly, needs no network fetch, ships in the precached bundle, and
every expression shares the same petal and face geometry, so the mascot never appears
to change character between screens. It is decorative by default and labelled only
when it carries meaning.
