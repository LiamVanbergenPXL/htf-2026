import { JoinCode } from '#/components/JoinCode'
import { playerUrl } from '#/lib/player-slot'
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { D20 } from '#/components/ui/D20'
import { loginFn } from '#/lib/auth.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context, search }) => {
    if (context.guardian) throw redirect({ to: '/', search })
  },
  component: LoginPage,
})

function LoginPage() {
  const { speler } = Route.useSearch()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    setError('')
    setPending(true)
    try {
      const result = await loginFn({ data: {
        codename: String(form.get('codename') ?? ''),
        password: String(form.get('password') ?? ''),
      } })
      if (!result.success) {
        setError(result.error)
        setPending(false)
        return
      }
      // Start with fresh route data after the session cookie has been set.
      window.location.replace(playerUrl('/', speler))
    } catch {
      setError('Inloggen is niet gelukt. Probeer het opnieuw.')
      setPending(false)
    }
  }

  return (
    <main
      className="relative isolate flex min-h-screen min-h-dvh items-center justify-center bg-[#140f20] bg-cover bg-center bg-no-repeat px-5 py-12"
      style={{ backgroundImage: 'url(/images/achrona-login.png)' }}
    >
      <JoinCode />
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/35" />
      <div className="stat-block w-full max-w-md p-8 shadow-2xl shadow-black/60">
        <div className="mb-5 flex justify-center text-accent">
          <D20 className="size-14" faceClassName="fill-gilt/30" />
        </div>
        <p className="team-signature text-center">De Hexecuters</p>
        <h1 className="text-center font-display text-4xl text-fg">Guardian login</h1>
        <p className="read-aloud mt-4 text-fg">Meld je aan bij het Control Center.</p>
        <a className="tome-button mt-4 inline-block px-4 py-2" href="/play">Speel mee als gast</a>
        <form onSubmit={handleSubmit} className="mt-7 flex flex-col gap-5" aria-busy={pending}>
          <div>
            <label htmlFor="codename" className="mb-1.5 block font-sc text-base font-bold text-accent">Codename</label>
            <input id="codename" name="codename" autoComplete="username" required maxLength={100}
              className="tome-input w-full px-3 py-2" />
          </div>
          <div>
            <label htmlFor="password" className="mb-1.5 block font-sc text-base font-bold text-accent">Wachtwoord</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256}
              className="tome-input w-full px-3 py-2" />
          </div>
          {error ? <p role="alert" className="text-sm font-semibold text-accent">{error}</p> : null}
          <button type="submit" disabled={pending}
            className="tome-button px-4 py-3">
            {pending ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}
