import { createFileRoute, redirect } from '@tanstack/react-router'
import { useState, type FormEvent } from 'react'
import { Activity } from 'lucide-react'
import { loginFn } from '#/lib/auth.functions'

export const Route = createFileRoute('/login')({
  beforeLoad: ({ context }) => {
    if (context.guardian) throw redirect({ to: '/' })
  },
  component: LoginPage,
})

function LoginPage() {
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
      window.location.replace('/')
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
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/25" />
      <div className="w-full max-w-md rounded-2xl border border-white/60 bg-white/95 p-8 shadow-2xl backdrop-blur-sm">
        <div className="mb-6 flex size-12 items-center justify-center rounded-xl bg-sidebar text-white">
          <Activity aria-hidden="true" className="size-7" />
        </div>
        <h1 className="text-2xl font-semibold text-fg">Guardian login</h1>
        <p className="mt-2 text-sm text-muted">Meld je aan bij het Control Center.</p>
        <form onSubmit={handleSubmit} className="mt-8 flex flex-col gap-5" aria-busy={pending}>
          <div>
            <label htmlFor="codename" className="mb-2 block text-sm font-medium">Codename</label>
            <input id="codename" name="codename" autoComplete="username" required maxLength={100}
              className="w-full rounded-lg border border-line px-3 py-2 outline-accent" />
          </div>
          <div>
            <label htmlFor="password" className="mb-2 block text-sm font-medium">Wachtwoord</label>
            <input id="password" name="password" type="password" autoComplete="current-password" required maxLength={256}
              className="w-full rounded-lg border border-line px-3 py-2 outline-accent" />
          </div>
          {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
          <button type="submit" disabled={pending}
            className="rounded-lg bg-accent px-4 py-3 font-medium text-white transition hover:opacity-90 disabled:opacity-60">
            {pending ? 'Bezig met inloggen…' : 'Inloggen'}
          </button>
        </form>
      </div>
    </main>
  )
}
