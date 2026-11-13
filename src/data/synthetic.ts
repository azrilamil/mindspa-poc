import type { ProgressEntry } from '../types'

/** Fake history used to seed a fresh browser. No real people or sessions. */
export const SYNTHETIC_ENTRIES: ProgressEntry[] = [
  {
    id: 'syn-checkin-1',
    kind: 'check-in',
    at: '2026-11-10T09:15:00.000Z',
    answers: { settled: 3, clear: 4, kind: 3, present: 4 },
    average: 3.5,
    synthetic: true,
  },
  {
    id: 'syn-session-1',
    kind: 'session',
    at: '2026-11-10T09:20:00.000Z',
    durationSeconds: 120,
    synthetic: true,
  },
  {
    id: 'syn-checkin-2',
    kind: 'check-in',
    at: '2026-11-11T18:40:00.000Z',
    answers: { settled: 4, clear: 4, kind: 5, present: 4 },
    average: 4.3,
    synthetic: true,
  },
  {
    id: 'syn-session-2',
    kind: 'session',
    at: '2026-11-12T07:05:00.000Z',
    durationSeconds: 120,
    synthetic: true,
  },
  {
    id: 'syn-checkin-3',
    kind: 'check-in',
    at: '2026-11-12T19:10:00.000Z',
    answers: { settled: 5, clear: 3, kind: 4, present: 5 },
    average: 4.3,
    synthetic: true,
  },
]
