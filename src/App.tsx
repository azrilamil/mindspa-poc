import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { CHECK_IN_QUESTIONS, SESSION_PROMPTS, SESSION_SECONDS } from './data/prompts'
import {
  addEntry,
  averageAnswers,
  loadEntries,
  resetDemoData,
  type CheckInAnswers,
  type ProgressEntry,
} from './storage'

type Page = 'home' | 'check-in' | 'session' | 'progress'

const PAGES: { id: Page; label: string; path: string }[] = [
  { id: 'home', label: 'Home', path: '#/' },
  { id: 'check-in', label: 'Check-in', path: '#/check-in' },
  { id: 'session', label: 'Session', path: '#/session' },
  { id: 'progress', label: 'Progress', path: '#/progress' },
]

function pageFromHash(hash: string): Page {
  const path = hash.replace(/^#/, '') || '/'
  if (path.startsWith('/check-in')) return 'check-in'
  if (path.startsWith('/session')) return 'session'
  if (path.startsWith('/progress')) return 'progress'
  return 'home'
}

function formatWhen(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatTimer(total: number): string {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function DemoBanner() {
  return (
    <div className="banner" role="note">
      Demo with synthetic data, not a medical tool.
    </div>
  )
}

function Layout({
  page,
  children,
}: {
  page: Page
  children: ReactNode
}) {
  return (
    <>
      <DemoBanner />
      <div className="shell">
        <header className="topbar">
          <a className="brand" href="#/" aria-label="MindSpa POC home">
            <img className="brand-mark" src="/favicon.svg" alt="" />
            <div>
              <h1>MindSpa POC</h1>
              <p>Portfolio demonstration</p>
            </div>
          </a>
          <nav aria-label="Main">
            {PAGES.map((item) => (
              <a
                key={item.id}
                href={item.path}
                className={item.id === page ? 'active' : undefined}
              >
                {item.label}
              </a>
            ))}
          </nav>
        </header>
        {children}
        <footer className="footer">
          <p>
            Built by Mohd Azril Amil as a public portfolio demo.{' '}
            <a href="https://github.com/azrilamil/mindspa-poc">Source on GitHub</a>.
          </p>
        </footer>
      </div>
    </>
  )
}

function Home() {
  return (
    <>
      <section className="hero">
        <h2>A mindfulness research app, rebuilt as a clean proof of concept.</h2>
        <p className="lede">
          MindSpa POC is an English-only portfolio demo. It shows the engineering behind
          a wellbeing check-in and a short guided session, using fake data stored only
          in your browser.
        </p>
        <p className="muted">
          This is not a medical product, it does not give health advice, and it is not
          affiliated with any clinic, university, or other institution. Prompts on this
          site were written fresh for the demonstration.
        </p>
        <div className="actions">
          <a className="btn" href="#/check-in">
            Start a check-in
          </a>
          <a className="btn-secondary" href="#/session">
            Try a session
          </a>
          <a className="btn-secondary" href="#/progress">
            View progress
          </a>
        </div>
      </section>
      <div className="grid">
        <div className="stat">
          <strong>Local only</strong>
          <span className="muted">No accounts and no backend. Data stays in this browser.</span>
        </div>
        <div className="stat">
          <strong>Original prompts</strong>
          <span className="muted">Generic wellbeing questions written for this demo.</span>
        </div>
        <div className="stat">
          <strong>Tested and packaged</strong>
          <span className="muted">Vitest, lint, Docker, and GitHub Actions CI.</span>
        </div>
      </div>
    </>
  )
}

function CheckIn({ onSaved }: { onSaved: (entries: ProgressEntry[]) => void }) {
  const [answers, setAnswers] = useState<CheckInAnswers>({})
  const [done, setDone] = useState(false)
  const complete = CHECK_IN_QUESTIONS.every((q) => typeof answers[q.id] === 'number')

  function submit() {
    if (!complete) return
    const average = averageAnswers(answers)
    onSaved(
      addEntry({
        kind: 'check-in',
        at: new Date().toISOString(),
        answers: { ...answers },
        average,
      }),
    )
    setDone(true)
  }

  if (done) {
    return (
      <section className="card">
        <h2>Check-in saved</h2>
        <p>
          Your answers are stored only in this browser, alongside the synthetic sample
          history. Nothing is sent to a server.
        </p>
        <p className="muted">Average of your four ratings: {averageAnswers(answers)}</p>
        <div className="actions">
          <a className="btn" href="#/progress">
            See progress
          </a>
          <button
            className="btn-secondary"
            type="button"
            onClick={() => {
              setAnswers({})
              setDone(false)
            }}
          >
            Start another
          </button>
        </div>
      </section>
    )
  }

  return (
    <section className="card">
      <h2>Wellbeing check-in</h2>
      <p className="muted">
        Four short ratings, from 1 to 5. These prompts are original and generic. They
        are not a clinical scale.
      </p>
      {CHECK_IN_QUESTIONS.map((q) => (
        <div className="question" key={q.id}>
          <p id={`${q.id}-label`}>{q.prompt}</p>
          <div className="scale" role="radiogroup" aria-labelledby={`${q.id}-label`}>
            {[1, 2, 3, 4, 5].map((n) => (
              <button
                key={n}
                type="button"
                role="radio"
                aria-checked={answers[q.id] === n}
                className={answers[q.id] === n ? 'selected' : undefined}
                onClick={() => setAnswers((prev) => ({ ...prev, [q.id]: n }))}
              >
                {n}
              </button>
            ))}
          </div>
          <div className="scale-labels">
            <span>{q.lowLabel}</span>
            <span>{q.highLabel}</span>
          </div>
        </div>
      ))}
      <button className="btn" type="button" disabled={!complete} onClick={submit}>
        Save check-in
      </button>
    </section>
  )
}

function Session({ onSaved }: { onSaved: (entries: ProgressEntry[]) => void }) {
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [remaining, setRemaining] = useState(SESSION_SECONDS)
  const [promptIndex, setPromptIndex] = useState(0)

  useEffect(() => {
    if (!running) return undefined
    const tick = window.setInterval(() => {
      setRemaining((r) => {
        if (r <= 1) {
          window.clearInterval(tick)
          setRunning(false)
          setDone(true)
          onSaved(
            addEntry({
              kind: 'session',
              at: new Date().toISOString(),
              durationSeconds: SESSION_SECONDS,
            }),
          )
          return 0
        }
        return r - 1
      })
    }, 1000)
    const rotate = window.setInterval(() => {
      setPromptIndex((i) => (i + 1) % SESSION_PROMPTS.length)
    }, 15000)
    return () => {
      window.clearInterval(tick)
      window.clearInterval(rotate)
    }
  }, [running, onSaved])

  function start() {
    setRemaining(SESSION_SECONDS)
    setPromptIndex(0)
    setDone(false)
    setRunning(true)
  }

  return (
    <section className="card session-stage">
      <h2>Guided session</h2>
      <p className="muted">
        A two-minute breathing pause with rotating prompts. Nothing is recorded except
        that a session was completed, and only in this browser.
      </p>
      <p className="timer" aria-live="polite">
        <span className="sr-only">Time remaining </span>
        {formatTimer(remaining)}
      </p>
      <p className="prompt">{SESSION_PROMPTS[promptIndex]}</p>
      {done ? (
        <>
          <p>Session complete. Well done for taking the two minutes.</p>
          <div className="actions" style={{ justifyContent: 'center' }}>
            <a className="btn" href="#/progress">
              See progress
            </a>
            <button className="btn-secondary" type="button" onClick={start}>
              Start again
            </button>
          </div>
        </>
      ) : (
        <div className="actions" style={{ justifyContent: 'center' }}>
          {!running ? (
            <button className="btn" type="button" onClick={start}>
              Begin session
            </button>
          ) : (
            <button
              className="btn-secondary"
              type="button"
              onClick={() => {
                setRunning(false)
                setRemaining(SESSION_SECONDS)
              }}
            >
              Stop
            </button>
          )}
        </div>
      )}
    </section>
  )
}

function ProgressView({
  entries,
  onReset,
}: {
  entries: ProgressEntry[]
  onReset: () => void
}) {
  const checkIns = entries.filter((e) => e.kind === 'check-in')
  const sessions = entries.filter((e) => e.kind === 'session')
  const latestAverage = checkIns.find((e) => typeof e.average === 'number')?.average

  return (
    <>
      <section className="card">
        <h2>Progress</h2>
        <p className="muted">
          Sample history is synthetic. New entries you add stay in this browser only.
        </p>
        <div className="grid">
          <div className="stat">
            <strong>{checkIns.length}</strong>
            <span className="muted">Check-ins</span>
          </div>
          <div className="stat">
            <strong>{sessions.length}</strong>
            <span className="muted">Sessions</span>
          </div>
          <div className="stat">
            <strong>{latestAverage ?? 'n/a'}</strong>
            <span className="muted">Latest check-in average</span>
          </div>
        </div>
        <div className="actions">
          <button className="btn-secondary" type="button" onClick={onReset}>
            Reset to sample data
          </button>
        </div>
      </section>
      <section className="card">
        <h2>History</h2>
        {entries.length === 0 ? (
          <p className="muted">No entries yet.</p>
        ) : (
          <ul className="list">
            {entries.map((e) => (
              <li key={e.id}>
                <span className="tag">{e.kind === 'check-in' ? 'Check-in' : 'Session'}</span>
                <span>
                  {e.kind === 'check-in'
                    ? `Average ${e.average ?? 'n/a'}`
                    : `${e.durationSeconds ?? 0} seconds`}
                  {e.synthetic ? ' (sample)' : ''}
                </span>
                <span className="muted">{formatWhen(e.at)}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}

export default function App() {
  const [page, setPage] = useState<Page>(() =>
    typeof window === 'undefined' ? 'home' : pageFromHash(window.location.hash),
  )
  const [entries, setEntries] = useState<ProgressEntry[]>(() => loadEntries())

  useEffect(() => {
    const onHash = () => setPage(pageFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const body = useMemo(() => {
    if (page === 'check-in') return <CheckIn onSaved={setEntries} />
    if (page === 'session') return <Session onSaved={setEntries} />
    if (page === 'progress') {
      return (
        <ProgressView
          entries={entries}
          onReset={() => setEntries(resetDemoData())}
        />
      )
    }
    return <Home />
  }, [page, entries])

  return <Layout page={page}>{body}</Layout>
}
