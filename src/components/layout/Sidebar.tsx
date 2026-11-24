import {Link} from '@tanstack/react-router'
import {LogOut, PanelLeftClose, PanelLeftOpen, ScrollText, Shield, type LucideIcon} from 'lucide-react'
import { useEffect, useState } from 'react'
import { D20 } from '#/components/ui/D20'
import { logoutFn } from '#/lib/auth.functions'

type NavItem = {
  label: string
  icon: LucideIcon
  /** Only set for pages that already have a route. */
  to?: '/'
}

const navItems: NavItem[] = [
  { label: 'Overview', icon: ScrollText, to: '/' },
]

const STORAGE_KEY = 'sidebar-expanded'

// Collapsed items are icon-only: the label lives in aria-label/title for screen readers and hover.
const itemBase =
  'flex h-12 items-center gap-3 rounded-lg text-[#e9d8b4]/75 transition-colors hover:bg-gilt/15 hover:text-[#f3e2bc]'
const activeClass = 'bg-gilt/20 text-[#f3e2bc] ring-1 ring-gilt/60'

export function Sidebar({ guardian }: { guardian: { codename: string; role: 'defender' | 'commander' } }) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [expanded, setExpanded] = useExpandedPreference()

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

  const itemClass = `${itemBase} ${expanded ? 'w-full px-3.5' : 'w-12 justify-center'}`
  const toggleLabel = expanded ? 'Zijbalk inklappen' : 'Zijbalk uitklappen'
  const ToggleIcon = expanded ? PanelLeftClose : PanelLeftOpen

  return (
    <aside className={`leather-spine sticky top-0 flex h-screen shrink-0 flex-col py-5 transition-[width] duration-200 motion-reduce:transition-none ${expanded ? 'w-64 items-stretch px-4 max-sm:fixed max-sm:top-0 max-sm:h-dvh max-sm:left-0 max-sm:z-40 max-sm:shadow-2xl max-sm:shadow-black/70' : 'w-24 items-center'}`}>
      <div className={`mb-6 flex items-center gap-3 ${expanded ? 'px-1' : 'justify-center'}`}>
        <D20 className="size-11 shrink-0 text-gilt drop-shadow-[0_0_6px_rgb(184_134_43/.5)]" faceClassName="fill-gilt/25" />
        {expanded ? <span className="font-display text-2xl leading-tight text-[#f3e2bc]">Achrona</span> : null}
      </div>

      <nav className={`flex w-full flex-1 flex-col gap-1 ${expanded ? '' : 'items-center'}`}>
        {navItems.map(({ label, icon: Icon, to }) => {
          const content = (
            <>
              <Icon className="size-6 shrink-0" strokeWidth={1.5} aria-hidden="true" />
              {expanded ? <span className="font-sc text-lg font-bold">{label}</span> : null}
            </>
          )
          const labelProps = expanded ? {} : { 'aria-label': label, title: label }
          return to ? (
            <Link key={label} to={to} {...labelProps} className={itemClass}
              activeOptions={{ exact: true }} activeProps={{ className: activeClass }}>
              {content}
            </Link>
          ) : (
            <button key={label} type="button" {...labelProps} className={itemClass}>
              {content}
            </button>
          )
        })}
      </nav>

      <div className={`flex w-full flex-col gap-3 ${expanded ? '' : 'items-center'}`}>
        <div className={`flex min-w-0 items-center gap-3 ${expanded ? 'rounded-lg bg-black/20 p-2.5' : ''}`}
          title={`Ingelogd als ${guardian.codename} (${guardian.role})`}>
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full border-2 border-gilt bg-accent text-[#f3e2bc]">
            <Shield aria-hidden="true" className="size-5" strokeWidth={1.75} />
          </div>
          {expanded ? (
            <div className="min-w-0">
              <p className="truncate font-sc font-bold leading-snug text-[#f3e2bc]">{guardian.codename}</p>
              <p className="font-sc text-sm leading-snug text-gilt">{guardian.role}</p>
            </div>
          ) : <span className="sr-only">Ingelogd als {guardian.codename} ({guardian.role})</span>}
        </div>
        <button type="button" onClick={logout} disabled={pending} aria-label="Uitloggen" title="Uitloggen"
          className={`${itemClass} disabled:opacity-50`}>
          <LogOut className="size-5 shrink-0" aria-hidden="true" />
          {expanded ? <span className="font-sc font-bold" aria-hidden="true">Uitloggen</span> : null}
        </button>
        <button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}
          aria-label={toggleLabel} title={toggleLabel} className={itemClass}>
          <ToggleIcon className="size-5 shrink-0" aria-hidden="true" />
          {expanded ? <span className="font-sc" aria-hidden="true">Inklappen</span> : null}
        </button>
        {error ? <p role="alert" className="px-1 text-center text-xs text-[#f3e2bc]">{error}</p> : null}
      </div>
    </aside>
  )
}

/**
 * Remembers the choice in this browser. Starts collapsed on the server and on
 * first paint, so server and client render the same markup.
 */
function useExpandedPreference() {
  const [expanded, setExpanded] = useState(false)

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === 'true') setExpanded(true)
    } catch {
      // Storage can be blocked; the sidebar then simply starts collapsed.
    }
  }, [])

  function update(value: boolean) {
    setExpanded(value)
    try {
      window.localStorage.setItem(STORAGE_KEY, String(value))
    } catch {
      // Not remembered, but the toggle still works for this visit.
    }
  }

  return [expanded, update] as const
}
