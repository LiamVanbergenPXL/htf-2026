// Small browser API types: SpeechRecognition is not included in TypeScript's DOM library.
export type SpeechResultEvent = {
  results: ArrayLike<ArrayLike<{ transcript: string }>>
}
export type Recognition = {
  lang: string
  continuous: boolean
  interimResults: boolean
  onresult: ((event: SpeechResultEvent) => void) | null
  onerror: ((event: { error: string }) => void) | null
  onend: (() => void) | null
  start(): void
  stop(): void
  abort(): void
}
export type RecognitionConstructor = new () => Recognition
export type SpeechWindow = Window & {
  SpeechRecognition?: RecognitionConstructor
  webkitSpeechRecognition?: RecognitionConstructor
}

const speechErrors: Record<string, string> = {
  'not-allowed': 'Microfoontoegang geweigerd. Geef deze website toestemming in je browser om in te spreken.',
  'service-not-allowed': 'Spraakherkenning is niet toegestaan in deze browser.',
  'audio-capture': 'Geen microfoon gevonden. Controleer of je microfoon is aangesloten.',
  'no-speech': 'Geen spraak herkend. Probeer het opnieuw of typ je beschrijving.',
  network: 'Spraakherkenning heeft een verbindingsprobleem. Probeer opnieuw of typ je beschrijving.',
  'language-not-supported': 'Nederlandse spraakherkenning is niet beschikbaar in deze browser.',
}

export class EchoDictation {
  private recognition: Recognition | null = null
  private readonly RecognitionApi: RecognitionConstructor
  private readonly maxLength: number
  private readonly onText: (value: string) => void
  private readonly onActive: (value: boolean) => void
  private readonly onError: (value: string) => void

  constructor(
    RecognitionApi: RecognitionConstructor,
    maxLength: number,
    onText: (value: string) => void,
    onActive: (value: boolean) => void,
    onError: (value: string) => void,
  ) {
    this.RecognitionApi = RecognitionApi
    this.maxLength = maxLength
    this.onText = onText
    this.onActive = onActive
    this.onError = onError
  }

  start(existingText: string) {
    if (this.recognition) return
    if (existingText.length >= this.maxLength) {
      this.onError(`De beschrijving bevat al ${this.maxLength} tekens.`)
      return
    }
    this.onError('')
    try {
      const recognition = new this.RecognitionApi()
      this.recognition = recognition
      recognition.lang = 'nl-BE'
      recognition.continuous = true
      recognition.interimResults = true
      recognition.onresult = (event) => {
        if (this.recognition !== recognition) return
        // Results include previous phrases and revised interim results. Rebuild from
        // the text at recording start, rather than appending duplicate phrases.
        const transcript = Array.from(event.results, (result) => result[0]?.transcript.trim() ?? '')
          .filter(Boolean).join(' ')
        const separator = existingText && !/\s$/.test(existingText) && transcript ? ' ' : ''
        const text = `${existingText}${separator}${transcript}`
        this.onText(text.slice(0, this.maxLength))
        if (text.length >= this.maxLength) {
          this.onError(`De limiet van ${this.maxLength} tekens is bereikt. Controleer je beschrijving.`)
          this.stop()
        }
      }
      recognition.onerror = ({ error }) => {
        if (this.recognition !== recognition) return
        if (error !== 'aborted') this.onError(speechErrors[error] ?? 'Inspreken is niet gelukt. Probeer opnieuw of typ je beschrijving.')
        this.abort()
      }
      recognition.onend = () => {
        if (this.recognition !== recognition) return
        this.detach(recognition)
        this.recognition = null
        this.onActive(false)
      }
      this.onActive(true)
      recognition.start()
    } catch {
      this.abort()
      this.onError('De microfoon kon niet starten. Controleer je browserinstellingen en probeer opnieuw.')
    }
  }

  stop() {
    // Wait for the final result and onend before enabling submit again.
    try { this.recognition?.stop() } catch { this.abort() }
  }

