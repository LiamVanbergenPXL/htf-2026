import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
} from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'
import { Sidebar } from '#/components/layout/Sidebar'
import { getCurrentGuardianFn } from '#/lib/auth.functions'

import appCss from '../styles.css?url'

import { playerSlot } from '#/lib/player-slot'

export const Route = createRootRoute({
  validateSearch: (search): { speler?: string } => ({ speler: playerSlot(search.speler) }),
  beforeLoad: async () => ({ guardian: await getCurrentGuardianFn() }),
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'Control Center' },
    ],
    links: [{ rel: 'stylesheet', href: appCss }],
  }),
  shellComponent: RootDocument,
  component: AppLayout,
})

function AppLayout() {
  const { guardian } = Route.useRouteContext()
  if (!guardian) return <Outlet />

  return (
    <div className="flex min-h-screen">
      <Sidebar guardian={guardian} />
      {/* overflow-x-clip: the glitch layers shift a few pixels and must not cause a page scrollbar. */}
      <main className="parchment app-main min-w-0 flex-1 overflow-x-clip">
        <Outlet />
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-app font-sans antialiased">
        {children}
        <TanStackDevtools
          config={{ position: 'bottom-right' }}
          plugins={[
            {
              name: 'Tanstack Router',
              render: <TanStackRouterDevtoolsPanel />,
            },
          ]}
        />
        <Scripts />
      </body>
    </html>
  )
}
