import { createServerFn } from '@tanstack/react-start'
import { createOpenAICompatible } from '@ai-sdk/openai-compatible'
import { APICallError } from 'ai'
import { desc, eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, echoImages, glitches, guardians } from '#/db/schema.ts'
import { requireGuardian } from './auth.server'
import { MAX_AURI_QUESTION_LENGTH, type AuriIncident, type AuriMessage } from './auri'
import { generateAuriAnswer } from './auri-ai.server'

export const askAuri = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = input as { question?: unknown; history?: unknown } | null
    if (!data || typeof data.question !== 'string' || !data.question.trim() || data.question.length > MAX_AURI_QUESTION_LENGTH) {
      throw new Error('Stel een vraag van 1 tot 1000 tekens.')
    }
    const history: AuriMessage[] = []
    if (Array.isArray(data.history)) {
      for (const item of data.history.slice(-8)) {
        if (item && (item.role === 'user' || item.role === 'assistant') && typeof item.content === 'string') {
          history.push({ role: item.role, content: item.content.slice(0, 800) })
        }
      }
    }
    return { question: data.question.trim(), history }
  })
  .handler(async ({ data }) => {
    if ((await requireGuardian()).guardianId.startsWith('guest-')) {
      return { success: false, error: 'Het incidentenarchief van Auri is alleen voor aangemelde Guardians.' } as const
    }
    try {
      // Load a consistent fresh snapshot, including only incident data, never credentials.
      const incidents = await db.transaction(async (tx) => {
        const rows = await tx.select().from(glitches).orderBy(desc(glitches.timestamp)).all()
        const reports = await tx.select({
          glitchId: echoes.glitchId, description: echoes.description, timestamp: echoes.timestamp,
          codename: guardians.codename, imageId: echoImages.echoId,
        }).from(echoes).innerJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
          .leftJoin(echoImages, eq(echoImages.echoId, echoes.echoId)).orderBy(desc(echoes.timestamp)).all()
        const reportsByGlitch = new Map<string, AuriIncident['echoes']>()
        for (const { glitchId, description, timestamp, codename, imageId } of reports) {
          const grouped = reportsByGlitch.get(glitchId) ?? []
          grouped.push({ description, timestamp, codename, hasImage: imageId !== null })
          reportsByGlitch.set(glitchId, grouped)
        }
        return rows.map((incident) => ({ ...incident, echoes: reportsByGlitch.get(incident.glitchId) ?? [] }))
      })
      const ollama = createOpenAICompatible({
        name: 'ollama', baseURL: process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434/v1',
      })
      const answer = await generateAuriAnswer({
        model: ollama(process.env.AURI_MODEL || 'qwen3.5:4b'),
        question: data.question, history: data.history, incidents,
      })
      return { success: true, answer } as const
    } catch (error) {
      if (process.env.NODE_ENV !== 'production' && error instanceof Error) {
        console.warn('[Auri] Local inference failed:', error.name, error.message)
      }
      if (APICallError.isInstance(error) && error.statusCode === 429) {
        return { success: false, error: 'Ollama is momenteel te druk. Wacht even en probeer opnieuw.' } as const
      }
      if (APICallError.isInstance(error) && error.statusCode === 404) {
        return { success: false, error: 'Het lokale model ontbreekt. Voer ollama pull qwen3.5:4b uit en probeer opnieuw.' } as const
      }
      return { success: false, error: 'Auri kon geen lokaal AI-antwoord ophalen. Controleer of Ollama draait (ollama serve) en probeer opnieuw.' } as const
    }
  })