  abort() {
    const recognition = this.recognition
    this.recognition = null
    if (recognition) {
      this.detach(recognition)
      try { recognition.abort() } catch { /* already ended */ }
    }
    this.onActive(false)
  }

  private detach(recognition: Recognition) {
    recognition.onresult = null
    recognition.onerror = null
    recognition.onend = null
  }
}

type SpeechBrowser = Window & { SpeechSynthesisUtterance?: typeof SpeechSynthesisUtterance }

export type SpeechPlaybackOptions = {
  onStart?: (text: string) => void
  onEnd?: () => void
}

export function rankDutchVoices(voices: SpeechSynthesisVoice[]) {
  const score = (voice: SpeechSynthesisVoice) => {
    const quality = /natural|neural|premium|enhanced|online|wavenet|studio|siri/i.test(voice.name ?? '') ? 100 : 0
    // Rank fallback voices for devices where Ellen isn't installed.
    const narrator = /\b(xander|frank|ruben|maarten)\b/i.test(voice.name ?? '') ? 30 : 0
    return quality + narrator + (voice.lang.toLowerCase().replace('_', '-') === 'nl-be' ? 20 : 10) + (voice.default ? 1 : 0)
  }
  return voices.filter((voice) => /^nl[-_]/i.test(voice.lang))
    .sort((a, b) => score(b) - score(a) || (a.name ?? '').localeCompare(b.name ?? ''))
}

function speakMessage(browser: SpeechBrowser, text: string, onComplete?: () => void, options: SpeechPlaybackOptions = {}) {
  let settled = false
  let timer: ReturnType<typeof setTimeout> | undefined
  let utterance: SpeechSynthesisUtterance | undefined
  const finish = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    options.onEnd?.()
    onComplete?.()
  }
  const cancel = () => {
    if (settled) return
    settled = true
    clearTimeout(timer)
    if (utterance) {
      utterance.onend = null
      utterance.onerror = null
      utterance.onstart = null
    }
    options.onEnd?.()
    try { browser.speechSynthesis?.cancel() } catch { /* audio unavailable */ }
  }
  if (!('speechSynthesis' in browser) || !browser.SpeechSynthesisUtterance) {
    finish()
    return cancel
  }
  try {
    utterance = new browser.SpeechSynthesisUtterance(text)
    const voices = rankDutchVoices(browser.speechSynthesis.getVoices())
    const voice = voices.find((voice) => /\bellen\b/i.test(voice.name ?? '') && voice.lang.toLowerCase().replace('_', '-') === 'nl-be')
      ?? voices.find((voice) => /\bellen\b/i.test(voice.name ?? ''))
      ?? voices[0]
    utterance.lang = voice?.lang ?? 'nl-BE'
    // Keep Ellen's natural voice instead of artificially lowering the pitch.
    utterance.rate = 0.96
    utterance.pitch = 1
    if (voice) utterance.voice = voice
    utterance.onstart = () => { if (!settled) options.onStart?.(text) }
    utterance.onend = finish
    utterance.onerror = finish
    browser.speechSynthesis.cancel()
    // Some browsers silently block audio. Don't leave dictation stuck waiting.
    timer = setTimeout(() => {
      try { browser.speechSynthesis.cancel() } catch { /* audio unavailable */ }
      finish()
    }, 12000)
    browser.speechSynthesis.speak(utterance)
  } catch {
    // Audio feedback must never block dictation or make a save appear to fail.
    finish()
  }
  return cancel
}

export function speakEchoCreated(browser: SpeechBrowser, options?: SpeechPlaybackOptions) {
  return speakMessage(browser, 'Je echo is aangemaakt, wachter. Achrona heeft je waarschuwing gehoord.', undefined, options)
}

export function speakEchoPrompt(browser: SpeechBrowser, role: 'defender' | 'commander', onReady: () => void, options?: SpeechPlaybackOptions) {
  const name = role === 'commander' ? 'Commander' : 'Defender'
  return speakMessage(browser, `${name}... wachter van Achrona. Spreek nu je echo. Ik luister.`, onReady, options)
}
