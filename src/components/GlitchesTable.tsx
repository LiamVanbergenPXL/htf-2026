import { GlitchAssignment } from '#/components/GlitchAssignment'
import { useState } from 'react'
import { GlitchStatusControl } from '#/components/GlitchStatusControl'
import { GLITCH_STATUSES, type Glitch, type GlitchStatus } from '#/lib/glitch.ts'

const statusClasses: Record<GlitchStatus, string> = {
  LEAKED: 'bg-red-50 text-red-700',
  ASSESSING: 'bg-amber-50 text-amber-800',
  CONTAINING: 'bg-blue-50 text-blue-700',
  FIXED: 'bg-green-50 text-green-800',
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
const fieldClass = 'min-w-0 w-full rounded-lg border border-line bg-panel px-3 py-2 text-sm outline-accent'
const normalize = (value: string) => value.toLowerCase().normalize('NFD').replace(/\p{M}/gu, '')

export function GlitchesTable({ glitches, canChangeStatus = false, defenders = [], defenderId }: { glitches: Glitch[]; canChangeStatus?: boolean; defenders?: { id: string; name: string }[]; defenderId?: string }) {
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
    <section aria-labelledby="glitches-title" className="flex flex-col gap-6">
      <h2 id="glitches-title" className="text-xl font-semibold">Glitches <span role="status" className="font-normal text-muted">({visible.length} van {glitches.length})</span></h2>
      <div className="grid gap-3 rounded-xl border border-line bg-subtle p-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <label className="grid gap-1 text-sm">
          Zoeken
          <input type="search" value={filters.query} onChange={(event) => update('query', event.target.value)}
            placeholder="Trefwoorden of glitch-ID" className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm">
          Status
          <select value={filters.status} onChange={(event) => update('status', event.target.value)} className={fieldClass}>
            <option value="">Alle statussen</option>
            {GLITCH_STATUSES.map((status) => <option key={status}>{status}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          Vanaf
          <input type="date" value={filters.from} onChange={(event) => update('from', event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm">
          Tot en met
          <input type="date" value={filters.to} onChange={(event) => update('to', event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1 text-sm">
          Sorteren
          <select value={filters.sort} onChange={(event) => update('sort', event.target.value)} className={fieldClass}>
            <option value="newest">Nieuwste eerst</option>
            <option value="oldest">Oudste eerst</option>
            <option value="status">Op status</option>
          </select>
        </label>
        {invalidRange ? <p role="alert" className="text-sm text-red-700 sm:col-span-2">De einddatum moet op of na de begindatum liggen.</p> : null}
        <button type="button" onClick={() => setFilters(defaults)} className="justify-self-start text-sm font-medium text-accent underline">
          Filters wissen
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left">
          <thead>
            <tr className="border-b-2 border-line text-muted">
              {columns.map((col) => (
                <th key={col} scope="col" className="px-5 py-4 font-normal">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody className="text-fg">
            {visible.map((glitch) => (
              <tr key={glitch.glitchId} id={`glitch-${glitch.glitchId}`} className="scroll-mt-8 border-b border-line target:bg-violet-50">
                <td className="max-w-40 px-5 py-4">
                  <span className="block truncate" title={glitch.glitchId}>{glitch.glitchId}</span>
                </td>
                <td className="min-w-64 px-5 py-4 [overflow-wrap:anywhere]">
                  <p className="whitespace-pre-wrap">{glitch.description}</p>
                  <p className="mt-1 text-xs text-muted">{glitch.assignedDefender ?? 'Niet toegewezen'}</p>
                  <GlitchAssignment key={glitch.assignedDefenderId ?? ''} glitch={glitch} defenders={defenders}
                    commander={canChangeStatus} canPost={Boolean(defenderId && defenderId === glitch.assignedDefenderId)} />
                  {glitch.imageEchoIds?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {glitch.imageEchoIds.map((echoId, index) => (
                        <a key={echoId} href={`/echo-images/${encodeURIComponent(echoId)}`} target="_blank" rel="noopener noreferrer"
                          aria-label={`Bekijk afbeelding ${index + 1} bij ${glitch.glitchId} in een nieuw tabblad`}
                          className="rounded-lg border border-line p-1 transition hover:border-accent focus-visible:outline-2 focus-visible:outline-accent">
                          <img src={`/echo-images/${encodeURIComponent(echoId)}`} alt={`Afbeelding ${index + 1} bij de echo`}
                            loading="lazy" className="h-20 w-28 rounded-md object-cover" />
                        </a>
                      ))}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[glitch.status]}`}>
                    {glitch.status}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  <time dateTime={glitch.timestamp} suppressHydrationWarning>
                    {timestampFormat.format(new Date(glitch.timestamp))}
                  </time>
                </td>
                {canChangeStatus ? (
                  <td className="px-5 py-4">
                    <GlitchStatusControl key={`${glitch.glitchId}:${glitch.status}`} glitch={glitch} />
                  </td>
                ) : null}
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-10 text-center text-muted">{glitches.length ? 'Geen glitches gevonden met deze filters.' : 'Er zijn nog geen glitches. Meld een echo om te beginnen.'}</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
