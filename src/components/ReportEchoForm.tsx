import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useRouter } from '@tanstack/react-router'
import { useServerFn } from '@tanstack/react-start'
import { Mic, Square } from 'lucide-react'
import { EchoGuardian } from '#/components/EchoGuardian'
import { AuriChat } from '#/components/AuriChat'
import { ACHRONA_BUILDINGS } from '#/lib/achrona-map'
import { reportEcho } from '#/lib/echoes.functions'
import { ECHO_IMAGE_TYPES, MAX_ECHO_DESCRIPTION_LENGTH, MAX_ECHO_IMAGE_BYTES } from '#/lib/echo'
import { EchoDictation, speakAuriAnswer, speakEchoCreated, speakEchoPrompt, type SpeechWindow } from '#/lib/echo-speech'

export function ReportEchoForm({ role, room, onGlitch }: {
  role: 'defender' | 'commander'
  room: 'gate' | 'oracle' | null
  onGlitch: (id: string) => void
}) {
  const router = useRouter()
  const submitEcho = useServerFn(reportEcho)
  const [description, setDescription] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [image, setImage] = useState<File | null>(null)
  const [preview, setPreview] = useState('')
  const imageInput = useRef<HTMLInputElement>(null)
  const dictation = useRef<EchoDictation | null>(null)
  const [speechSupported, setSpeechSupported] = useState<boolean | null>(null)
  const [listening, setListening] = useState(false)
  const [speechError, setSpeechError] = useState('')
  const [prompting, setPrompting] = useState(false)
  const cancelPrompt = useRef<(() => void) | null>(null)
  const speechActive = listening || prompting
  const [speaking, setSpeaking] = useState(false)
  const [spokenText, setSpokenText] = useState('')
  const playbackOptions = {
    onStart: (text: string) => { setSpokenText(text); setSpeaking(true) },
    onEnd: () => setSpeaking(false),
  }

  useEffect(() => {
    const browser = window as SpeechWindow
    // Warm up the browser's voice list without keeping unused selector state.
    if ('speechSynthesis' in browser) browser.speechSynthesis.getVoices()
    const RecognitionApi = browser.SpeechRecognition ?? browser.webkitSpeechRecognition
    setSpeechSupported(Boolean(RecognitionApi))
    if (RecognitionApi) {
      dictation.current = new EchoDictation(RecognitionApi, MAX_ECHO_DESCRIPTION_LENGTH,
        setDescription, setListening, setSpeechError)
    }
    return () => {
      cancelPrompt.current?.()
      dictation.current?.abort()
      dictation.current = null
      if ('speechSynthesis' in window) window.speechSynthesis.cancel()
    }
  }, [])

  function toggleDictation() {
    if (pending) return
    if (prompting) {
      cancelPrompt.current?.()
      setPrompting(false)
    } else if (listening) {
      dictation.current?.stop()
    } else {
      setSuccess('')
      setSpeechError('')
      setPrompting(true)
      cancelPrompt.current?.()
      cancelPrompt.current = speakEchoPrompt(window, role, () => {
        setPrompting(false)
        dictation.current?.start(description)
      }, playbackOptions)
    }
  }

  function readAuriAnswer(text: string) {
    if (pending || speechActive) return
    cancelPrompt.current?.()
    cancelPrompt.current = speakAuriAnswer(window, text, playbackOptions)
  }

  function stopVoice() {
    cancelPrompt.current?.()
    setPrompting(false)
  }

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
    if (pending || speechActive) return
    setError('')
    setSuccess('')
    setSpeechError('')
    if (!description.trim()) {
      setError('Vul een beschrijving in.')
      return
    }
    setPending(true)
    try {
      const data = new FormData()
      data.set('description', description)
      const location = new FormData(event.currentTarget).get('buildingId')
      if (typeof location === 'string') data.set('buildingId', location)
      if (image) data.set('image', image)
      const result = await submitEcho({ data })
      if (!result.success) {
        setError(result.error)
        return
      }
      setDescription('')
      removeImage()
      setSuccess('Echo gemeld. Er is een nieuwe glitch aangemaakt met status LEAKED.')
      cancelPrompt.current?.()
      cancelPrompt.current = speakEchoCreated(window, playbackOptions)
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
    <section hidden={!room} aria-label={room === 'oracle' ? 'Waarzeggerstoren' : 'Echo melden'} className="stat-block p-6">
      <div hidden={room !== 'gate'}>
        <h2 id="report-echo-title" className="tome-heading text-2xl">Echo melden</h2>
        <p className="mt-2 italic text-muted">Meld een afwijking in Achrona. Je melding wordt automatisch een nieuwe glitch.</p>
        <EchoGuardian speaking={speaking} listening={listening} prompting={prompting} text={spokenText} success={Boolean(success)} />
        <form onSubmit={handleSubmit} aria-busy={pending} className="mt-5 flex flex-col gap-3">
          <label className="grid gap-1 font-sc font-bold text-accent">
            Gebouw waar de glitch plaatsvindt
            <select name="buildingId" required defaultValue="" className="tome-input px-3 py-2">
              <option value="" disabled>Kies een gebouw</option>
              {ACHRONA_BUILDINGS.map(({ id, name }) => <option key={id} value={id}>{name}</option>)}
            </select>
          </label>
          <label htmlFor="echo-description" className="font-sc text-base font-bold text-accent">Beschrijving</label>
          <div className="relative">
            <textarea id="echo-description" name="description" value={description}
            onChange={(event) => setDescription(event.target.value)}
            required maxLength={MAX_ECHO_DESCRIPTION_LENGTH} rows={3} disabled={pending}
            readOnly={speechActive} aria-describedby="echo-description-help echo-speech-status"
            className="tome-input block w-full resize-y px-3 pt-2 pr-16 pb-14 disabled:opacity-60"
            placeholder="Wat heb je opgemerkt?" />
            <button type="button" onClick={toggleDictation}
              disabled={pending || !speechSupported || (!speechActive && description.length >= MAX_ECHO_DESCRIPTION_LENGTH)}
              aria-label={speechActive ? 'Stop inspreken' : 'Beschrijving inspreken'} aria-pressed={speechActive}
              title={speechActive ? 'Stop inspreken' : 'Beschrijving inspreken'}
              className={`absolute right-3 bottom-3 flex size-10 items-center justify-center rounded-full border-2 border-gilt text-[#fbf2dc] shadow-sm transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gilt disabled:opacity-40 ${speechActive ? 'bg-arcane hover:brightness-110' : 'bg-accent hover:brightness-110'}`}>
              {speechActive ? <Square aria-hidden="true" className="size-4" fill="currentColor" /> : <Mic aria-hidden="true" className="size-5" />}
            </button>
          </div>
          <p id="echo-description-help" className="text-xs text-muted">Maximaal {MAX_ECHO_DESCRIPTION_LENGTH} tekens. Je naam en het tijdstip worden automatisch toegevoegd.</p>
          <p id="echo-speech-status" role="status" className="text-xs text-muted">
            {prompting ? 'Luister naar de instructie. De microfoon start zodra de stem klaar is.'
              : listening ? 'Microfoon actief. Spreek je beschrijving in en druk op stop wanneer je klaar bent.'
              : speechSupported === false ? 'Spraakherkenning is niet beschikbaar in deze browser. Je kunt je beschrijving typen.'
                : 'Gebruik de microfoon om in te spreken. Controleer je tekst voor je de echo meldt.'}
          </p>
          {speechError ? <p role="alert" className="text-sm font-semibold text-accent">{speechError}</p> : null}
          <fieldset className="mt-3 border border-dashed border-[#a88a5c] bg-[#ecdcb6]/40 p-4" disabled={pending}>
            <legend className="px-2 font-sc font-bold text-accent">Afbeelding toevoegen <span className="font-sans font-normal italic text-muted">(optioneel)</span></legend>
            <label htmlFor="echo-image" className="mb-3 block text-sm text-muted">Toon de ernst van de situatie met een foto of screenshot.</label>
            <input ref={imageInput} id="echo-image" name="image" type="file" accept={ECHO_IMAGE_TYPES.join(',')}
              onChange={(event) => selectImage(event.target.files?.[0])} aria-describedby="echo-image-help"
              className="block w-full min-w-0 text-sm text-muted file:mr-3 file:cursor-pointer file:rounded file:border file:border-[#a88a5c] file:bg-[#fffaf0] file:px-3 file:py-1.5 file:font-sc file:font-bold file:text-accent" />
            <p id="echo-image-help" className="mt-2 text-xs text-muted">Eén JPG-, PNG- of WebP-afbeelding, maximaal 5 MB.</p>
            {image ? (
              <div className="mt-4 flex flex-wrap items-start gap-4">
                {preview ? <img src={preview} alt="Voorbeeld van de geselecteerde afbeelding" className="max-h-48 max-w-full border-4 border-[#fffaf0] object-contain shadow-md shadow-[#3c1e0a]/40" /> : null}
                <div className="min-w-0">
                  <p className="max-w-60 break-words text-xs text-muted">{image.name}</p>
                  <button type="button" onClick={removeImage} className="mt-2 text-sm font-medium text-accent underline">Afbeelding verwijderen</button>
                </div>
              </div>
            ) : null}
          </fieldset>
          {error ? <p role="alert" className="text-sm font-semibold text-accent">{error}</p> : null}
          {success ? <p role="status" className="text-sm font-semibold text-[#3d6b45]">{success}</p> : null}
          <button type="submit" disabled={pending || speechActive || !description.trim()}
            className="tome-button self-start px-5 py-2.5">
            {pending ? 'Bezig met melden…' : 'Echo melden'}
          </button>
        </form>
      </div>
      <div hidden={room !== 'oracle'}>
        <AuriChat busy={pending || speechActive} speaking={speaking} onRead={readAuriAnswer} onStop={stopVoice} onGlitch={onGlitch} />
      </div>
    </section>
  )
}
