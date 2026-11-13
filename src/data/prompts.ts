/** Original generic wellbeing prompts, written fresh for this portfolio demo. */
export type CheckInQuestion = {
  id: string
  prompt: string
  lowLabel: string
  highLabel: string
}

export const CHECK_IN_QUESTIONS: CheckInQuestion[] = [
  {
    id: 'settled',
    prompt: 'How settled does your body feel right now?',
    lowLabel: 'Tense',
    highLabel: 'Settled',
  },
  {
    id: 'clear',
    prompt: 'How clearly can you notice your thoughts in this moment?',
    lowLabel: 'Foggy',
    highLabel: 'Clear',
  },
  {
    id: 'kind',
    prompt: 'How kind are you being toward yourself today?',
    lowLabel: 'Harsh',
    highLabel: 'Kind',
  },
  {
    id: 'present',
    prompt: 'How present do you feel in this moment?',
    lowLabel: 'Distant',
    highLabel: 'Present',
  },
]

export const SESSION_PROMPTS: string[] = [
  'Breathe in for four counts, then out for four counts.',
  'Notice one sound in the room, then let it fade.',
  'Relax your shoulders and unclench your jaw.',
  'Name one thing you can see, and one thing you can feel.',
  'Let the next breath be a little slower than the last.',
  'Rest your attention on the feeling of your feet on the floor.',
]

export const SESSION_SECONDS = 120
