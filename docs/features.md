# Features, screen by screen

Every screen carries a demo banner: synthetic data, not a clinical study, not a
medical tool.

## 1. Splash

The mascot, the product name, the version label and two ways forward. "Enter demo
mode" is the primary action and creates an anonymous session already seeded with a
month of practice. "See how it works" opens a three step explanation. The researcher
dashboard is reachable from here, so a reviewer does not have to walk the flow to
find it.

## 2. How it works

Three honest steps: a one tap anonymous session, check in then practise, and see it
add up. It states plainly what is stored and what is not. There is no sign-up form
and no password field anywhere in the app.

## 3. Wellbeing check (opening)

Five fresh prompts, each a 1 to 5 rating with plain anchors:

- Mood: flat or heavy, through bright and steady
- Energy: running on empty, through plenty to spare
- Sleep: not rested, through well rested
- Focus: scattered, through settled
- Gratitude: hard to see any, through easy to notice

Plus one optional line about something that went well. The result is a descriptive
band (steady, mixed, stretched) and a sentence, never a diagnosis. The screen says
outright that the total is a simple sum and not a clinical measure.

## 4. Guided session

One eight minute track with a breathing orb alongside it, a seek bar, a restart and
a play control. Completion is decided from the media's own `ended` event, or a
position within five seconds of the end, so a differently mastered file still counts.
Finishing it sets the programme start date. A clearly labelled demo control skips to
the end.

## 5. Today

One hero action, so there is never a question of what to do next. If today is
unrecorded it asks for the check-in; once it is recorded it offers a practice. Below
that: the streak, the days recorded against days elapsed, this week's minutes, a
progress bar, today's mood as a single line, the three most recent sessions, and a
link into the learning content.

## 6. Daily check-in

Fifteen moods, each with its own face, label and colour, in a grid. Six activities,
a duration, and an optional note of up to 500 characters. The date stepper is bounded
at the programme start and at today, so a forgotten evening can still be filed the
next morning but a future day cannot. Practices finished in the tools arrive
pre-ticked, and the person can change any of it. A pleasant mood earns a small
confetti burst, unless reduced motion is on.

## 7. Practise

Four tools:

- **Breathing**: 4-4-4 or 4-7-8, 2, 5 or 10 minutes, an animated orb that expands on
  the inhale and contracts on the exhale, optional chimes, pause and resume.
- **Grounding 5-4-3-2-1**: five steps through sight, touch, sound, smell and taste.
  Nothing is typed, so nothing about what you noticed is recorded.
- **Audio library**: four short tracks with a seek bar and screen-locked playback.
- **Mindful moment**: four steps for an activity you were going to do anyway, with a
  real five second countdown on the opening pause.

Anything finished is offered to the day's check-in rather than written as a record by
itself.

## 8. Journal

One entry per day: title, body, optional mood. Earlier entries collect below,
newest first, and can be deleted.

## 9. Learn mindfulness

Five collapsible reads: what mindfulness actually is, why the breath, why the mind
wanders, starting small enough to repeat, and what the evidence does and does not
say. The last one is deliberately modest: short daily practice is associated with
small to moderate improvements in self reported stress and mood, and it is not a
substitute for care.

## 10. Progress

Days recorded, practice time, the longest run and the journal count. The 30 day
calendar, with a mood dot on every recorded day and a legend that names each state.
Check-ins per programme week. The wellbeing comparison against the opening check.
Recent check-ins, newest first. Every day from today backwards is tappable and opens
the check-in for that date.

## 11. Follow-up check

The same five prompts, reached from the progress screen once day 30 arrives. The
result is compared with the opening check as a simple point difference.

## 12. Researcher demo

Reachable at `#/admin` from the splash, from the header, and from the More menu. It
shows a synthetic cohort of 24 sessions: a check-ins per day chart, four summary
figures, and a sortable table of days, check-ins, practices, minutes and streaks. The
synthetic label is part of the layout, not a footnote.

## 13. More

About this build, the version and build labels, which data layer is active, a demo
reset that wipes the session and reseeds the baseline, a link to the researcher view,
and the update banner when a new build is waiting.

## 14. Empty states and errors

An empty journal, an empty progress screen, a failed save, a failed load and a
crashed region all have a written state. None of them is a blank panel, and none of
them apologises for a feature that does not exist.

## Installable web app

`vite-plugin-pwa` generates a service worker in prompt mode, so a new build installs
but waits. The banner offers to apply it, which matters because a reload mid
check-in would otherwise throw away what was being typed.
