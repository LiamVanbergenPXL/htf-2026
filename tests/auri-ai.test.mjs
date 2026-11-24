import assert from 'node:assert/strict'
import test from 'node:test'
import { MockLanguageModelV4 } from 'ai/test'
import { buildIncidentSnapshot, generateAuriAnswer } from '../src/lib/auri-ai.server.ts'

const incidents = [
  { glitchId: 'GL-0001', status: 'LEAKED', description: 'Rook bij de poort', timestamp: '2026-11-24T09:00:00Z', echoes: [
    { description: 'Veel rook gezien', timestamp: '2026-11-24T09:01:00Z', codename: 'defender', hasImage: true },
  ] },
  { glitchId: 'GL-0002', status: 'FIXED', description: 'Portaal hersteld', timestamp: '2026-11-23T09:00:00Z', echoes: [] },
]
const checkedAt = '2026-11-24T10:00:00Z'

function mockModel(reply, inspect = () => {}) {
  return new MockLanguageModelV4({
    doGenerate: async (request) => {
      inspect(request)
      return {
        content: [{ type: 'text', text: reply.content }],
        finishReason: { unified: 'stop', raw: 'stop' },
        usage: {
          inputTokens: { total: 10, noCache: 10, cacheRead: undefined, cacheWrite: undefined },
          outputTokens: { total: 20, text: 20, reasoning: undefined },
        },
        warnings: [],
      }
    },
  })
}

test('snapshot has exact global counts, echo context and no invented severity', () => {
  const snapshot = buildIncidentSnapshot(incidents, 'Hoeveel zijn actief?', [], checkedAt)
  assert.equal(snapshot.total, 2)
  assert.equal(snapshot.active, 1)
  assert.equal(snapshot.counts.FIXED, 1)
  assert.equal(snapshot.counts.LEAKED, 1)
  assert.equal(snapshot.incidents[0].echoes[0].hasImage, true)
  assert.equal(snapshot.separateAlertSource, false)
  assert.equal(snapshot.truncated, false)
})

test('Desync simulator glitches are flagged as drills, with their own count', () => {
  const drill = { glitchId: 'SIM-1A2B3C4D', status: 'LEAKED', description: 'Runen herschrijven zichzelf', timestamp: '2026-11-24T09:30:00Z', echoes: [] }
  const snapshot = buildIncidentSnapshot([...incidents, drill], 'Wat is er aan de hand?', [], checkedAt)
  assert.equal(snapshot.simulated, 1)
  assert.equal(snapshot.incidents.find((row) => row.glitchId === 'SIM-1A2B3C4D').simulated, true)
  assert.equal(snapshot.incidents.find((row) => row.glitchId === 'GL-0001').simulated, false)
})

test('large context is bounded but preserves full counts and prioritizes a requested old ID', () => {
  const many = Array.from({ length: 80 }, (_, i) => ({ ...incidents[0], glitchId: `GL-${i + 1000}`, description: 'x'.repeat(2000), echoes: [] }))
  const snapshot = buildIncidentSnapshot(many, 'Vertel over GL-1079', [], checkedAt)
  assert.equal(snapshot.total, 80)
  assert.equal(snapshot.active, 80)
  assert.equal(snapshot.incidents[0].glitchId, 'GL-1079')
  assert.ok(snapshot.incidents.length < 30)
  assert.equal(snapshot.truncated, true)
  assert.ok(JSON.stringify(snapshot).length < 11000)
})

test('real SDK generation uses current data and returns validated incident sources', async () => {
  let calls = 0
  const answer = await generateAuriAnswer({
    model: mockModel({ content: 'Er is één actief incident: GL-0001, rook bij de poort.', sourceIds: ['GL-0001'] }, request => {
      calls++
      const prompt = JSON.stringify(request.prompt)
      assert.match(prompt, /Rook bij de poort/)
      assert.match(prompt, /actuele JSON-snapshot/)
      assert.match(prompt, /Eerdere vraag/)
      assert.match(prompt, /nu actief/)
    }),
    question: 'Wat is nu actief?', history: [{ role: 'user', content: 'Eerdere vraag' }], incidents, checkedAt,
  })
  assert.equal(calls, 1)
  assert.equal(answer.sources.length, 1)
  assert.equal(answer.sources[0].glitchId, 'GL-0001')
  assert.equal(answer.sources[0].status, 'LEAKED')
  assert.equal(answer.checkedAt, checkedAt)
})

test('an unknown incident reference never becomes a clickable source', async () => {
  const answer = await generateAuriAnswer({
    model: mockModel({ content: 'GL-FAKE is kritiek.', sourceIds: ['GL-FAKE'] }),
    question: 'Wat is urgent?', history: [], incidents, checkedAt,
  })
  assert.equal(answer.sources.length, 0)
})

test('empty AI output is rejected', async () => {
  await assert.rejects(generateAuriAnswer({
    model: mockModel({ content: '', sourceIds: ['GL-0001'] }),
    question: 'Wat is actief?', history: [], incidents, checkedAt,
  }))
})

test('Ollama adapter requests plain-text answers without a grammar dependency', async () => {
  const { createOpenAICompatible } = await import('@ai-sdk/openai-compatible')
  const provider = createOpenAICompatible({
    name: 'ollama', baseURL: 'http://127.0.0.1:11434/v1', supportsStructuredOutputs: true,
    fetch: async (url, init) => {
      assert.match(String(url), /^http:\/\/127\.0\.0\.1:11434\/v1\/chat\/completions$/)
      const body = JSON.parse(init.body)
      assert.equal(body.model, 'qwen3.5:4b')
      assert.equal(body.reasoning_effort, 'none')
      assert.equal(body.response_format, undefined)
      assert.match(JSON.stringify(body.messages), /gewone tekst/)
      assert.equal(body.max_tokens, 700)
      return Response.json({
        id: 'local-test', created: 1, model: 'qwen3.5:4b', object: 'chat.completion',
        choices: [{ index: 0, finish_reason: 'stop', message: {
          role: 'assistant', content: 'Eén actief incident: GL-0001.',
        } }],
        usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
      })
    },
  })
  const answer = await generateAuriAnswer({
    model: provider('qwen3.5:4b'), question: 'Wat is actief?', incidents, history: [], checkedAt,
  })
  assert.match(answer.content, /GL-0001/)
})

test('a clarification about an unknown ID is allowed without creating a false source', async () => {
  const answer = await generateAuriAnswer({
    model: mockModel({ content: 'GL-9999 staat niet in de meegegeven incidentgegevens. Welk incident bedoel je?', sourceIds: [] }),
    question: 'Wat is GL-9999?', history: [], incidents, checkedAt,
  })
  assert.equal(answer.sources.length, 0)
  assert.match(answer.content, /Welk incident/)
})
