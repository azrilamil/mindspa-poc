/**
 * The journal.
 *
 * One entry per day: a title, a few lines, an optional mood. Entries are listed
 * newest first and can be deleted from the list. The form is deliberately plain,
 * because a journal screen that asks for structure stops being a journal.
 *
 * The form is keyed by the entry it edits, so switching days remounts it with the
 * right initial values instead of synchronising them from an effect.
 */

import { useCallback, useMemo, useState } from 'react'
import { Check, PenLine, Trash2 } from 'lucide-react'

import { Button, Card, EmptyState, ErrorNote, StatusPill } from '@/components/ui'
import { MOOD_CHOICES, moodDefinition } from '@/domain/moods'
import type { JournalEntry, JournalInput, Mood } from '@/domain/types'

export interface JournalViewProps {
  entries: readonly JournalEntry[]
  today: string
  onSave: (input: JournalInput) => Promise<void>
  onDelete: (id: string) => Promise<void>
}

export function JournalView({ entries, today, onSave, onDelete }: JournalViewProps) {
  const existingToday = useMemo(
    () => entries.find((entry) => entry.date === today) ?? null,
    [entries, today],
  )
  const past = entries.filter((entry) => entry.date !== today)
  const [error, setError] = useState<string | null>(null)

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await onDelete(id)
        setError(null)
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : 'Could not delete the entry.')
      }
    },
    [onDelete],
  )

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">Journal</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          A few lines about today. Optional mood, no word count, nothing shared.
        </p>
      </header>

      {/*
        Keyed by the date, not the entry id. Saving creates an id, and keying on it
        would remount the form mid-save and throw away the confirmation the person
        just earned.
      */}
      <JournalForm
        key={`journal-${today}`}
        existing={existingToday}
        today={today}
        onSave={onSave}
      />

      {error && <ErrorNote message={error} onDismiss={() => setError(null)} />}

      <section className="space-y-3">
        <h2 className="text-sm font-bold text-lavender-700">Earlier entries</h2>
        {past.length === 0 ? (
          <EmptyState
            title="Nothing earlier yet"
            detail="Entries you write on previous days will collect here, newest first."
          />
        ) : (
          <ul className="space-y-2.5">
            {past.map((entry) => (
              <li key={entry.id}>
                <Card className="space-y-1.5 !p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-lavender-800">
                        {entry.title}
                      </p>
                      <p className="text-[0.625rem] text-lavender-600">
                        {entry.date}
                        {entry.mood && ` · ${moodDefinition(entry.mood).label}`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleDelete(entry.id)}
                      aria-label={`Delete the entry from ${entry.date}`}
                      className="inline-flex min-h-11 min-w-11 shrink-0 items-center justify-center rounded-full text-lavender-600 transition-colors hover:bg-rose-soft hover:text-rose-deep"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  </div>
                  <p className="whitespace-pre-line text-xs leading-relaxed text-lavender-700">
                    {entry.body}
                  </p>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

interface JournalFormProps {
  existing: JournalEntry | null
  today: string
  onSave: (input: JournalInput) => Promise<void>
}

function JournalForm({ existing, today, onSave }: JournalFormProps) {
  const [title, setTitle] = useState(existing?.title ?? '')
  const [body, setBody] = useState(existing?.body ?? '')
  const [mood, setMood] = useState<Mood | undefined>(existing?.mood)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const handleSave = useCallback(async () => {
    setSaving(true)
    setError(null)
    try {
      await onSave({ title, body, mood, date: today })
      setSaved(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this entry.')
    } finally {
      setSaving(false)
    }
  }, [body, mood, onSave, title, today])

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-bold text-lavender-700">
          {existing ? "Today's entry" : 'Write today'}
        </h2>
        <StatusPill tone={existing ? 'success' : 'neutral'}>{today}</StatusPill>
      </div>

      <label htmlFor="journal-title" className="sr-only">
        Title
      </label>
      <input
        id="journal-title"
        value={title}
        onChange={(event) => {
          setTitle(event.target.value)
          setSaved(false)
        }}
        placeholder="A title, if one comes to mind"
        maxLength={120}
        className="w-full rounded-xl border border-purple-300 bg-white/90 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
      />

      <label htmlFor="journal-body" className="sr-only">
        Entry
      </label>
      <textarea
        id="journal-body"
        value={body}
        onChange={(event) => {
          setBody(event.target.value)
          setSaved(false)
        }}
        rows={5}
        maxLength={4000}
        placeholder="What you noticed, what helped, what you would like tomorrow to hold."
        className="w-full resize-none rounded-xl border border-purple-300 bg-white/90 px-4 py-3 leading-relaxed text-slate-800 placeholder:text-slate-400 focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-200"
      />

      <div className="space-y-1.5">
        <p className="text-xs font-semibold text-lavender-700">Mood (optional)</p>
        <div className="flex flex-wrap gap-1.5">
          {MOOD_CHOICES.slice(0, 10).map((choice) => {
            const selected = mood === choice.mood
            return (
              <button
                key={choice.mood}
                type="button"
                aria-pressed={selected}
                onClick={() => setMood(selected ? undefined : choice.mood)}
                className={
                  selected
                    ? 'min-h-11 rounded-full border-2 border-sunflower-500 bg-sunflower-300/60 px-3 text-xs font-bold text-sunflower-800'
                    : 'min-h-11 rounded-full border border-purple-200 bg-white/70 px-3 text-xs font-medium text-lavender-700 transition-colors hover:bg-white'
                }
              >
                {choice.label}
              </button>
            )
          })}
        </div>
      </div>

      {error && <ErrorNote message={error} onDismiss={() => setError(null)} />}

      <Button
        fullWidth
        loading={saving}
        onClick={() => void handleSave()}
        icon={
          saved ? (
            <Check className="h-4 w-4" aria-hidden="true" />
          ) : (
            <PenLine className="h-4 w-4" aria-hidden="true" />
          )
        }
      >
        {existing ? 'Update the entry' : 'Save the entry'}
      </Button>
      {saved && (
        <p role="status" className="text-center text-[0.6875rem] text-lavender-600">
          Saved.
        </p>
      )}
    </Card>
  )
}
