import { useEffect, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Sparkles, Square, Swords, Trash2 } from 'lucide-react'
import type { Glitch } from '#/lib/glitch'
import { isSimulatedGlitch } from '#/lib/desync-simulator'
import { clearSimulation, resyncSimulatedGlitch, simulateGlitch } from '#/lib/simulator.functions'

/** Glitches per wave: six LEAKED glitches take a calm realm all the way to Desync. */
const WAVE_SIZE = 6
const ARRIVAL_MS = 1200
/** Long enough for the d20 to finish rolling between two fixes. */
const RESYNC_MS = 1500

type Mode = 'idle' | 'wave' | 'resync' | 'clearing'

/**
 * Commander-only demo control: plays a Desync attack so the meter, the glitching
 * UI and the realm react live, then resyncs it glitch by glitch.
 */
export function DesyncSimulator({ glitches }: { glitches: Pick<Glitch, 'glitchId' | 'status'>[] }) {
  const router = useRouter()
  const simulate = useServerFn(simulateGlitch)
  const resync = useServerFn(resyncSimulatedGlitch)
  const clear = useServerFn(clearSimulation)
  const [mode, setMode] = useState<Mode>('idle')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const stopped = useRef(false)

  useEffect(() => () => { stopped.current = true }, [])

  const simulatedIds = glitches.filter((glitch) => isSimulatedGlitch(glitch.glitchId))
  const openCount = simulatedIds.filter((glitch) => glitch.status !== 'FIXED').length
  const busy = mode !== 'idle'

  /** Runs a sequence of server steps with a pause between them, stopping on error or Stop. */
  async function run(nextMode: Mode, step: (index: number) => Promise<boolean>, pauseMs: number) {
    stopped.current = false
    setMode(nextMode)
    setError('')
    try {
      for (let index = 0; !stopped.current; index++) {
        const more = await step(index)
        await router.invalidate()
        if (!more || stopped.current) break
        await new Promise((resolve) => setTimeout(resolve, pauseMs))
      }
    } catch {
      setError('De simulator kon niet verder. Vernieuw de pagina en probeer het opnieuw.')
    } finally {
      setMode('idle')
    }
  }

  function startWave() {
    void run('wave', async (index) => {
      const result = await simulate()
      if (!result.success) { setError(result.error); return false }
      setStatus(`Glitch ${index + 1} van ${WAVE_SIZE} is binnengekomen.`)
      return index + 1 < WAVE_SIZE
    }, ARRIVAL_MS)
  }

  function startResync() {
    void run('resync', async () => {
      const result = await resync()
      if (!result.success) { setError(result.error); return false }
      setStatus(result.remaining ? `${result.glitchId} hersteld. Nog ${result.remaining} open.` : 'Alle gesimuleerde glitches zijn hersteld.')
      return result.remaining > 0
    }, RESYNC_MS)
  }

  function clearAll() {
    void run('clearing', async () => {
      const result = await clear()
      if (!result.success) { setError(result.error); return false }
      setStatus(`${result.removed} gesimuleerde ${result.removed === 1 ? 'glitch' : 'glitches'} opgeruimd.`)
      return false
    }, 0)
  }

  function stop() {
    stopped.current = true
    setStatus('Simulatie gestopt.')
  }

  return (
    // A compact panel in the map HUD, so the commander watches the world react while it runs.
    <section aria-labelledby="simulator-title" className="realm-hud-panel hud-sim">
      <h2 id="simulator-title">Desync-simulator</h2>
      <div className="hud-sim-actions">
        {busy && mode !== 'clearing' ? (
          <button type="button" onClick={stop} className="hud-sim-button" title="Stop">
            <Square aria-hidden="true" fill="currentColor" /> <span className="hud-sim-label">Stop</span>
          </button>
        ) : (
          <>
            <button type="button" onClick={startWave} disabled={busy} className="hud-sim-button" data-primary title="Desync-golf">
              <Swords aria-hidden="true" /> <span className="hud-sim-label">Desync-golf</span>
            </button>
            <button type="button" onClick={startResync} disabled={busy || openCount === 0} className="hud-sim-button" title="Resync">
              <Sparkles aria-hidden="true" /> <span className="hud-sim-label">Resync</span>
            </button>
          </>
        )}
        <button type="button" onClick={clearAll} disabled={busy || simulatedIds.length === 0} className="hud-sim-button"
          aria-label="Simulatie opruimen" title="Simulatie opruimen">
          <Trash2 aria-hidden="true" />
        </button>
      </div>
      <p className="hud-sim-note">
        {simulatedIds.length === 0 ? 'Geen gesimuleerde glitches.' : `${simulatedIds.length} gesimuleerd, ${openCount} open.`}
      </p>
      <p role="status" className="hud-sim-note">{status}</p>
      {error ? <p role="alert" className="hud-sim-error">{error}</p> : null}
    </section>
  )
}
