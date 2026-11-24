import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { reportEcho } from '#/lib/echoes.functions'
import { ECHO_IMAGE_TYPES, MAX_ECHO_DESCRIPTION_LENGTH, MAX_ECHO_IMAGE_BYTES } from '#/lib/echo'

export function ReportEchoForm() {
  const router = useRouter()
  const submitEcho = useServerFn(reportEcho)
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!image) {
      setPreview('')
      return
    }
    const url = URL.createObjectURL(image)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [image])

  function removeImage() {
    setImage(null)
    if (imageInput.current) imageInput.current.value = ''
  }

  function selectImage(file: File | undefined) {
    setError('')
    if (!file) { removeImage(); return }
    if (!ECHO_IMAGE_TYPES.some((type) => type === file.type)) {
      setError('Alleen JPG, PNG en WebP zijn toegestaan.')
      removeImage()
      return
    }
    if (file.size === 0 || file.size > MAX_ECHO_IMAGE_BYTES) {
      setError('Kies een afbeelding van maximaal 5 MB die niet leeg is.')
      removeImage()
      return
    }
    setImage(file)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    setError('')
    setSuccess('')
    if (!description.trim()) {
      setError('Vul een beschrijving in.')
      return
    }
    setPending(true)
    try {
      const data = new FormData()
      data.set('description', description)
      if (image) data.set('image', image)
      const result = await submitEcho({ data })
      if (!result.success) {
        setError(result.error)
        return
      }
      setDescription('')
      removeImage()
      setSuccess('Echo gemeld. Er is een nieuwe glitch aangemaakt met status LEAKED.')
      try {
        await router.invalidate()
      } catch {
        setError('Je echo is opgeslagen. Vernieuw de pagina om het overzicht bij te werken.')
      }
    } catch {
      setError('De echo kon niet worden opgeslagen. Probeer het opnieuw.')
    } finally {
      setPending(false)
    }
  }

  return (
    <section aria-labelledby="report-echo-title" className="rounded-2xl border border-line bg-panel p-6">
      <h2 id="report-echo-title" className="text-xl font-semibold">Echo melden</h2>
      <p className="mt-1 text-sm text-muted">Meld een afwijking in Achrona. Je melding wordt automatisch een nieuwe glitch.</p>
      <form onSubmit={handleSubmit} aria-busy={pending} className="mt-5 flex flex-col gap-3">
        <label htmlFor="echo-description" className="text-sm font-medium">Beschrijving</label>
        <textarea id="echo-description" name="description" value={description}
          onChange={(event) => setDescription(event.target.value)}
          required maxLength={MAX_ECHO_DESCRIPTION_LENGTH} rows={3} disabled={pending}
          aria-describedby="echo-description-help"
          className="w-full resize-y rounded-lg border border-line bg-white px-3 py-2 outline-accent disabled:opacity-60"
          placeholder="Wat heb je opgemerkt?" />
        <p id="echo-description-help" className="text-xs text-muted">Maximaal {MAX_ECHO_DESCRIPTION_LENGTH} tekens. Je naam en het tijdstip worden automatisch toegevoegd.</p>
        <fieldset className="mt-3 rounded-xl border border-dashed border-line bg-subtle/50 p-4" disabled={pending}>
          <legend className="px-2 text-sm font-medium">Afbeelding toevoegen <span className="font-normal text-muted">(optioneel)</span></legend>
          <label htmlFor="echo-image" className="mb-3 block text-sm text-muted">Toon de ernst van de situatie met een foto of screenshot.</label>
          <input ref={imageInput} id="echo-image" name="image" type="file" accept={ECHO_IMAGE_TYPES.join(',')}
            onChange={(event) => selectImage(event.target.files?.[0])} aria-describedby="echo-image-help"
            className="block w-full min-w-0 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-accent/10 file:px-3 file:py-2 file:font-medium file:text-accent" />
          <p id="echo-image-help" className="mt-2 text-xs text-muted">Eén JPG-, PNG- of WebP-afbeelding, maximaal 5 MB.</p>
          {image ? (
            <div className="mt-4 flex flex-wrap items-start gap-4">
              {preview ? <img src={preview} alt="Voorbeeld van de geselecteerde afbeelding" className="max-h-48 max-w-full rounded-lg object-contain" /> : null}
              <div className="min-w-0">
                <p className="max-w-60 break-words text-xs text-muted">{image.name}</p>
                <button type="button" onClick={removeImage} className="mt-2 text-sm font-medium text-accent underline">Afbeelding verwijderen</button>
              </div>
            </div>
          ) : null}
        </fieldset>
        {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
        {success ? <p role="status" className="text-sm text-green-800">{success}</p> : null}
        <button type="submit" disabled={pending || !description.trim()}
          className="self-start rounded-lg bg-accent px-5 py-2.5 font-medium text-white transition hover:opacity-90 disabled:opacity-50">
          {pending ? 'Bezig met melden…' : 'Echo melden'}
        </button>
      </form>
    </section>
  )
}
