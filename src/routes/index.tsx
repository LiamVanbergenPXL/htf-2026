import {createFileRoute, redirect} from '@tanstack/react-router'
import {GlitchesTable} from '#/components/GlitchesTable.tsx'
import {getGlitches} from '#/lib/glitches.functions.ts'
import {ReportEchoForm} from '#/components/ReportEchoForm'
import {RealmIntegrityMeter} from '#/components/RealmIntegrityMeter'
import {DesyncSimulator} from '#/components/DesyncSimulator'
import {calculateRealmIntegrity, type RealmLevel} from '#/lib/realm-integrity'
import {useEffect, useRef, useState} from 'react'
import {X} from 'lucide-react'
import {AchronaMap} from '#/components/AchronaMap'
import {ACHRONA_BUILDINGS, type BuildingId} from '#/lib/achrona-map'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.guardian) throw redirect({ to: '/login' })
  },
  loader: () => getGlitches(),
  component: OverviewPage,
})

function OverviewPage() {
  const { glitches, defenders } = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()
  const { level } = calculateRealmIntegrity(glitches)
  const [building, setBuilding] = useState<BuildingId | null>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const roomTitle = useRef<HTMLHeadingElement>(null)
  const room = ACHRONA_BUILDINGS.find(({ id }) => id === building)
  const localGlitches = building ? glitches.filter(({ buildingId }) => buildingId === building) : []
  const [glitchLink, setGlitchLink] = useState<{ id: string; version: number } | null>(null)
  useRealmLevelOnPage(level)

  function openGlitch(id: string) {
    setBuilding('post')
    setGlitchLink((current) => ({ id, version: (current?.version ?? 0) + 1 }))
  }

  useEffect(() => {
    function openLinkedGlitch() {
      const hash = window.location.hash
      if (hash.startsWith('#glitch-')) openGlitch(hash.slice('#glitch-'.length))
    }
    openLinkedGlitch()
    window.addEventListener('hashchange', openLinkedGlitch)
    return () => window.removeEventListener('hashchange', openLinkedGlitch)
  }, [])

  useEffect(() => {
    const modal = dialog.current
    if (!modal) return
    if (!building) {
      if (modal.open) modal.close()
      return
    }
    if (!modal.open) modal.showModal()
    modal.scrollTop = 0
    roomTitle.current?.focus({ preventScroll: true })
  }, [building])

  useEffect(() => {
    if (!glitchLink || building !== 'post') return
    document.getElementById(`glitch-${glitchLink.id}`)?.scrollIntoView({ block: 'center' })
  }, [glitchLink, building])

  function visitBuilding(id: BuildingId) {
    setGlitchLink(null)
    setBuilding(id)
  }

  return (
    <>
      <AchronaMap glitches={glitches} level={level} paused={building !== null} onVisit={visitBuilding}
        integrityHud={
          <div className="world-hud-stack">
            <RealmIntegrityMeter glitches={glitches} />
            {guardian?.role === 'commander' ? <DesyncSimulator glitches={glitches} /> : null}
          </div>
        } />
      <dialog ref={dialog} className="world-dialog" aria-labelledby="world-room-title"
        onCancel={(event) => { event.preventDefault(); setBuilding(null) }}
        onClick={(event) => { if (event.target === event.currentTarget) setBuilding(null) }}>
        <div className="world-interior">
          <header className="world-room-header">
            {room && <div className="world-portrait" key={room.id}>
              <img src={`/images/achrona/${room.portrait}.webp`} alt="" />
            </div>}
            <div>
              <h2 id="world-room-title" ref={roomTitle} tabIndex={-1}>{room?.name}</h2>
              <p>{room?.action}</p>
            </div>
            <button type="button" className="world-close" onClick={() => setBuilding(null)} aria-label="Gebouw verlaten"><X /></button>
          </header>
          <div className="world-room-content">
            {localGlitches.length > 0 && (
              <details key={building} className="world-local-glitches">
                <summary>Glitches op deze locatie ({localGlitches.length})</summary>
                <ul>
                  {localGlitches.map((glitch) => (
                    <li key={glitch.glitchId}>
                      <button type="button" onClick={() => openGlitch(glitch.glitchId)}>
                        <strong>{glitch.status}</strong> · {glitch.description}
                      </button>
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {guardian && <ReportEchoForm role={guardian.role} onGlitch={openGlitch} room={building === 'gate' || building === 'oracle' ? building : null} />}
            <section hidden={building !== 'archive'} className="stat-block p-6">
              <a href="/reports/achrona.pdf" download className="tome-button inline-block px-4 py-2">Rapport opslaan als PDF</a>
            </section>
            <div hidden={building !== 'post'}>
              <GlitchesTable key={glitchLink?.version} defenders={defenders} defenderId={guardian?.role === 'defender' ? guardian.guardianId : undefined}
                glitches={glitches} canChangeStatus={guardian?.role === 'commander'} />
            </div>
          </div>
        </div>
      </dialog>
    </>
  )
}

/**
 * Puts the realm level on <html> so the whole UI (sidebar and screen overlay
 * included) can glitch along with the meter. Removed when leaving the page.
 */
function useRealmLevelOnPage(level: RealmLevel) {
  useEffect(() => {
    const root = document.documentElement
    root.dataset.realm = level
    return () => { delete root.dataset.realm }
  }, [level])
}
