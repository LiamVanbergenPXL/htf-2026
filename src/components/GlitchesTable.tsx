import { CircleHelp, Network, Radio, Sparkles, Tag } from 'lucide-react'
import { useServerFn } from '@tanstack/react-start'
import { askAuri } from '#/lib/auri.functions'
import { playerUrl } from '#/lib/player-slot'
import { GlitchAssignment } from '#/components/GlitchAssignment'
import { useEffect, useEffectEvent, useState } from 'react'
import { GlitchStatusControl } from '#/components/GlitchStatusControl'
import { GLITCH_STATUSES, GLITCH_TYPES, GLITCH_TYPE_LABELS, type Glitch, type GlitchStatus } from '#/lib/glitch.ts'

// Wax seals: blood red, gilt, steel blue, verdigris.
const statusClasses: Record<GlitchStatus, string> = {
  LEAKED: 'bg-[#b3261e] text-[#fbf2dc] border-[#6e130e]',
  ASSESSING: 'bg-[#e8c777] text-[#4a3006] border-[#9a6418]',
  CONTAINING: 'bg-[#2f5d8a] text-[#fbf2dc] border-[#183650]',
  FIXED: 'bg-[#3d6b45] text-[#fbf2dc] border-[#22402a]',
}

const runbooks: Record<GlitchStatus, readonly string[]> = {
  LEAKED: ['Controleer waar en wanneer de afwijking begon.', 'Voeg observaties of een foto toe aan de echo.', 'Vraag een commander om een defender toe te wijzen en de beoordeling te starten.'],
  ASSESSING: ['Bepaal welke locaties of functies getroffen zijn.', 'Leg de impact en je bevindingen vast in een echo.', 'Spreek met de commander af hoe je verdere impact beperkt.'],
  CONTAINING: ['Voer de afgesproken herstelactie uit.', 'Controleer of de getroffen functie weer normaal werkt.', 'Meld het resultaat via een echo zodat de commander kan beslissen over afsluiting.'],
  FIXED: ['Controleer of de werking stabiel blijft.', 'Leg de oplossing vast voor een volgende melding.', 'Meld een nieuwe echo als de afwijking terugkomt.'],
}

function GlitchRunbook({ glitch, canUseAuri }: { glitch: Glitch; canUseAuri: boolean }) {
  const ask = useServerFn(askAuri)
  const [plan, setPlan] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function generate() {
    setPending(true)
    setError('')
    try {
      const result = await ask({ data: { question: 'Maak een stappenplan voor deze glitch.', glitchId: glitch.glitchId } })
      if (result.success) setPlan(result.answer.content)
      else setError(result.error)
    } catch {
      setError('Auri kon het stappenplan niet ophalen. Probeer opnieuw.')
    } finally {
      setPending(false)
    }
  }

  return (
    <details className="mt-2 text-sm">
      <summary className="cursor-pointer font-semibold text-accent">Bekijk stappenplan</summary>
      {canUseAuri && (
        <button type="button" className="tome-button mt-2 px-3 py-1" onClick={generate} disabled={pending}>
          {pending ? 'Auri maakt het plan…' : plan ? 'Maak een nieuw plan' : 'Maak plan voor deze glitch'}
        </button>
      )}
      {error && <p role="alert" className="mt-2 text-accent">{error}</p>}
      {plan ? <p className="mt-2 whitespace-pre-wrap" aria-live="polite">{plan}</p> : (
        <>
          <p className="mt-2 text-muted">Basisplan voor {glitch.status}</p>
          <ol className="mt-1 list-decimal space-y-1 pl-5">
            {runbooks[glitch.status].map(step => <li key={step}>{step}</li>)}
          </ol>
        </>
      )}
    </details>
  )
}

const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Brussels',
})

const dateKey = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
})
const typeIcons = { sensor: Radio, network: Network, magic: Sparkles, other: Tag, untyped: CircleHelp }
const defaults = { type: '', query: '', status: '', from: '', to: '', sort: 'newest' }
const fieldClass = 'tome-input min-w-0 w-full px-3 py-2 font-sans text-sm font-normal text-fg'
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

