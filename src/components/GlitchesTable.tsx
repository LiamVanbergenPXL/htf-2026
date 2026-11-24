import { playerUrl } from '#/lib/player-slot'
import { GlitchAssignment } from '#/components/GlitchAssignment'
import { useState } from 'react'
import { GlitchStatusControl } from '#/components/GlitchStatusControl'
import { GLITCH_STATUSES, type Glitch, type GlitchStatus } from '#/lib/glitch.ts'

// Wax seals: blood red, gilt, steel blue, verdigris.
const statusClasses: Record<GlitchStatus, string> = {
  LEAKED: 'bg-[#b3261e] text-[#fbf2dc] border-[#6e130e]',
  ASSESSING: 'bg-[#e8c777] text-[#4a3006] border-[#9a6418]',
  CONTAINING: 'bg-[#2f5d8a] text-[#fbf2dc] border-[#183650]',
  FIXED: 'bg-[#3d6b45] text-[#fbf2dc] border-[#22402a]',
}

const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Europe/Brussels',
})

const dateKey = new Intl.DateTimeFormat('sv-SE', {
  timeZone: 'Europe/Brussels', year: 'numeric', month: '2-digit', day: '2-digit',
})
const defaults = { query: '', status: '', from: '', to: '', sort: 'newest' }
const fieldClass = 'tome-input min-w-0 w-full px-3 py-2 font-sans text-sm font-normal text-fg'
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

export function GlitchesTable({ speler, glitches, canChangeStatus = false, defenders = [], defenderId }: { speler?: string; glitches: Glitch[]; canChangeStatus?: boolean; defenders?: { id: string; name: string }[]; defenderId?: string }) {
  const [filters, setFilters] = useState(defaults)
  const update = (key: keyof typeof defaults, value: string) =>
    setFilters((current) => ({ ...current, [key]: value }))
  const invalidRange = Boolean(filters.from && filters.to && filters.from > filters.to)
  const keywords = normalize(filters.query).trim().split(/\s+/).filter(Boolean)
  const visible = glitches.filter((glitch) => {
    if (invalidRange || (filters.status && glitch.status !== filters.status)) return false
    const searchable = normalize(`${glitch.glitchId} ${glitch.description} ${glitch.status}`)
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
  const columns = ['ID', 'Description', 'Status', 'Timestamp', ...(canChangeStatus ? ['Status wijzigen'] : [])]

  return (
    <section aria-labelledby="glitches-title" className="stat-block flex flex-col gap-4 p-6">
      <h2 id="glitches-title" className="tome-heading text-2xl">Glitches <span role="status" className="font-sans font-normal text-muted">({visible.length} van {glitches.length})</span></h2>
      <div className="grid gap-3 border border-dashed border-[#a88a5c] bg-[#ecdcb6]/40 p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="grid gap-1 font-sc text-sm font-bold text-accent">
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
        {invalidRange ? <p role="alert" className="text-sm font-semibold text-accent sm:col-span-2">De einddatum moet op of na de begindatum liggen.</p> : null}
        <button type="button" onClick={() => setFilters(defaults)} className="justify-self-start self-end font-sc text-sm font-bold text-accent underline">
          Filters wissen
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
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
                <td className="max-w-40 px-4 py-4 align-top">
                  <span className="block truncate font-sc font-bold" title={glitch.glitchId}>{glitch.glitchId}</span>
                </td>
                <td className="min-w-64 px-4 py-4 align-top [overflow-wrap:anywhere]">
                  <p className="whitespace-pre-wrap">{glitch.description}</p>
                  <p className="mt-1 text-xs text-muted">{glitch.assignedDefender ?? 'Niet toegewezen'}</p>
                  <GlitchAssignment key={glitch.assignedDefenderId ?? ''} glitch={glitch} defenders={defenders}
                    commander={canChangeStatus} canPost={Boolean(defenderId && defenderId === glitch.assignedDefenderId)} />
                  {glitch.imageEchoIds?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
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
                <td className="px-4 py-4 align-top">
                  <span className={`inline-block rounded-full border-2 px-2.5 py-0.5 text-xs font-bold tracking-wide shadow-[inset_0_-2px_0_rgb(0_0_0/.2)] ${statusClasses[glitch.status]}`}>
                    {glitch.status}
                  </span>
                </td>
                <td className="px-4 py-4 align-top whitespace-nowrap italic text-muted">
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {timestampFormat.format(new Date(glitch.timestamp))}
                  </time>
                </td>
                {canChangeStatus ? (
                  <td className="px-4 py-4 align-top">
                    <GlitchStatusControl key={`${glitch.glitchId}:${glitch.status}`} glitch={glitch} />
                  </td>
                ) : null}
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center italic text-muted">{glitches.length ? 'Geen glitches gevonden met deze filters.' : 'Er zijn nog geen glitches. Meld een echo om te beginnen.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
