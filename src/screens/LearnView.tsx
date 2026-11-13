/**
 * Learn mindfulness.
 *
 * Five short, collapsible reads written fresh for this build: what attention
 * actually is, what the breath is for, why the mind wanders, how to start small,
 * and what the evidence does and does not say. No partner names, no study
 * citations that belong to another project.
 *
 * The tone is deliberately plain. A portfolio demo that oversells mindfulness is
 * less convincing than one that says what it can and cannot do.
 */

import { Fragment, useState, type ReactNode } from 'react'
import { BookOpen, ChevronDown, Compass, Heart, Leaf, Wind } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { Card } from '@/components/ui'
import { cn } from '@/lib/cn'

interface Topic {
  key: string
  title: string
  summary: string
  Icon: LucideIcon
  paragraphs: ReactNode[]
  points?: { label: string; detail: string }[]
}

const TOPICS: Topic[] = [
  {
    key: 'attention',
    title: 'What mindfulness actually is',
    summary: 'Attention, on purpose, without an argument about it',
    Icon: Compass,
    paragraphs: [
      'Mindfulness is the practice of noticing what is happening right now: a sound, a sensation, a mood, a thought. It is not emptying the mind, and it is not a mood you have to achieve.',
      'The useful part is the noticing. A thought arrives, you see it arrive, and you are no longer quite inside it. That small gap is what the practice trains.',
    ],
    points: [
      {
        label: 'On purpose',
        detail: 'You choose where attention goes rather than following whatever is loudest.',
      },
      {
        label: 'In the present',
        detail: 'Not rehearsing a conversation from this morning, not planning next week.',
      },
      {
        label: 'Without the argument',
        detail: 'You notice a feeling without immediately deciding whether it is allowed.',
      },
    ],
  },
  {
    key: 'breath',
    title: 'Why the breath',
    summary: 'An anchor that is always with you',
    Icon: Wind,
    paragraphs: [
      'The breath is used because it is portable and boring. It is always there, it changes on its own, and it gives attention something steady to rest on without requiring any equipment.',
      'The slow exhale is the interesting half. A longer out breath tends to nudge the body towards a calmer state, which is why 4-4-4 and 4-7-8 both make the out breath at least as long as the in breath.',
    ],
  },
  {
    key: 'wandering',
    title: 'The mind will wander',
    summary: 'That is the practice, not a failure of it',
    Icon: Leaf,
    paragraphs: [
      'Attention leaves. It leaves within seconds, and it leaves for good reasons: the mind is built to scan for problems. A session where you noticed wandering thirty times is not a worse session than one where you noticed it five times.',
      'The moment you notice is the repetition that builds the skill. Nothing was lost. You bring attention back, and the returning is the exercise.',
    ],
  },
  {
    key: 'starting',
    title: 'Starting small enough to repeat',
    summary: 'Two minutes daily beats an hour once',
    Icon: BookOpen,
    paragraphs: [
      'A practice you will actually do again is worth more than a longer one you dread. Two minutes after brushing your teeth is a real practice. A ten minute sit that happens twice and then stops is not.',
      'Attach it to something that already happens: the kettle, the walk to the bus, the last few minutes before sleep. The habit is the hard part, not the technique.',
    ],
    points: [
      {
        label: 'One minute counts',
        detail: 'A single slow breath noticed on purpose is not nothing.',
      },
      {
        label: 'Same time, same place',
        detail: 'The cue does the remembering for you.',
      },
      {
        label: 'Missing a day is information',
        detail: 'It usually means the cue was wrong, not that you failed.',
      },
    ],
  },
  {
    key: 'evidence',
    title: 'What the evidence says',
    summary: 'Useful, modest, and not a replacement for care',
    Icon: Heart,
    paragraphs: [
      'Research on short daily practice generally reports small to moderate improvements in self reported stress and mood, with the strongest findings for structured programmes of eight weeks or more. The effects are real but modest, and the studies vary in quality.',
      'Mindfulness is not a treatment for a mental health condition on its own, and it is not a substitute for professional care. If things feel heavy for more than a couple of weeks, talking to a doctor or a therapist is the sensible next step.',
    ],
  },
]

export function LearnView() {
  const [openKey, setOpenKey] = useState<string | null>('attention')

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Learn mindfulness</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          Five short reads. Tap a card to open it.
        </p>
      </header>

      <div className="space-y-3">
        {TOPICS.map((topic) => {
          const open = openKey === topic.key
          return (
            <Card key={topic.key} className="!p-0">
              <button
                type="button"
                onClick={() => setOpenKey(open ? null : topic.key)}
                aria-expanded={open}
                aria-controls={`topic-${topic.key}`}
                className="flex min-h-16 w-full items-center gap-3 p-4 text-left"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sunflower-300/60 text-sunflower-600">
                  <topic.Icon className="h-5 w-5" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold text-lavender-700">
                    {topic.title}
                  </span>
                  <span className="mt-0.5 block text-xs text-lavender-600">
                    {topic.summary}
                  </span>
                </span>
                <ChevronDown
                  className={cn(
                    'h-5 w-5 shrink-0 text-lavender-600 transition-transform',
                    open && 'rotate-180',
                  )}
                  aria-hidden="true"
                />
              </button>
              {open && (
                <div
                  id={`topic-${topic.key}`}
                  className="animate-spa-fade space-y-3 border-t border-white/60 px-4 pb-4 pt-3"
                >
                  {topic.paragraphs.map((paragraph, index) => (
                    <p
                      key={index}
                      className="text-xs leading-relaxed text-lavender-700"
                    >
                      {paragraph}
                    </p>
                  ))}
                  {topic.points && (
                    <ul className="space-y-2 pt-1">
                      {topic.points.map((point) => (
                        <li key={point.label} className="flex gap-2">
                          <span
                            aria-hidden="true"
                            className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-sunflower-500"
                          />
                          <span className="min-w-0 text-xs leading-relaxed text-lavender-700">
                            <span className="font-bold text-lavender-800">
                              {point.label}:{' '}
                            </span>
                            {point.detail}
                          </span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </Card>
          )
        })}
      </div>

      <Card className="bg-lavender-50/80 text-[0.6875rem] leading-relaxed text-lavender-700">
        <Fragment>
          <p className="font-bold">A note on what this is</p>
          <p className="mt-1 text-lavender-600">
            These pages are a plain language introduction written for this demo. They
            are not clinical guidance and they do not replace care from a qualified
            professional.
          </p>
        </Fragment>
      </Card>
    </div>
  )
}
