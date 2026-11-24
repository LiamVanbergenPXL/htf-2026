import {createFileRoute, redirect} from '@tanstack/react-router'
import {GlitchesTable} from '#/components/GlitchesTable.tsx'
import {getGlitches} from '#/lib/glitches.functions.ts'
import {ReportEchoForm} from '#/components/ReportEchoForm'
import {RealmIntegrityMeter} from '#/components/RealmIntegrityMeter'
import {RealmDragon} from '#/components/RealmDragon'
import {calculateRealmIntegrity, type RealmLevel} from '#/lib/realm-integrity'
import {useEffect} from 'react'

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
  const { level, integrity } = calculateRealmIntegrity(glitches)
  useRealmLevelOnPage(level)

  return (
    <div className="relative flex flex-col gap-8" data-intensity={level}>
      <RealmDragon integrity={integrity} />
      {/* Above the background dragon and its fire. */}
      <header className="relative z-10 flex">
        <h1 className="font-display text-5xl leading-none text-fg sm:text-6xl">
          <span className="desync-glitch" data-text="Overview">Overview</span>
        </h1>
      </header>
      <RealmIntegrityMeter glitches={glitches} />
      {guardian ? <ReportEchoForm role={guardian.role} /> : null}
      <a href="/reports/achrona.pdf" download className="self-start rounded bg-accent px-4 py-2 text-white">
        Rapport opslaan als PDF
      </a>
      <GlitchesTable defenders={defenders} defenderId={guardian?.role === 'defender' ? guardian.guardianId : undefined} glitches={glitches} canChangeStatus={guardian?.role === 'commander'} />
    </div>
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
