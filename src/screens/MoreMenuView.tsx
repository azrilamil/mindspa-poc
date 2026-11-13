/**
 * The More menu.
 *
 * Secondary destinations, the demo reset, the data mode, and the version. The
 * reset control is deliberately visible rather than hidden in a debug build: a
 * reviewer wants to start from a known state, and a demo that accumulates stray
 * writes is a demo that stops being readable.
 */

import { useState } from 'react'
import {
  Check,
  Database,
  ExternalLink,
  FlaskConical,
  Info,
  RotateCcw,
  Server,
} from 'lucide-react'

import { Button, Card, StatusPill } from '@/components/ui'
import { APP_VERSION, BUILD_LABEL } from '@/version'
import type { PwaUpdate } from '@/app/hooks'

export interface MoreMenuViewProps {
  dataMode: 'local' | 'convex'
  onResetDemo: () => Promise<void>
  onOpenAdmin: () => void
  update: PwaUpdate
}

export function MoreMenuView({
  dataMode,
  onResetDemo,
  onOpenAdmin,
  update,
}: MoreMenuViewProps) {
  const [resetting, setResetting] = useState(false)
  const [resetDone, setResetDone] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleReset = async () => {
    setResetting(true)
    setError(null)
    setResetDone(false)
    try {
      await onResetDemo()
      setResetDone(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not reset the demo.')
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4 px-5 py-6">
      <header className="space-y-1">
        <h2 className="text-lg font-bold text-lavender-700">More</h2>
        <p className="text-xs leading-relaxed text-lavender-600">
          How this build is put together, and how to start over.
        </p>
      </header>

      <Card className="space-y-3">
        <div className="flex items-center gap-2">
          <Info className="h-4 w-4 text-lavender-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-lavender-700">About this demo</h2>
        </div>
        <p className="text-xs leading-relaxed text-lavender-600">
          MindSpa POC is a portfolio build of a mindfulness and wellbeing app. Every
          row you see is synthetic or generated from your own demo taps. It is not a
          clinical study and it is not a medical tool.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusPill tone="neutral">Version {APP_VERSION}</StatusPill>
          <StatusPill tone="neutral">Build {BUILD_LABEL}</StatusPill>
          <StatusPill tone="success">
            <Check className="h-3 w-3" aria-hidden="true" />
            Synthetic data
          </StatusPill>
        </div>
      </Card>

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-lavender-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-lavender-700">Data layer</h2>
        </div>
        <p className="text-xs leading-relaxed text-lavender-600">
          {dataMode === 'convex'
            ? 'Reading from the dedicated demo deployment. Every mutation is rate limited per session.'
            : 'Running on the local adapter with synthetic seed data. Set VITE_CONVEX_URL to use the demo deployment.'}
        </p>
        <StatusPill tone={dataMode === 'convex' ? 'success' : 'warning'}>
          <Server className="h-3 w-3" aria-hidden="true" />
          {dataMode === 'convex' ? 'Convex demo deployment' : 'Local storage adapter'}
        </StatusPill>
      </Card>

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2">
          <RotateCcw className="h-4 w-4 text-lavender-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-lavender-700">Start the demo over</h2>
        </div>
        <p className="text-xs leading-relaxed text-lavender-600">
          Wipes everything this session wrote and reseeds the synthetic baseline.
        </p>
        <Button
          variant="secondary"
          fullWidth
          loading={resetting}
          onClick={() => void handleReset()}
        >
          Reset the demo data
        </Button>
        {resetDone && (
          <p role="status" className="text-center text-[0.6875rem] text-emerald-700">
            Reset complete.
          </p>
        )}
        {error && (
          <p role="alert" className="text-center text-[0.6875rem] text-rose-deep">
            {error}
          </p>
        )}
      </Card>

      <Card className="space-y-2.5">
        <div className="flex items-center gap-2">
          <FlaskConical className="h-4 w-4 text-lavender-700" aria-hidden="true" />
          <h2 className="text-sm font-bold text-lavender-700">Researcher view</h2>
        </div>
        <p className="text-xs leading-relaxed text-lavender-600">
          Charts and tables over a separate synthetic cohort. No real participant data
          exists in this build.
        </p>
        <Button variant="secondary" fullWidth onClick={onOpenAdmin}>
          Open the dashboard
          <ExternalLink className="h-4 w-4" aria-hidden="true" />
        </Button>
      </Card>

      {update.needRefresh && (
        <Card className="space-y-2 border border-sunflower-500">
          <p className="text-sm font-bold text-lavender-700">A new version is ready</p>
          <p className="text-xs leading-relaxed text-lavender-600">
            Reload to pick up the latest build. Your demo data stays on this device.
          </p>
          <Button fullWidth loading={update.updating} onClick={update.applyUpdate}>
            Reload and update
          </Button>
        </Card>
      )}

      <p className="mt-auto pt-2 text-center text-[0.625rem] leading-relaxed text-lavender-600">
        Designed and led by Mohd Azril Amil, with AI assisted development.
      </p>
    </div>
  )
}
