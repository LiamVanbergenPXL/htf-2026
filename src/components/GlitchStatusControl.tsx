import { useId, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { updateGlitchStatus } from '#/lib/glitches.functions'
import { GLITCH_STATUSES, type Glitch, type GlitchStatus } from '#/lib/glitch'

export function GlitchStatusControl({ glitch }: { glitch: Glitch }) {
  const id = useId()
  const router = useRouter()
  const updateStatus = useServerFn(updateGlitchStatus)
  const [status, setStatus] = useState<GlitchStatus>(glitch.status)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || status === glitch.status) return
    setPending(true)
    setError('')
    try {
      const result = await updateStatus({ data: { glitchId: glitch.glitchId, status } })
      if (!result.success) {
        setError(result.error)
        return
      }
      try {
        await router.invalidate()
      } catch {
        setError('Status opgeslagen. Vernieuw de pagina om het overzicht bij te werken.')
      }
    } catch {
      setError('De status kon niet worden opgeslagen. Probeer het opnieuw.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">Status wijzigen voor {glitch.glitchId}</label>
        <select id={id} value={status} onChange={(event) => setStatus(event.target.value as GlitchStatus)}
          disabled={pending} className="rounded-lg border border-line bg-white px-2 py-2 text-xs outline-accent disabled:opacity-60">
          {GLITCH_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}
        </select>
        <button type="submit" disabled={pending || status === glitch.status}
          className="rounded-lg bg-accent px-3 py-2 text-xs font-medium text-white disabled:opacity-50">
          {pending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
      {error ? <p role="alert" className="max-w-64 text-xs text-red-700">{error}</p> : null}
    </form>
  )
}
