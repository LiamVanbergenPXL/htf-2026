import {Link} from '@tanstack/react-router'
import {Activity, LayoutGrid, LogOut, User, type LucideIcon} from 'lucide-react'
import { useState } from 'react'
import { logoutFn } from '#/lib/auth.functions'

type NavItem = {
  label: string
  icon: LucideIcon
  /** Only set for pages that already have a route. */
  to?: '/'
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: LayoutGrid, to: '/' },
]

// Icon-only items: the label lives in aria-label/title for screen readers and hover.
const itemClass =
  'flex size-12 items-center justify-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white'
const activeClass = 'bg-white/10 text-white'

export function Sidebar({ guardian }: { guardian: { codename: string; role: 'defender' | 'commander' } }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function logout() {
    setPending(true)
    setError('')
    try {
      await logoutFn()
      window.location.replace('/login')
    } catch {
      setError('Uitloggen mislukt. Probeer opnieuw.')
      setPending(false)
    }
  }

  return (
    <aside className="sticky top-0 flex h-screen w-20 shrink-0 flex-col items-center bg-sidebar py-5">
      <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-linear-to-br from-accent-from to-accent-to text-white shadow-md shadow-black/30">
        <Activity className="size-7" strokeWidth={2} />
      </div>

      <nav className="flex w-full flex-1 flex-col items-center gap-1">
        {navItems.map(({ label, icon: Icon, to }) => {
          const icon = <Icon className="size-6" strokeWidth={1.5} />
          return to ? (
            <Link
              key={label}
              to={to}
              aria-label={label}
              title={label}
              className={itemClass}
              activeOptions={{ exact: true }}
              activeProps={{ className: activeClass }}
            >
              {icon}
            </Link>
          ) : (
            <button key={label} type="button" aria-label={label} title={label} className={itemClass}>
              {icon}
            </button>
          )
        })}
      </nav>

      <div className="flex w-full flex-col items-center gap-4">
        <div className="flex w-full min-w-0 flex-col items-center gap-2 px-1 text-center"
          title={`Ingelogd als ${guardian.codename} (${guardian.role})`}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border border-line bg-white text-fg">
            <User aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </div>
          <div className="w-full min-w-0">
            <p className="text-xs font-medium leading-snug text-white [overflow-wrap:anywhere]">
              {guardian.codename}
            </p>
            <p className="mt-1 text-[10px] capitalize leading-snug text-white/70">
              {guardian.role}
            </p>
          </div>
        </div>
        <button type="button" onClick={logout} disabled={pending} aria-label="Uitloggen" title="Uitloggen"
          className={`${itemClass} disabled:opacity-50`}>
          <LogOut className="size-5" aria-hidden="true" />
        </button>
        {error ? <p role="alert" className="px-1 text-center text-xs text-white">{error}</p> : null}
      </div>
    </aside>
  )
}
