import assert from 'node:assert/strict'
import test from 'node:test'
import { EchoDictation, rankDutchVoices, speakEchoCreated, speakEchoPrompt } from '../src/lib/echo-speech.ts'

function setup(maxLength = 2000) {
  let recognition
  const state = { text: '', active: false, error: '' }
  class MockRecognition {
    onresult = null
    onerror = null
    onend = null
    stopped = false
    aborted = false
    constructor() { recognition = this }
    start() {}
    stop() { this.stopped = true }
    abort() { this.aborted = true }
  }
  const dictation = new EchoDictation(MockRecognition, maxLength,
    value => { state.text = value }, value => { state.active = value }, value => { state.error = value })
  return { state, dictation, recognition: () => recognition }
}

function results(...phrases) {
  return { results: phrases.map(transcript => [{ transcript }]) }
}

test('Dutch dictation preserves typed text and replaces revised interim results without duplication', () => {
  const { state, dictation, recognition } = setup()
  dictation.start('Er is een probleem:')
  assert.equal(state.active, true)
  assert.equal(recognition().lang, 'nl-BE')
  assert.equal(recognition().interimResults, true)
  recognition().onresult(results('de poort'))
  assert.equal(state.text, 'Er is een probleem: de poort')
  recognition().onresult(results('de poort is kapot.', 'Er komt rook uit.'))
  assert.equal(state.text, 'Er is een probleem: de poort is kapot. Er komt rook uit.')
  dictation.stop()
  assert.equal(recognition().stopped, true)
  assert.equal(state.active, true)
  recognition().onresult(results('De poort is kapot.', 'Er komt rook uit.'))
  recognition().onend()
  assert.equal(state.active, false)
  assert.equal(state.text, 'Er is een probleem: De poort is kapot. Er komt rook uit.')
})

test('a new recording continues from the edited description', () => {
  const { state, dictation, recognition } = setup()
  dictation.start('')
  recognition().onresult(results('Eerste melding.'))
  recognition().onend()
  dictation.start('Verbeterde melding. ')
  recognition().onresult(results('Tweede zin.'))
  assert.equal(state.text, 'Verbeterde melding. Tweede zin.')
})

test('speech respects the description length limit and stops with feedback', () => {
  const { state, dictation, recognition } = setup(15)
  dictation.start('Test')
  recognition().onresult(results('Dit is een veel te lange zin.'))
  assert.equal(state.text.length, 15)
  assert.equal(recognition().stopped, true)
  assert.match(state.error, /limiet/)
})

test('permission and network errors keep text intact and release the microphone', () => {
  for (const error of ['not-allowed', 'audio-capture', 'network', 'no-speech']) {
    const { state, dictation, recognition } = setup()
    dictation.start('')
    recognition().onresult(results('Bewaar deze tekst.'))
    recognition().onerror({ error })
    assert.equal(state.active, false)
    assert.equal(state.text, 'Bewaar deze tekst.')
    assert.ok(state.error)
    assert.equal(recognition().aborted, true)
    assert.equal(recognition().onresult, null)
  }
})

test('cleanup discards late recognition events so a saved or cleared form stays empty', () => {
  const { state, dictation, recognition } = setup()
  dictation.start('')
  const lateResult = recognition().onresult
  dictation.abort()
  lateResult(results('Late transcript'))
  assert.equal(state.text, '')
  assert.equal(state.active, false)
  assert.equal(recognition().aborted, true)
})

test('failed recognition startup is recoverable', () => {
  const state = { active: false, error: '' }
  class FailedRecognition { start() { throw new Error('blocked') } abort() {} }
  const dictation = new EchoDictation(FailedRecognition, 2000, () => {},
    value => { state.active = value }, value => { state.error = value })
  dictation.start('')
  assert.equal(state.active, false)
  assert.match(state.error, /niet starten/)
})

test('voice confirmation prefers a Flemish voice and never breaks saving if audio fails', () => {
  const spoken = []
  const voice = { lang: 'nl-BE' }
  const browser = {
    SpeechSynthesisUtterance: class { constructor(text) { this.text = text } },
    speechSynthesis: { getVoices: () => [{ lang: 'en-US' }, voice], cancel() {}, speak(value) { spoken.push(value) } },
  }
  speakEchoCreated(browser)
  assert.match(spoken[0].text, /echo is aangemaakt/)
  assert.equal(spoken[0].lang, 'nl-BE')
  assert.equal(spoken[0].voice, voice)
  assert.equal(spoken[0].rate, 0.96)
  assert.equal(spoken[0].pitch, 1)
  spoken[0].onend()
  assert.doesNotThrow(() => speakEchoCreated({}))
  browser.speechSynthesis.speak = () => { throw new Error('audio blocked') }
  assert.doesNotThrow(() => speakEchoCreated(browser))
})

