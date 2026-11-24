import { useId, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { updateGlitchType } from '#/lib/glitches.functions'
import { GLITCH_TYPES, GLITCH_TYPE_LABELS, type Glitch, type GlitchType } from '#/lib/glitch'

/** Value the select uses for "no type", since a select cannot hold null. */
const UNTYPED = ''

/** Commander control to classify a glitch or correct a wrongly chosen type. Mirrors GlitchStatusControl. */
export function GlitchTypeControl({ glitch }: { glitch: Pick<Glitch, 'glitchId' | 'glitchType'> }) {
  const id = useId()
  const router = useRouter()
  const updateType = useServerFn(updateGlitchType)
  const current = glitch.glitchType ?? UNTYPED
  const [type, setType] = useState<GlitchType | typeof UNTYPED>(current)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || type === current) return
    setPending(true)
    setError('')
    try {
      const result = await updateType({ data: { glitchId: glitch.glitchId, glitchType: type === UNTYPED ? null : type } })
      if (!result.success) {
        setError(result.error)
        return
      }
      try {
        await router.invalidate()
      } catch {
        setError('Type opgeslagen. Vernieuw de pagina om het overzicht bij te werken.')
      }
    } catch {
      setError('Het type kon niet worden opgeslagen. Probeer het opnieuw.')
    } finally {
      setPending(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} aria-busy={pending} className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="sr-only">Type wijzigen voor {glitch.glitchId}</label>
        <select id={id} value={type} onChange={(event) => setType(event.target.value as GlitchType | typeof UNTYPED)}
          disabled={pending} className="tome-select px-2 py-1.5 text-sm disabled:opacity-60">
          {GLITCH_TYPES.map((value) => <option key={value} value={value}>{GLITCH_TYPE_LABELS[value]}</option>)}
          <option value={UNTYPED}>Zonder type</option>
        </select>
        <button type="submit" disabled={pending || type === current} className="tome-button px-3 py-1.5 text-sm">
          {pending ? 'Opslaan…' : 'Opslaan'}
        </button>
      </div>
      {error ? <p role="alert" className="max-w-64 text-xs font-semibold text-accent">{error}</p> : null}
    </form>
  )
}
