import { createServerFn } from '@tanstack/react-start'
import { desc, eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, echoImages, glitches } from '#/db/schema.ts'
import type { Glitch } from '#/lib/glitch.ts'
import { requireGuardian } from './auth.server'
import { GLITCH_STATUSES, type GlitchStatus } from './glitch'

export const getGlitches = createServerFn({ method: 'GET' }).handler(
  async (): Promise<Glitch[]> => {
    requireGuardian()
    const rows = db.select().from(glitches).orderBy(desc(glitches.timestamp)).all()
    // Fetch only attachment IDs here; full image bytes have their own protected route.
    const images = db.select({ echoId: echoImages.echoId, glitchId: echoes.glitchId })
      .from(echoImages).innerJoin(echoes, eq(echoImages.echoId, echoes.echoId)).all()
    const imagesByGlitch = new Map<string, string[]>()
    for (const image of images) {
      const ids = imagesByGlitch.get(image.glitchId) ?? []
      ids.push(image.echoId)
      imagesByGlitch.set(image.glitchId, ids)
    }
    return rows.map((glitch) => ({ ...glitch, imageEchoIds: imagesByGlitch.get(glitch.glitchId) ?? [] }))
  },
)

export const updateGlitchStatus = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = input as { glitchId?: unknown; status?: unknown } | null
    if (!data || typeof data.glitchId !== 'string' || !data.glitchId.trim() || data.glitchId.length > 100
      || typeof data.status !== 'string' || !GLITCH_STATUSES.includes(data.status as GlitchStatus)) {
      throw new Error('Ongeldige glitch of status.')
    }
    return { glitchId: data.glitchId, status: data.status as GlitchStatus }
  })
  .handler(({ data }) => {
    const guardian = requireGuardian()
    if (guardian.role !== 'commander') {
      return { success: false, error: 'Alleen commanders mogen de status wijzigen.' } as const
    }
    const result = db.update(glitches).set({ status: data.status })
      .where(eq(glitches.glitchId, data.glitchId)).run()
    if (result.changes === 0) return { success: false, error: 'Deze glitch bestaat niet meer.' } as const
    return { success: true } as const
  })
