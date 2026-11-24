import { useEffect, useRef, useState } from 'react'
import { D20 } from '#/components/ui/D20'
import { GLITCH_STATUSES, type Glitch, type GlitchStatus } from '#/lib/glitch'
import { calculateRealmIntegrity, type RealmLevel } from '#/lib/realm-integrity'

// The Desync is magic gone wrong, so its level uses the arcane violet.
const levelCopy: Record<RealmLevel, { label: string; message: string; text: string; fill: string; face: string }> = {
  STABLE: { label: 'Stabiel', message: 'De magie stroomt zoals het hoort. Achrona is in sync.', text: 'text-[#3d6b45]', fill: 'bg-[#3d6b45]', face: 'fill-[#3d6b45]/20' },
  WAVERING: { label: 'Haperend', message: 'The Desync knaagt aan het weefsel van Achrona.', text: 'text-[#9a6418]', fill: 'bg-[#b8862b]', face: 'fill-[#b8862b]/25' },
  CRITICAL: { label: 'Kritiek', message: 'De magie hapert overal. Grijp nu in, Guardians.', text: 'text-accent', fill: 'bg-accent', face: 'fill-accent/20' },
  DESYNC: { label: 'Desync', message: 'Achrona valt uit sync. Alle Guardians naar hun post!', text: 'text-arcane', fill: 'bg-arcane', face: 'fill-arcane/25' },
}

const statusDot: Record<GlitchStatus, string> = {
  LEAKED: 'bg-[#b3261e]',
  ASSESSING: 'bg-[#b8862b]',
  CONTAINING: 'bg-[#2f5d8a]',
  FIXED: 'bg-[#3d6b45]',
}

/** How long the resync roll plays after the integrity goes up. */
const RESYNC_MS = 1400

export function RealmIntegrityMeter({ glitches }: { glitches: Pick<Glitch, 'status'>[] }) {
  const { integrity, level, openCount, counts } = calculateRealmIntegrity(glitches)
  const copy = levelCopy[level]
  const resyncing = useResyncFlash(integrity)

  return (
    <section aria-labelledby="realm-integrity-title" data-intensity={level} data-resync={resyncing || undefined}
      className="realm-meter stat-block flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start sm:gap-10">
      <div className="relative size-44 shrink-0" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={integrity}
        aria-valuetext={`${integrity} van 100 – ${copy.label}`} aria-labelledby="realm-integrity-title">
        <D20 className="d20-die size-full text-fg/85" faceClassName={copy.face} />
        {/* Positioned by the wrapper: .desync-glitch sets its own position for the split layers. */}
        {/* 51%: the centroid of the centre face (y ≈ 100.7 of 200), nudged for the digits' cap height. */}
        <span className="absolute top-[51%] left-1/2 -translate-x-1/2 -translate-y-1/2">
          <span className={`desync-glitch block ${integrity === 100 ? 'text-2xl' : 'text-3xl'} leading-none font-extrabold tabular-nums text-fg`} data-text={String(integrity)}>{integrity}</span>
        </span>
      </div>

      <div className="flex w-full min-w-0 flex-col gap-3 text-center sm:text-left">
        <h2 id="realm-integrity-title" className="tome-heading text-2xl">Realm Integrity</h2>
        <p className={`font-display text-4xl leading-none ${copy.text}`}>{resyncing ? 'Resync…' : copy.label}</p>
        <p className="read-aloud text-left text-fg">{copy.message}</p>

        <div>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-left font-sc text-sm text-muted">
            <span>Levenspunten van Achrona</span>
            <span className="font-bold tabular-nums text-fg">{integrity}/100</span>
          </div>
          <div className="h-3 overflow-hidden rounded-sm border border-[#a88a5c] bg-card-strong" aria-hidden="true">
            <div className={`realm-hp h-full ${copy.fill}`} style={{ width: `${integrity}%` }} />
          </div>
        </div>

        <ul className="flex flex-wrap justify-center gap-x-4 gap-y-1 text-sm sm:justify-start" aria-label="Glitches per status">
          {GLITCH_STATUSES.map((status) => (
            <li key={status} className="flex items-center gap-1.5">
              <span className={`size-2.5 rotate-45 ${statusDot[status]}`} aria-hidden="true" />
              <span className="font-sc text-muted">{status.toLowerCase()}</span>
              <span className="font-bold tabular-nums">{counts[status]}</span>
            </li>
          ))}
        </ul>
        <p className="text-sm italic text-muted">{openCount === 0 ? 'Geen open glitches.' : `${openCount} open ${openCount === 1 ? 'glitch' : 'glitches'}.`}</p>
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
