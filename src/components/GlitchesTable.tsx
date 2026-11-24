import { GlitchStatusControl } from '#/components/GlitchStatusControl'
import type { Glitch, GlitchStatus } from '#/lib/glitch.ts'

const statusClasses: Record<GlitchStatus, string> = {
  LEAKED: 'bg-red-50 text-red-700',
  ASSESSING: 'bg-amber-50 text-amber-800',
  CONTAINING: 'bg-blue-50 text-blue-700',
  FIXED: 'bg-green-50 text-green-800',
}

const timestampFormat = new Intl.DateTimeFormat('en-GB', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

export function GlitchesTable({ glitches, canChangeStatus = false }: { glitches: Glitch[]; canChangeStatus?: boolean }) {
  const columns = ['ID', 'Description', 'Status', 'Timestamp', ...(canChangeStatus ? ['Status wijzigen'] : [])]

  return (
    <section aria-labelledby="glitches-title" className="flex flex-col gap-6">
      <h2 id="glitches-title" className="text-xl font-semibold">Glitches <span className="font-normal text-muted">({glitches.length})</span></h2>
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
            {glitches.map((glitch) => (
              <tr key={glitch.glitchId} className="border-b border-line">
                <td className="max-w-40 px-5 py-4">
                  <span className="block truncate" title={glitch.glitchId}>{glitch.glitchId}</span>
                </td>
                <td className="min-w-64 px-5 py-4 whitespace-pre-wrap [overflow-wrap:anywhere]">{glitch.description}</td>
                <td className="px-5 py-4">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClasses[glitch.status]}`}>
                    {glitch.status}
                  </span>
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {/* Server and browser time zones can differ; the browser's wins. */}
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
            {glitches.length === 0 ? (
              <tr><td colSpan={columns.length} className="px-5 py-10 text-center text-muted">Er zijn nog geen glitches. Meld een echo om te beginnen.</td></tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  )
}
