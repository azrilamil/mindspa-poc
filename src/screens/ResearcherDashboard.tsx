/**
 * The researcher dashboard.
 *
 * Charts and tables over a synthetic cohort, read live from the data layer. Two
 * rules shaped it:
 *
 * - It never touches the visitor's own session. The aggregate comes from a
 *   separate generated cohort, so there is no path by which a demo tap could land
 *   in a chart.
 * - The synthetic label is part of the layout rather than a footnote, because a
 *   chart that looks like findings has to say what it is on the same screen.
 */

import { useEffect, useMemo, useState } from 'react'
import { Activity, BarChart3, Users } from 'lucide-react'

import { Card, EmptyState, ErrorNote, StatusPill } from '@/components/ui'
import { formatMinutes } from '@/domain/progress'
import type { ResearcherSnapshot } from '@/domain/types'

export interface ResearcherDashboardProps {
  load: () => Promise<ResearcherSnapshot>
  onBack: () => void
}

type SortKey = 'participant' | 'day' | 'checkIns' | 'sessions' | 'minutes' | 'streak'

export function ResearcherDashboard({ load, onBack }: ResearcherDashboardProps) {
  const [snapshot, setSnapshot] = useState<ResearcherSnapshot | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [sortKey, setSortKey] = useState<SortKey>('adherence' as SortKey)
  const [sortAsc, setSortAsc] = useState(false)

  useEffect(() => {
    let cancelled = false
    void load().then(
      (data) => {
        if (!cancelled) setSnapshot(data)
      },
      (cause: unknown) => {
        if (!cancelled) {
          setError(cause instanceof Error ? cause.message : 'Could not load the data.')
        }
      },
    )
    return () => {
      cancelled = true
    }
  }, [load])

  const rows = useMemo(() => {
    if (!snapshot) return []
    const copy = [...snapshot.rows]
    copy.sort((a, b) => {
      const left = a[sortKey as keyof typeof a]
      const right = b[sortKey as keyof typeof b]
      if (typeof left === 'string' && typeof right === 'string') {
        return sortAsc ? left.localeCompare(right) : right.localeCompare(left)
      }
      return sortAsc
        ? Number(left) - Number(right)
        : Number(right) - Number(left)
    })
    return copy
  }, [snapshot, sortAsc, sortKey])

  const peak = snapshot
    ? Math.max(1, ...snapshot.daily.map((entry) => entry.checkIns))
    : 1

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="text-lg font-bold text-lavender-700">Researcher demo</h1>
          <p className="text-xs leading-relaxed text-lavender-600">
            Aggregate view of a generated cohort, updated live from the data layer.
          </p>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="inline-flex min-h-11 shrink-0 items-center rounded-full bg-white/80 px-4 text-xs font-semibold text-lavender-700 shadow-2xs"
        >
          Back to the app
        </button>
      </header>

      <StatusPill tone="warning">
        Synthetic demo data. Not a study result.
      </StatusPill>

      {error && <ErrorNote message={error} />}

      {!snapshot ? (
        <EmptyState
          title="Loading the cohort"
          detail="The synthetic cohort is generated on this device from a fixed seed."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2.5">
            <SummaryCard
              Icon={Users}
              label="Sessions"
              value={`${snapshot.totals.participants}`}
              detail="synthetic demo sessions"
            />
            <SummaryCard
              Icon={Activity}
              label="Check-ins"
              value={`${snapshot.totals.checkIns}`}
              detail={`${snapshot.totals.sessions} practices`}
            />
            <SummaryCard
              Icon={BarChart3}
              label="Practice time"
              value={formatMinutes(snapshot.totals.minutes)}
              detail="across the cohort"
            />
            <SummaryCard
              Icon={Activity}
              label="Mean adherence"
              value={`${snapshot.totals.averageAdherence}%`}
              detail="of elapsed days"
            />
          </div>

          <Card className="space-y-3">
            <h2 className="text-sm font-bold text-lavender-700">
              Check-ins per day
            </h2>
            <ul className="flex h-24 items-end gap-0.5" aria-label="Check-ins per day">
              {snapshot.daily.map((entry) => (
                <li key={entry.date} className="flex-1">
                  <span
                    title={`${entry.date}: ${entry.checkIns} check-ins`}
                    aria-hidden="true"
                    className="block w-full rounded-t-sm bg-lavender-400"
                    style={{ height: `${Math.max(2, (entry.checkIns / peak) * 96)}px` }}
                  />
                </li>
              ))}
            </ul>
            <p className="text-[0.6875rem] leading-relaxed text-lavender-600">
              {snapshot.daily[0]?.date} to {snapshot.daily.at(-1)?.date ?? 'today'}. Peak
              day {peak} check-ins.
            </p>
          </Card>

          <Card className="space-y-2 !p-0">
            <div className="flex items-center justify-between gap-2 p-4 pb-2">
              <h2 className="text-sm font-bold text-lavender-700">Session table</h2>
              <span className="text-[0.625rem] text-lavender-600">
                Generated {snapshot.generatedAt.slice(0, 10)}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <caption className="sr-only">
                  Synthetic demo sessions with adherence and practice totals
                </caption>
                <thead>
                  <tr className="border-b border-lavender-200 text-[0.625rem] uppercase tracking-wide text-lavender-600">
                    {(
                      [
                        ['participant', 'Session'],
                        ['day', 'Day'],
                        ['checkIns', 'Checks'],
                        ['sessions', 'Practices'],
                        ['minutes', 'Minutes'],
                        ['streak', 'Streak'],
                      ] as const
                    ).map(([key, label]) => (
                      <th key={key} scope="col" className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => {
                            if (sortKey === key) setSortAsc((asc) => !asc)
                            else {
                              setSortKey(key)
                              setSortAsc(false)
                            }
                          }}
                          className="inline-flex min-h-11 items-center gap-1 font-semibold text-lavender-700"
                        >
                          {label}
                          {sortKey === key && (
                            <span aria-hidden="true">{sortAsc ? '↑' : '↓'}</span>
                          )}
                        </button>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr
                      key={row.participant}
                      className="border-b border-lavender-100 last:border-0"
                    >
                      <th
                        scope="row"
                        className="px-3 py-2 font-semibold text-lavender-800"
                      >
                        {row.participant}
                      </th>
                      <td className="px-3 py-2 tabular-nums text-lavender-700">
                        {row.day}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-lavender-700">
                        {row.checkIns}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-lavender-700">
                        {row.sessions}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-lavender-700">
                        {row.minutes}
                      </td>
                      <td className="px-3 py-2 tabular-nums text-lavender-700">
                        {row.streak}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          <p className="text-center text-[0.625rem] leading-relaxed text-lavender-600">
            Generated on this device from a fixed seed. No participant was ever
            recruited and no personal data is present.
          </p>
        </>
      )}
    </div>
  )
}

function SummaryCard({
  Icon,
  label,
  value,
  detail,
}: {
  Icon: typeof Users
  label: string
  value: string
  detail: string
}) {
  return (
    <div className="card-spa flex flex-col gap-0.5 p-3">
      <Icon className="h-4 w-4 text-lavender-600" aria-hidden="true" />
      <span className="mt-1 text-base font-bold tabular-nums text-lavender-800">
        {value}
      </span>
      <span className="text-[0.625rem] font-medium uppercase tracking-wide text-lavender-600">
        {label}
      </span>
      <span className="text-[0.625rem] text-lavender-600">{detail}</span>
    </div>
  )
}
