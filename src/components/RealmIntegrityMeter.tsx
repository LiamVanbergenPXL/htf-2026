import { useEffect, useRef, useState } from 'react'
import { D20 } from '#/components/ui/D20'
import type { Glitch } from '#/lib/glitch'
import { calculateRealmIntegrity, type RealmLevel } from '#/lib/realm-integrity'

// The Desync is magic gone wrong, so its level uses the arcane violet.
const levelCopy: Record<RealmLevel, { label: string; fill: string; face: string }> = {
  STABLE: { label: 'Stabiel', fill: 'bg-[#81c58e]', face: 'fill-[#81c58e]/30' },
  WAVERING: { label: 'Haperend', fill: 'bg-[#e0b361]', face: 'fill-[#e0b361]/30' },
  CRITICAL: { label: 'Kritiek', fill: 'bg-[#f27857]', face: 'fill-[#f27857]/30' },
  DESYNC: { label: 'Desync', fill: 'bg-[#c397ff]', face: 'fill-[#c397ff]/30' },
}

/** How long the resync roll plays after the integrity goes up. */
const RESYNC_MS = 1400

export function RealmIntegrityMeter({ glitches }: { glitches: Pick<Glitch, 'status'>[] }) {
  const { integrity, level, openCount } = calculateRealmIntegrity(glitches)
  const copy = levelCopy[level]
  const resyncing = useResyncFlash(integrity)

  return (
    <section className="realm-hud-panel realm-meter" aria-labelledby="realm-integrity-title"
      data-intensity={level} data-resync={resyncing || undefined}>
      <D20 className="d20-die realm-hud-die" faceClassName={copy.face} />
      <div className="realm-hud-content">
        <h2 id="realm-integrity-title">Realm Integrity</h2>
        <p><strong>{integrity}%</strong> · {resyncing ? 'Resync…' : copy.label}</p>
        <div className="realm-hud-track" role="meter" aria-valuemin={0} aria-valuemax={100}
          aria-valuenow={integrity} aria-labelledby="realm-integrity-title" aria-valuetext={`${integrity} van 100 – ${copy.label}`}>
          <div className={`realm-hp h-full ${copy.fill}`} style={{ width: `${integrity}%` }} />
        </div>
        <p className="realm-hud-open">{openCount} open {openCount === 1 ? 'glitch' : 'glitches'}</p>
      </div>
    </section>
  )
}

/** True for a moment whenever the integrity rises, e.g. after a glitch is fixed. */
function useResyncFlash(integrity: number) {
  const previous = useRef(integrity)
  const [active, setActive] = useState(false)

  useEffect(() => {
    const rose = integrity > previous.current
    previous.current = integrity
    if (!rose) return
    setActive(true)
    const timer = setTimeout(() => setActive(false), RESYNC_MS)
    return () => clearTimeout(timer)
  }, [integrity])

  return active
}
