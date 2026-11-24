import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState } from 'react'
import { joinGame } from '#/lib/auth.functions'

export const Route = createFileRoute('/play')({
  beforeLoad: ({ context, search }) => { if (context.guardian) throw redirect({ to: '/', search }) },
  component: Join,
})
function Join() {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  async function enter() {
    setPending(true)
    try { await joinGame(); window.location.replace('/' + window.location.search) }
    catch { setError('Meespelen is niet gelukt. Probeer opnieuw.'); setPending(false) }
  }
  return <main className="join-screen"><section className="stat-block p-6">
    <p className="team-signature">De Hexecuters</p>
    <h1 className="font-display text-4xl">Achrona</h1>
    <p className="my-4">Loop rond, verzamel zegels en praat met andere spelers.</p>
    <button className="tome-button px-5 py-3" disabled={pending} onClick={enter}>{pending ? 'Verbinden…' : 'Speel mee als gast'}</button>
    {error && <p role="alert">{error}</p>}
  </section></main>
}
