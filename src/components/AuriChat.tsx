import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { MessageCircle, Send, Volume2, Square } from 'lucide-react'
import { askAuri } from '#/lib/auri.functions'
import { MAX_AURI_QUESTION_LENGTH, type AuriAnswer, type AuriMessage } from '#/lib/auri'

type ChatMessage = AuriMessage & { id: number; sources?: AuriAnswer['sources']; checkedAt?: string }
const suggestions = ['Welke incidenten zijn actief?', 'Hoeveel glitches zijn nieuw?', 'Wat betekenen de statussen?']

type AuriChatProps = {
  busy: boolean
  speaking: boolean
  onRead: (text: string) => void
  onStop: () => void
  onGlitch: (id: string) => void
}

export function AuriChat({ busy, speaking, onRead, onStop, onGlitch }: AuriChatProps) {
  const ask = useServerFn(askAuri)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [question, setQuestion] = useState('')
  const [pending, setPending] = useState(false)
  const [error, setError] = useState('')
  const nextId = useRef(0)
  const log = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (log.current) log.current.scrollTop = log.current.scrollHeight
  }, [messages, pending])

  async function sendQuestion(value: string) {
    const text = value.trim()
    if (!text || pending || busy) return
    const previous = messages
    setPending(true)
    setError('')
    // Start speech in the user's click/submit gesture, before waiting on Ollama.
    // This also enables subsequent answer playback in browsers such as Safari.
    onRead('Een ogenblik, wachter. Ik raadpleeg de kronieken van Achrona.')
    setMessages([...previous, { id: nextId.current++, role: 'user', content: text }])
    try {
      const result = await ask({ data: {
        question: text,
        history: previous.slice(-8).map(({ role, content }) => ({ role, content })),
      } })
      if (!result.success) {
        setMessages(previous)
        setQuestion(text)
        setError(result.error)
        return
      }
      const reply: ChatMessage = {
        id: nextId.current++, role: 'assistant' as const, content: result.answer.content,
        sources: result.answer.sources, checkedAt: result.answer.checkedAt,
      }
      setMessages((current) => [...current, reply].slice(-30))
      setQuestion('')
      onRead(reply.content)
    } catch {
      setMessages(previous)
      setQuestion(text)
      setError('Auri kon de incidentgegevens niet ophalen. Probeer het opnieuw.')
    } finally {
      setPending(false)
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void sendQuestion(question)
  }

  return (
    <section aria-labelledby="auri-chat-title" className="mt-5 rounded-xl border border-violet-200 bg-violet-50/40 p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 id="auri-chat-title" className="flex items-center gap-2 text-sm font-semibold text-violet-950"><MessageCircle aria-hidden="true" className="size-4" /> Vraag Auri</h3>
        <div className="flex items-center gap-3">
          {speaking ? <button type="button" onClick={onStop} className="inline-flex items-center gap-1 text-xs text-accent"><Square aria-hidden="true" className="size-3" /> Stop stem</button> : null}
          {messages.length ? <button type="button" disabled={pending || busy} onClick={() => { onStop(); setMessages([]); setError('') }} className="text-xs text-muted underline disabled:opacity-50">Nieuw gesprek</button> : null}
        </div>
      </div>
      <p className="mt-1 text-xs text-muted">AI via Ollama, met actuele incidentgegevens als context. Vraag naar een status, glitch-ID of aanpak.</p>
      <p className="mt-2 text-xs text-violet-700">Auri spreekt haar antwoorden automatisch uit.</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {suggestions.map((suggestion) => <button key={suggestion} type="button" disabled={pending || busy}
          onClick={() => void sendQuestion(suggestion)} className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs text-violet-900 transition hover:bg-violet-100 disabled:opacity-50">{suggestion}</button>)}
      </div>
      {messages.length || pending ? (
        <div ref={log} role="log" aria-label="Gesprek met Auri" aria-live="polite" aria-relevant="additions" className="mt-4 flex max-h-80 flex-col gap-3 overflow-y-auto pr-1">
          {messages.map((message) => (
            <div key={message.id} className={`max-w-[95%] rounded-xl px-4 py-3 text-sm ${message.role === 'user' ? 'self-end bg-accent text-white' : 'self-start border border-violet-100 bg-white text-fg'}`}>
              <p className={`mb-1 text-[10px] font-semibold uppercase tracking-wide ${message.role === 'user' ? 'text-white/75' : 'text-violet-700'}`}>{message.role === 'user' ? 'Jij' : 'Auri'}</p>
              <p className="whitespace-pre-wrap leading-relaxed [overflow-wrap:anywhere]">{message.content}</p>
              {message.sources?.length ? (
                <div className="mt-3 border-t border-line pt-2">
                  <p className="text-[10px] font-medium text-muted">Gebruikte incidenten</p>
                  <div className="mt-1 flex flex-wrap gap-2">
                    {message.sources.map((source) => <a key={source.glitchId} href={`#glitch-${source.glitchId}`} title={source.description}
                      onClick={(event) => {
                        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
                        event.preventDefault()
                        onGlitch(source.glitchId)
                      }}
                      className="max-w-48 truncate text-xs font-medium text-accent underline">{source.glitchId} · {source.status}</a>)}
                  </div>
                </div>
              ) : null}
              {message.role === 'assistant' ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <button type="button" onClick={() => onRead(message.content)} disabled={busy || speaking}
                    className="inline-flex items-center gap-1 text-xs text-accent disabled:opacity-40"><Volume2 aria-hidden="true" className="size-3.5" /> Voorlezen</button>
                  {message.checkedAt ? <time dateTime={message.checkedAt} className="text-[10px] text-muted">Gegevens opgehaald om {new Date(message.checkedAt).toLocaleTimeString('nl-BE', { hour: '2-digit', minute: '2-digit' })}</time> : null}
                </div>
              ) : null}
            </div>
          ))}
          {pending ? <p role="status" className="px-2 text-xs text-violet-700">Auri bekijkt de meldingen…</p> : null}
        </div>
      ) : null}
      <form onSubmit={handleSubmit} className="mt-4 flex flex-col gap-2">
        <label htmlFor="auri-question" className="sr-only">Vraag aan Auri</label>
        <div className="flex items-end gap-2">
          <textarea id="auri-question" name="question" rows={2} value={question} onChange={(event) => setQuestion(event.target.value)}
            required maxLength={MAX_AURI_QUESTION_LENGTH} disabled={pending || busy} placeholder="Bijvoorbeeld: welke glitches hebben een afbeelding?"
            className="min-w-0 flex-1 resize-y rounded-lg border border-line bg-white px-3 py-2 text-sm outline-accent disabled:opacity-60" />
          <button type="submit" disabled={pending || busy || !question.trim()} aria-label="Vraag aan Auri versturen"
            className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-accent text-white disabled:opacity-40"><Send aria-hidden="true" className="size-4" /></button>
        </div>
        {error ? <p role="alert" className="text-xs text-red-700">{error}</p> : null}
      </form>
    </section>
  )
}
