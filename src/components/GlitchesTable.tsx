import { GlitchStatusControl } from '#/components/GlitchStatusControl'
import type { Glitch, GlitchStatus } from '#/lib/glitch.ts'

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
})

export function GlitchesTable({ glitches, canChangeStatus = false }: { glitches: Glitch[]; canChangeStatus?: boolean }) {
  const columns = ['ID', 'Description', 'Status', 'Timestamp', ...(canChangeStatus ? ['Status wijzigen'] : [])]

  return (
    <section aria-labelledby="glitches-title" className="stat-block flex flex-col gap-4 p-6">
      <h2 id="glitches-title" className="tome-heading text-2xl">Glitches <span className="font-sans font-normal text-muted">({glitches.length})</span></h2>
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
            {glitches.map((glitch) => (
              <tr key={glitch.glitchId} className="border-b border-dotted border-[#a88a5c] even:bg-[#ecdcb6]/40">
                <td className="max-w-40 px-4 py-4 align-top">
                  <span className="block truncate font-sc font-bold" title={glitch.glitchId}>{glitch.glitchId}</span>
                </td>
                <td className="min-w-64 px-4 py-4 align-top [overflow-wrap:anywhere]">
                  <p className="whitespace-pre-wrap">{glitch.description}</p>
                  {glitch.imageEchoIds?.length ? (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {glitch.imageEchoIds.map((echoId, index) => (
                        <a key={echoId} href={`/echo-images/${encodeURIComponent(echoId)}`} target="_blank" rel="noopener noreferrer"
                          aria-label={`Bekijk afbeelding ${index + 1} bij ${glitch.glitchId} in een nieuw tabblad`}
                          className="block border-4 border-[#fffaf0] shadow-md shadow-[#3c1e0a]/40 transition hover:-rotate-1 focus-visible:outline-2 focus-visible:outline-gilt">
                          <img src={`/echo-images/${encodeURIComponent(echoId)}`} alt={`Afbeelding ${index + 1} bij de echo`}
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
                  {/* Server and browser time zones can differ; the browser's wins. */}
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
            {glitches.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-4 py-10 text-center italic text-muted">Er zijn nog geen glitches. Meld een echo om te beginnen.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
