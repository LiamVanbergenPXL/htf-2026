import { randomUUID } from 'node:crypto'
import { createServerFn } from '@tanstack/react-start'
import { db } from '#/db/index.ts'
import { echoes, echoImages, glitches } from '#/db/schema.ts'
import { requireGuardian } from './auth.server'
import { MAX_ECHO_DESCRIPTION_LENGTH } from './echo'
import { isBuildingId } from './achrona-map'
import { validateEchoImage } from './echo-image.server'

export const reportEcho = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const multipart = input instanceof FormData
    const data = multipart ? { description: input.get('description'), buildingId: input.get('buildingId') } : input as { description?: unknown; buildingId?: unknown } | null
    if (!data || typeof data.description !== 'string') {
      throw new Error('Vul een beschrijving in.')
    }
    const description = data.description.trim()
    if (!description || description.length > MAX_ECHO_DESCRIPTION_LENGTH) {
      throw new Error(`Een beschrijving moet 1 tot ${MAX_ECHO_DESCRIPTION_LENGTH} tekens bevatten.`)
    }
    const image = multipart ? input.get('image') : null
    if (image !== null && !(image instanceof File)) throw new Error('Ongeldig afbeeldingsbestand.')
    const buildingId = data.buildingId ?? null
    if (buildingId !== null && !isBuildingId(buildingId)) throw new Error('Kies een geldig gebouw.')
    return { description, image, buildingId }
  })
  .handler(async ({ data }) => {
    const guardian = requireGuardian()
    const image = data.image ? await validateEchoImage(data.image) : null
    if (image && !image.success) return image
    const timestamp = new Date().toISOString()
    const glitchId = `GL-${randomUUID()}`
    const echoId = `EC-${randomUUID()}`

    // Echo, glitch and optional image commit together; no partial reports.
    db.transaction((tx) => {
      tx.insert(glitches).values({ glitchId, buildingId: data.buildingId, status: 'LEAKED', description: data.description, timestamp }).run()
      tx.insert(echoes).values({
        echoId, glitchId, description: data.description, timestamp,
        reportingGuardianId: guardian.guardianId,
      }).run()
      if (image?.success) {
        tx.insert(echoImages).values({ echoId, contentType: image.contentType, data: image.bytes }).run()
      }
    })
    return { success: true, echoId, glitchId } as const
  })
