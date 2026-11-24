import { useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { addGlitchUpdate, assignGlitch } from '#/lib/glitches.functions'
import { MAX_ECHO_DESCRIPTION_LENGTH } from '#/lib/echo'
import type { Glitch } from '#/lib/glitch'

export function GlitchAssignment({ glitch, defenders, commander, canPost }: {
  glitch: Glitch
  defenders: { id: string; name: string }[]
  commander: boolean
  canPost: boolean
}) {
  const router = useRouter()
  const assign = useServerFn(assignGlitch)
  const addUpdate = useServerFn(addGlitchUpdate)
  const [defenderId, setDefenderId] = useState(glitch.assignedDefenderId ?? '')
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [feedback, setFeedback] = useState('')

  async function save(event: FormEvent) {
    event.preventDefault()
    if (pending) return
    setPending(true)
    setFeedback('')
    try {
      const result = commander
        ? await assign({ data: { glitchId: glitch.glitchId, defenderId: defenderId || null } })
        : await addUpdate({ data: { glitchId: glitch.glitchId, description } })
      if (result.error) {
        setFeedback(result.error)
        return
      }
      setDescription('')
      setFeedback('Opgeslagen.')
      await router.invalidate()
    } catch {
      setFeedback('Kon het resultaat niet laden. Vernieuw het overzicht en controleer de wijziging.')
    } finally {
      setPending(false)
    }
  }

  return (
    <details className="mt-3 text-sm">
      <summary className="cursor-pointer text-accent">Echo’s en toewijzing</summary>
      <p className="mt-2">Defender: {glitch.assignedDefender ?? 'Niet toegewezen'}</p>
      {commander || canPost ? (
        <form onSubmit={save} className="mt-2 grid gap-2">
          {commander ? (
            <label>
              Defender toewijzen
              <select value={defenderId} disabled={pending} onChange={(event) => setDefenderId(event.target.value)}
                className="block w-full rounded border border-line p-2">
                <option value="">Niet toegewezen</option>
                {defenders.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
              </select>
            </label>
          ) : (
            <label>
              Update als echo
              <textarea required maxLength={MAX_ECHO_DESCRIPTION_LENGTH} value={description} disabled={pending}
                onChange={(event) => setDescription(event.target.value)} className="block w-full rounded border border-line p-2" />
            </label>
          )}
          <button type="submit" disabled={pending || (commander ? defenderId === (glitch.assignedDefenderId ?? '') : !description.trim())}
            className="justify-self-start rounded bg-accent px-3 py-2 text-white disabled:opacity-50">
            {commander ? 'Toewijzing opslaan' : 'Update plaatsen'}
          </button>
          {feedback ? <p role="status">{feedback}</p> : null}
        </form>
      ) : null}
      {glitch.updates?.length ? (
        <ul className="mt-3 grid gap-2">
          {glitch.updates.map((update) => (
            <li key={update.id} className="border-t border-line pt-2">
              <p className="font-medium">{update.author} · {update.timestamp.slice(0, 10)}</p>
              <p className="whitespace-pre-wrap">{update.text}</p>
            </li>
          ))}
        </ul>
      ) : <p className="mt-2 text-muted">Nog geen echo’s.</p>}
    </details>
  )
}