export function GlitchesTable({ active = true, canUseAuri = false, speler, glitches, canChangeStatus = false, defenders = [], defenderId }: { active?: boolean; canUseAuri?: boolean; speler?: string; glitches: Glitch[]; canChangeStatus?: boolean; defenders?: { id: string; name: string }[]; defenderId?: string }) {
  const [selectedId, setSelectedId] = useState<string>()
  const [filters, setFilters] = useState(defaults)
  const update = (key: keyof typeof defaults, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)
  const keywords = normalize(filters.query).trim().split(/\s+/).filter(Boolean)
  const visible = glitches.filter((glitch) => {
    if (invalidRange || (filters.status && glitch.status !== filters.status)) return false
    if (filters.type && filters.type !== (glitch.glitchType ?? 'untyped')) return false
    const typeLabel = glitch.glitchType ? GLITCH_TYPE_LABELS[glitch.glitchType] : 'Zonder type'
    const searchable = normalize(`${glitch.glitchId} ${glitch.description} ${glitch.status} ${typeLabel}`)
    if (!keywords.every((keyword) => searchable.includes(keyword))) return false
    if (!filters.from && !filters.to) return true
    const day = dateKey.format(new Date(glitch.timestamp))
    return (!filters.from || day >= filters.from) && (!filters.to || day <= filters.to)
  }).sort((a, b) => {
    const newestFirst = Date.parse(b.timestamp) - Date.parse(a.timestamp)
    if (filters.sort === 'oldest') return -newestFirst
    if (filters.sort === 'status') return GLITCH_STATUSES.indexOf(a.status) - GLITCH_STATUSES.indexOf(b.status) || newestFirst
    return newestFirst
  })
  const navigateGlitch = useEffectEvent((event: KeyboardEvent) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.isComposing) return
    if (event.target instanceof HTMLElement && (event.target.isContentEditable || event.target.closest('input, textarea, select'))) return
    if (!visible.length || (event.key !== 'j' && event.key !== 'k')) return
    event.preventDefault()
    const current = visible.findIndex(glitch => glitch.glitchId === selectedId)
    const step = event.key === 'j' ? 1 : -1
    const next = current < 0 ? (step === 1 ? 0 : visible.length - 1)
      : Math.max(0, Math.min(visible.length - 1, current + step))
    const id = visible[next].glitchId
    setSelectedId(id)
    const row = document.getElementById(`glitch-${id}`)
    row?.focus({ preventScroll: true })
    row?.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  })
  useEffect(() => {
    if (!active) return
    function onKeyDown(event: KeyboardEvent) { navigateGlitch(event) }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [active])

  const columns = ['ID', 'Description', 'Status', 'Timestamp', ...(canChangeStatus ? ['Status wijzigen'] : [])]

  return (
    <section aria-labelledby="glitches-title" className="stat-block flex flex-col gap-4 p-6">
      <h2 id="glitches-title" className="tome-heading text-2xl">Glitches <span role="status" className="font-sans font-normal text-muted">({visible.length} van {glitches.length})</span></h2>
      {/* Two filters per row on phones; search gets the full row there. */}
      <div className="grid grid-cols-2 gap-3 border border-dashed border-[#a88a5c] bg-[#ecdcb6]/40 p-3 sm:p-4 lg:grid-cols-3 xl:grid-cols-5">
        <label className="col-span-2 grid gap-1 font-sc text-sm font-bold text-accent sm:col-span-1">
          Zoeken
          <input type="search" value={filters.query} onChange={(event) => update('query', event.target.value)}
            placeholder="Trefwoorden of glitch-ID" className={fieldClass} />
        </label>
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
          Status
          <select value={filters.status} onChange={(event) => update('status', event.target.value)} className={fieldClass}>
            <option value="">Alle statussen</option>
            {GLITCH_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
          Glitchtype
          <select value={filters.type} onChange={event => update('type', event.target.value)} className={fieldClass}>
            <option value="">Alle types</option>
            {GLITCH_TYPES.map(type => <option key={type} value={type}>{GLITCH_TYPE_LABELS[type]}</option>)}
            <option value="untyped">Zonder type</option>
          </select>
        </label>
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
          Vanaf
          <input type="date" value={filters.from} onChange={(event) => update('from', event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
          Tot en met
          <input type="date" value={filters.to} onChange={(event) => update('to', event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
          Sorteren
          <select value={filters.sort} onChange={(event) => update('sort', event.target.value)} className={fieldClass}>
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
            <option value="status">Op status</option>
          </select>
        </label>
        {invalidRange ? <p role="alert" className="col-span-2 text-sm font-semibold text-accent">De einddatum moet op of na de begindatum liggen.</p> : null}
        <button type="button" onClick={() => setFilters(defaults)} className="justify-self-start self-end font-sc text-sm font-bold text-accent underline">
          Filters wissen
        </button>
      </div>
      <div className="overflow-x-auto">
        {/* glitch-table: rows become stacked cards on phones (see styles.css). */}
        <table className="glitch-table w-full text-left lg:min-w-[720px]">
          <thead>
            <tr className="border-b-2 border-accent/70 font-sc text-accent">
              {columns.map((col) => (
                <th key={col} scope="col" className="px-4 py-3 font-bold">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-fg">
            {visible.map((glitch) => (
              <tr key={glitch.glitchId} id={`glitch-${glitch.glitchId}`} className="scroll-mt-8 border-b border-dotted border-[#a88a5c] even:bg-[#ecdcb6]/40 target:bg-gilt/20">
                <td data-label={columns[0]} className="max-w-40 px-4 py-4 align-top">
                  <span className="block truncate font-sc font-bold" title={glitch.glitchId}>{glitch.glitchId}</span>
                </td>
                <td data-label={columns[1]} data-stack className="min-w-64 px-4 py-4 align-top [overflow-wrap:anywhere]">
                  <p className="whitespace-pre-wrap">{glitch.description}</p>
                  <p className="mt-1 text-xs text-muted">{glitch.assignedDefender ?? 'Niet toegewezen'}</p>
                  <GlitchAssignment key={glitch.assignedDefenderId ?? ''} glitch={glitch} defenders={defenders}
                    commander={canChangeStatus} canPost={Boolean(defenderId && defenderId === glitch.assignedDefenderId)} />
                  <GlitchRunbook key={glitch.status} glitch={glitch} canUseAuri={canUseAuri} />
                  {glitch.imageEchoIds?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <details className="mt-2 text-sm">
                    <summary className="cursor-pointer font-semibold text-accent">Bekijk stappenplan</summary>
                    <ol className="mt-2 list-decimal space-y-1 pl-5">
                      {runbooks[glitch.status].map(step => <li key={step}>{step}</li>)}
                    </ol>
                  </details>
                  {glitch.imageEchoIds.map((echoId, index) => (
                        <a key={echoId} href={playerUrl(`/echo-images/${encodeURIComponent(echoId)}`, speler)} target="_blank" rel="noopener noreferrer"
                          aria-label={`Bekijk afbeelding ${index + 1} bij ${glitch.glitchId} in een nieuw tabblad`}
                          className="block border-4 border-[#fffaf0] shadow-md shadow-[#3c1e0a]/40 transition hover:-rotate-1 focus-visible:outline-2 focus-visible:outline-gilt">
                          <img src={playerUrl(`/echo-images/${encodeURIComponent(echoId)}`, speler)} alt={`Afbeelding ${index + 1} bij de echo`}
                            loading="lazy" className="h-20 w-28 object-cover sepia-[.25]" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td data-label={columns[2]} className="px-4 py-4 align-top">
                  <span className={`inline-block rounded-full border-2 px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-[inset_0_-2px_0_rgb(0_0_0/.2)] ${statusClasses[glitch.status]}`}>
                    {glitch.status}
                  </span>
                </td>
                <td data-label={columns[3]} className="px-4 py-4 align-top whitespace-nowrap italic text-muted">
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {timestampFormat.format(new Date(glitch.timestamp))}
                  </time>
                </td>
                {canChangeStatus ? (
                  <td data-label={columns[4]} data-stack className="px-4 py-4 align-top">
                    <GlitchStatusControl key={`${glitch.glitchId}:${glitch.status}`} glitch={glitch} />
                  </td>
                ) : null}
              </tr>
              )
            })}
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center italic text-muted">{glitches.length ? 'Geen glitches gevonden met deze filters.' : 'Er zijn nog geen glitches. Meld een echo om te beginnen.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
