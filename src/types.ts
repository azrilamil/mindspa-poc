export type CheckInAnswers = Record<string, number>

export type ProgressEntry = {
  id: string
  kind: 'check-in' | 'session'
  at: string
  answers?: CheckInAnswers
  average?: number
  durationSeconds?: number
  synthetic?: boolean
}