function promptBrowser() {
  const spoken = []
  return {
    spoken,
    browser: {
      SpeechSynthesisUtterance: class { constructor(text) { this.text = text } },
      speechSynthesis: { getVoices: () => [], cancel() {}, speak(value) { spoken.push(value) } },
    },
  }
}

test('role-specific introduction finishes before the microphone starts', () => {
  for (const role of ['defender', 'commander']) {
    const { browser, spoken } = promptBrowser()
    let started = 0
    speakEchoPrompt(browser, role, () => { started++ })
    assert.equal(started, 0)
    assert.equal(spoken[0].text, `${role === 'defender' ? 'Defender' : 'Commander'}... wachter van Achrona. Spreek nu je echo. Ik luister.`)
    spoken[0].onend()
    assert.equal(started, 1)
    spoken[0].onend()
    assert.equal(started, 1)
  }
})

test('cancelling the instruction prevents late audio events from starting dictation', () => {
  const { browser, spoken } = promptBrowser()
  let started = false
  const cancel = speakEchoPrompt(browser, 'defender', () => { started = true })
  const lateEnd = spoken[0].onend
  cancel()
  lateEnd()
  assert.equal(started, false)
  assert.equal(spoken[0].onend, null)
})

test('unavailable or failed speech output still allows dictation', () => {
  let started = 0
  speakEchoPrompt({}, 'defender', () => { started++ })
  assert.equal(started, 1)
  const { browser, spoken } = promptBrowser()
  speakEchoPrompt(browser, 'commander', () => { started++ })
  spoken[0].onerror()
  assert.equal(started, 2)
})

test('natural Dutch voices are preferred over basic voices without choosing an English voice', () => {
  const basic = { name: 'Ellen', lang: 'nl-BE', voiceURI: 'basic' }
  const natural = { name: 'Colette Online (Natural)', lang: 'nl-NL', voiceURI: 'natural' }
  const english = { name: 'English Premium', lang: 'en-US', voiceURI: 'english' }
  const available = [basic, natural, english]
  assert.deepEqual(rankDutchVoices(available), [natural, basic])
  assert.deepEqual(available, [basic, natural, english])
})

test('the character speaks only on actual audio start, and stops on finish or cancellation', () => {
  const { browser, spoken } = promptBrowser()
  const events = []
  const cancel = speakEchoCreated(browser, {
    onStart: text => events.push(['start', text]),
    onEnd: () => events.push(['end']),
  })
  assert.deepEqual(events, [])
  const lateStart = spoken[0].onstart
  spoken[0].onstart()
  assert.match(events[0][1], /echo is aangemaakt/)
  cancel()
  assert.equal(events[1][0], 'end')
  lateStart()
  assert.equal(events.length, 2)
})

test('Ellen nl-BE is fixed even when another voice ranks higher', () => {
  const { browser, spoken } = promptBrowser()
  const basic = { name: 'Ellen', lang: 'nl-BE', voiceURI: 'basic' }
  const natural = { name: 'Natural', lang: 'nl-NL', voiceURI: 'natural' }
  browser.speechSynthesis.getVoices = () => [basic, natural]
  speakEchoCreated(browser)
  assert.equal(spoken[0].voice, basic)
  assert.equal(spoken[0].lang, 'nl-BE')
  spoken[0].onend()
})

test('automatic narrator preference preserves quality priority and Dutch language filtering', () => {
  const basic = { name: 'Ellen', lang: 'nl-BE', voiceURI: 'basic' }
  const narrator = { name: 'Xander', lang: 'nl-NL', voiceURI: 'narrator' }
  const natural = { name: 'Colette Natural', lang: 'nl-NL', voiceURI: 'natural' }
  assert.deepEqual(rankDutchVoices([basic, narrator]), [narrator, basic])
  assert.deepEqual(rankDutchVoices([narrator, natural]), [natural, narrator])
})
