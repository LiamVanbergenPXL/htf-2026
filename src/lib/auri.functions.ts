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
    const data = input as { question?: unknown; history?: unknown; glitchId?: unknown } | null
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
    if (data.glitchId !== undefined && (typeof data.glitchId !== 'string' || !/^[a-z0-9-]{1,100}$/i.test(data.glitchId))) {
      throw new Error('Ongeldige glitch-ID.')
    }
    return { question: data.question.trim(), history, glitchId: data.glitchId }
  })
  .handler(async ({ data }) => {
    if ((await requireGuardian()).guardianId.startsWith('guest-')) {
      return { success: false, error: 'Het incidentenarchief van Auri is alleen voor aangemelde Guardians.' } as const
    }
    const apiKey = process.env.OLLAMA_API_KEY?.trim()
    const baseURL = process.env.OLLAMA_BASE_URL?.trim().replace(/\/+$/, '') ||
      (apiKey ? 'https://ollama.com/v1' : 'http://127.0.0.1:11434/v1')
    const cloud = /^https:\/\/ollama\.com(?:\/|$)/i.test(baseURL)
    const incidentFilter = data.glitchId ? eq(glitches.glitchId, data.glitchId) : undefined
    const echoFilter = data.glitchId ? eq(echoes.glitchId, data.glitchId) : undefined
    try {
      // Load a consistent fresh snapshot, including only incident data, never credentials.
      const incidents = await db.transaction(async (tx) => {
        const rows = await tx.select().from(glitches).where(incidentFilter).orderBy(desc(glitches.timestamp)).all()
        const reports = await tx.select({
          glitchId: echoes.glitchId, description: echoes.description, timestamp: echoes.timestamp,
          codename: guardians.codename, imageId: echoImages.echoId,
        }).from(echoes).innerJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
          .leftJoin(echoImages, eq(echoImages.echoId, echoes.echoId)).where(echoFilter).orderBy(desc(echoes.timestamp)).all()
        const reportsByGlitch = new Map<string, AuriIncident['echoes']>()
        for (const { glitchId, description, timestamp, codename, imageId } of reports) {
          const grouped = reportsByGlitch.get(glitchId) ?? []
          grouped.push({ description, timestamp, codename, hasImage: imageId !== null })
          reportsByGlitch.set(glitchId, grouped)
        }
        return rows.map((incident) => ({ ...incident, echoes: reportsByGlitch.get(incident.glitchId) ?? [] }))
      })
      if (data.glitchId && !incidents.length) {
        return { success: false, error: 'Deze glitch bestaat niet meer.' } as const
      }
      const ollama = createOpenAICompatible({
        name: 'ollama', baseURL, apiKey,
      })
      const answer = await generateAuriAnswer({
        model: ollama(process.env.AURI_MODEL?.trim() || (cloud ? 'gemma4:31b' : 'qwen3.5:4b')),
        disableReasoning: !cloud,
        question: data.glitchId
          ? `Maak een concreet stappenplan voor glitch ${data.glitchId}. Geef precies drie genummerde stappen op aparte regels. Gebruik de beschrijving, huidige status en recente echo’s. Vermeld welke verificatie nodig is en stel alleen acties voor die passen bij het gemelde probleem. Als informatie ontbreekt, laat de eerste stap die informatie achterhalen.`
          : data.question,
        history: data.glitchId ? [] : data.history, incidents,
      })
      return { success: true, answer } as const
    } catch (error) {
      const status = APICallError.isInstance(error) ? error.statusCode : undefined
      console.warn('[Auri] AI-aanroep mislukt', { cloud, status, type: error instanceof Error ? error.name : 'unknown' })
      if (status === 401 || status === 403) {
        return { success: false, error: 'Ollama weigert de toegang. Controleer de API-sleutel en de modeltoegang.' } as const
      }
      if (cloud && status === 402) {
        return { success: false, error: 'Ollama Cloud vraagt om betaling (HTTP 402). Controleer het gebruik en abonnement van het gekoppelde Ollama-account.' } as const
      }
      if (cloud && status === 404) {
        return { success: false, error: 'Ollama Cloud vindt het ingestelde model of API-adres niet. Controleer AURI_MODEL en OLLAMA_BASE_URL.' } as const
      }
      if (APICallError.isInstance(error) && error.statusCode === 429) {
        return { success: false, error: 'Ollama is momenteel te druk. Wacht even en probeer opnieuw.' } as const
      }
      if (APICallError.isInstance(error) && error.statusCode === 404) {
        return { success: false, error: 'Het lokale model ontbreekt. Voer ollama pull qwen3.5:4b uit en probeer opnieuw.' } as const
      }
      return { success: false, error: cloud ? 'Auri kon geen antwoord ophalen bij Ollama Cloud. Probeer opnieuw.' : 'Auri kon geen lokaal AI-antwoord ophalen. Controleer of Ollama draait (ollama serve) en probeer opnieuw.' } as const
    }
  })
