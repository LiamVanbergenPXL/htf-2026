import {createFileRoute, redirect} from '@tanstack/react-router'
import {GlitchesTable} from '#/components/GlitchesTable.tsx'
import {getGlitches} from '#/lib/glitches.functions.ts'
import {ReportEchoForm} from '#/components/ReportEchoForm'

export const Route = createFileRoute('/')({
  beforeLoad: ({ context }) => {
    if (!context.guardian) throw redirect({ to: '/login' })
  },
  loader: () => getGlitches(),
  component: OverviewPage,
})

function OverviewPage() {
  const glitches = Route.useLoaderData()
  const { guardian } = Route.useRouteContext()

  return (
    <div className="flex flex-col gap-8">
      <h1 className="text-3xl font-semibold text-fg">Overview</h1>
      <ReportEchoForm />
      <GlitchesTable glitches={glitches} canChangeStatus={guardian?.role === 'commander'} />
    </div>
  )
}
