import { Flame, Footprints, Gem, Scan, Swords } from 'lucide-react'
import { useEffect, useEffectEvent, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { ACHRONA_BUILDINGS, type BuildingId } from '#/lib/achrona-map'
import { drawAchrona, onIsland, PLAZA, SPAWN, type MapPoint } from '#/lib/achrona-scene'
import { seals, riftPosition, travelDistance } from '#/lib/achrona-adventure'
import type { createRealm } from '#/lib/achrona-3d'
import type { Glitch } from '#/lib/glitch'
import type { RealmLevel } from '#/lib/realm-integrity'

const directions: Record<string, [number, number]> = {
  arrowup: [0, -1], w: [0, -1], arrowdown: [0, 1], s: [0, 1],
  arrowleft: [-1, 0], a: [-1, 0], arrowright: [1, 0], d: [1, 0],
}
const door = ({ x, y }: MapPoint): MapPoint => ({ x, y: y + 2 })
const at = ({ x, y }: MapPoint) => ({ left: `${x}%`, top: `${y}%` })

export function AchronaMap({ glitches, level, paused, onVisit, integrityHud }: {
  glitches: Glitch[]
  level: RealmLevel
  paused: boolean
  onVisit: (id: BuildingId) => void
  integrityHud: ReactNode
}) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const stage = useRef<HTMLCanvasElement>(null)
  const markers = useRef<HTMLDivElement>(null)
  const realm = useRef<ReturnType<typeof createRealm> | null>(null)
  const [threeD, setThreeD] = useState(false)
  const [closeCamera, setCloseCamera] = useState(false)
  const heading = useRef(0)
  const lastDraw = useRef(0)
  const [quest, setQuest] = useState<'ready' | 'playing' | 'won'>('ready')
  const [sealIndex, setSealIndex] = useState(0)
  const [seconds, setSeconds] = useState(0)
  const [notice, setNotice] = useState('')
  const [best, setBest] = useState<number | null>(null)
  const clock = useRef(0)
  const objective = useRef(0)
  const running = useRef(false)
  const reducedMotion = useRef(false)
  const position = useRef(SPAWN)
  const keys = useRef(new Set<string>())
  const trip = useRef<{ id: BuildingId | null; stops: MapPoint[] } | null>(null)
  const [player, setPlayer] = useState(SPAWN)
  const [destination, setDestination] = useState<BuildingId | null>(null)
  const [facingLeft, setFacingLeft] = useState(false)
  const [walking, setWalking] = useState(false)
  const nearby = ACHRONA_BUILDINGS.find((building) => {
    const entrance = door(building)
    return Math.hypot(player.x - entrance.x, player.y - entrance.y) < 6
  })
  const unlocated = glitches.filter(({ buildingId, status }) => !buildingId && status !== 'FIXED').length

  useEffect(() => {
    const element = canvas.current
    const context = element?.getContext('2d')
    if (!element || !context) return
    const resize = () => {
      const { clientWidth: width, clientHeight: height } = element
      if (!width || !height) return
      const pixelRatio = Math.min(window.devicePixelRatio, 2)
      element.width = Math.round(width * pixelRatio)
      element.height = Math.round(height * pixelRatio)
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
      drawAchrona(context, width, height)
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    let cancelled = false
    const canvas = stage.current
    const motion = window.matchMedia('(prefers-reduced-motion: reduce)')
    function updateMotion() { reducedMotion.current = motion.matches }
    updateMotion()
    motion.addEventListener('change', updateMotion)
    try {
      const value = Number(localStorage.getItem('achrona-seal-trial-best-v1'))
      if (value > 0 && Number.isFinite(value)) setBest(value)
    } catch { /* Private browsing can disable storage. */ }
    if (canvas) {
      void import('#/lib/achrona-3d').then(({ createRealm }) => {
        if (cancelled) return
        realm.current = createRealm(canvas)
        setThreeD(true)
      }).catch(() => { /* The canvas map supports devices without WebGL. */ })
    }
    return () => {
      cancelled = true
      motion.removeEventListener('change', updateMotion)
      realm.current?.dispose()
      realm.current = null
    }
  }, [])

  function startQuest() {
    trip.current = null
    setDestination(null)
    position.current = SPAWN
    setPlayer(SPAWN)
    objective.current = 0
    running.current = true
    clock.current = 0
    setSealIndex(0)
    setSeconds(0)
    setQuest('playing')
    setNotice('')
  }

  const updateGame = useEffectEvent((elapsed: number, now: number, moving: boolean) => {
    const location = position.current
    if (running.current) {
      clock.current += elapsed
      const hazard = riftPosition(clock.current)
      if (travelDistance(location, hazard) < 2.4) {
        clock.current += 5
        position.current = SPAWN
        setPlayer(SPAWN)
        trip.current = null
        setDestination(null)
        setNotice('De schaduw trof je. Vijf strafseconden.')
      } else if (travelDistance(location, seals[objective.current]) < 2.1) {
        objective.current++
        if (objective.current === seals.length) {
          running.current = false
          setQuest('won')
          const result = Math.ceil(clock.current)
          if (!best || result < best) {
            setBest(result)
            try { localStorage.setItem('achrona-seal-trial-best-v1', String(result)) } catch { /* Session score remains available. */ }
          }
          setNotice('De bron is hersteld.')
        } else {
          setSealIndex(objective.current)
          setNotice('Zegel gevonden.')
        }
      }
      setSeconds(Math.ceil(clock.current))
    }

    if (!realm.current || now - lastDraw.current < 32) return
    lastDraw.current = now
    const active = new Set(glitches.filter(g => g.status !== 'FIXED' && g.buildingId).map(g => g.buildingId!))
    realm.current.frame(position.current, heading.current, moving, closeCamera, now / 1000,
      running.current ? seals[objective.current] : null, running.current ? riftPosition(clock.current) : null,
      active, reducedMotion.current)
    const anchors = markers.current?.querySelectorAll<HTMLElement>('[data-anchor]')
    anchors?.forEach(node => {
      const key = node.dataset.anchor
      const point = key === 'seal' ? seals[Math.min(objective.current, seals.length - 1)] :
        ACHRONA_BUILDINGS.find(b => b.id === key)
      if (!point) return
      const projected = realm.current!.project(point)
      node.style.left = projected.x + '%'
      node.style.top = projected.y + '%'
    })
  })

  const visit = useEffectEvent(onVisit)
  const enterNearby = useEffectEvent(() => {
    if (!nearby) return
    trip.current = null
    setDestination(null)
    setWalking(false)
    onVisit(nearby.id)
  })

  useEffect(() => {
    if (paused) return
    const held = keys.current
    let frame: number
    let previous = performance.now()

    function clearKeys() { held.clear() }
    function keyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return
      if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable]')) return
      const key = event.key.toLowerCase()
      if (key === 'e' && !event.repeat) enterNearby()
      if (key === 'shift') { held.add('shift'); return }
      if (!Object.hasOwn(directions, key)) return
      event.preventDefault()
      held.add(key)
      trip.current = null
      setDestination(null)
    }
    function keyUp(event: KeyboardEvent) { held.delete(event.key.toLowerCase()) }
    function tick(now: number) {
      const elapsed = Math.min((now - previous) / 1000, .035)
      previous = now
      const current = position.current
      const journey = trip.current
      const stop = journey?.stops[0]
      let dx = stop ? stop.x - current.x : 0
      let dy = stop ? stop.y - current.y : 0
      for (const key of held) {
        if (key === 'shift') continue
        dx += directions[key][0]
        dy += directions[key][1]
      }

      const distance = Math.hypot(dx, dy)
      const step = elapsed * (held.has('shift') ? 32 : 20)
      if (distance > .05) heading.current = Math.atan2(dx, dy)
      if (journey && stop && distance <= step) {
        position.current = stop
        setPlayer(stop)
        journey.stops.shift()
        if (!journey.stops.length) {
          trip.current = null
          setDestination(null)
          setWalking(false)
          if (journey.id) visit(journey.id)
        }
      } else if (distance && step) {
        const next = { x: current.x + dx / distance * step, y: current.y + dy / distance * step }
        if (journey || onIsland(next)) {
          position.current = next
          setPlayer(next)
          if (Math.abs(dx) > .05) setFacingLeft(dx < 0)
          setWalking(true)
        } else {
          setWalking(false)
        }
      } else {
        setWalking(false)
      }
      updateGame(elapsed, now, Boolean(distance))
      frame = requestAnimationFrame(tick)
    }

    window.addEventListener('keydown', keyDown)
    window.addEventListener('keyup', keyUp)
    window.addEventListener('blur', clearKeys)
    frame = requestAnimationFrame(tick)
    return () => {
      clearKeys()
      cancelAnimationFrame(frame)
      window.removeEventListener('keydown', keyDown)
      window.removeEventListener('keyup', keyUp)
      window.removeEventListener('blur', clearKeys)
    }
  }, [paused])

  function walkTo(building: typeof ACHRONA_BUILDINGS[number]) {
    keys.current.clear()
    if (nearby?.id === building.id) {
      trip.current = null
      setDestination(null)
      onVisit(building.id)
      return
    }
    trip.current = { id: building.id, stops: [PLAZA, door(building)] }
    setDestination(building.id)
  }

  return (
    <section className="achrona-world" data-3d={threeD || undefined} data-realm-level={level} aria-labelledby="achrona-map-title">
      <canvas className="world-terrain" ref={canvas} aria-hidden="true" />
      <canvas className="world-stage" ref={stage} aria-hidden="true" />
      <header className="world-title">
        <h1 id="achrona-map-title">Achrona</h1>
      </header>
      <div className="world-hud">{integrityHud}</div>
      <div className="world-locations" ref={markers}>
        {ACHRONA_BUILDINGS.map((building) => {
          const { id, name } = building
          const active = glitches.filter(({ buildingId, status }) => buildingId === id && status !== 'FIXED').length
          return (
            <button key={id} type="button" className="world-marker" data-anchor={id} data-building={id}
              data-nearby={nearby?.id === id || undefined} data-destination={destination === id || undefined}
              style={{ ...at(building), '--depth': Math.round(building.y) } as CSSProperties}
              aria-label={`${name}, ${active} ${active === 1 ? 'actieve glitch' : 'actieve glitches'}`}
              onClick={() => walkTo(building)}>
              {active > 0 && <span className="world-fire" aria-hidden="true"><Flame fill="currentColor" /><b>{active}</b></span>}
              <span className="world-marker-name">{name}</span>
            </button>
          )
        })}
        {quest === 'playing' && <>
          <button className="quest-target" data-anchor="seal" style={at(seals[sealIndex])}
            aria-label={`Loop naar ${seals[sealIndex].name}`} onClick={() => {
              keys.current.clear()
              setDestination(null)
              trip.current = { id: null, stops: [seals[sealIndex]] }
            }}><Gem size={17} /></button>
          {!threeD && <span aria-hidden="true" className="quest-shadow" style={at(riftPosition(clock.current))}>◆</span>}
        </>}
        <div className="world-player" data-walking={walking && !paused || undefined} data-left={facingLeft || undefined}
          style={{ ...at(player), zIndex: Math.round(player.y) + 1 }} aria-hidden="true">
          <span className="world-player-shadow" />
          <img src="/images/achrona/scout.webp" alt="" />
        </div>
      </div>
      <aside className="quest-panel" aria-label="Zegeltocht">
        <div className="quest-heading"><Swords size={18} /><h2>Zegeltocht</h2></div>
        {quest === 'playing' ? <>
          <p>{sealIndex < 3 ? `Zoek het ${seals[sealIndex].name.toLowerCase()}.` : 'Breng de zegels naar de bron.'}</p>
          <p>{Math.min(sealIndex, 3)}/3 zegels · {seconds}s</p>
          <small role="status">{notice || 'Ontwijk de paarse schaduw.'}</small>
          <button onClick={() => { running.current = false; trip.current = null; setQuest('ready') }}>Tocht verlaten</button>
        </> : <>
          <p>{quest === 'won' ? `Bron hersteld in ${seconds}s.` : 'Verzamel drie zegels en herstel de bron.'}</p>
          {best !== null && <small>Beste tijd · {best}s</small>}
          <button onClick={startQuest}>{quest === 'won' ? 'Speel opnieuw' : 'Start de tocht'}</button>
        </>}
      </aside>
      {threeD && <button type="button" className="world-camera" aria-pressed={closeCamera}
        onClick={() => setCloseCamera(!closeCamera)}><Scan size={16} />{closeCamera ? 'Hele kaart' : 'Volg speler'}</button>}
      <footer className="world-controls">
        <div><Footprints size={18} aria-hidden="true" /> <span>Klik/tik op een gebouw of loop met <kbd>WASD</kbd> / <kbd>↑↓←→</kbd>. <kbd>Shift</kbd> sprint · <kbd>E</kbd> betreed gebouw.</span></div>
        <div><Flame size={16} aria-hidden="true" /> <span>Actieve glitch{unlocated > 0 ? ` · ${unlocated} zonder locatie in de Echopost` : ''}</span></div>
      </footer>
      <p className="sr-only" role="status">{nearby ? `Bij ${nearby.name}. Druk op E om binnen te gaan.` : ''}</p>
    </section>
  )
}
