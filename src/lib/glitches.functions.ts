import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { randomUUID } from 'node:crypto'
import { MAX_ECHO_DESCRIPTION_LENGTH } from './echo'
import { requireGuardian } from './auth.server'
import { readGlitchOverview } from './glitch-overview.server'
import { GLITCH_STATUSES, type GlitchStatus } from './glitch'

export const getGlitches = createServerFn({ method: 'GET' })
  .handler(() => readGlitchOverview(requireGuardian().role))


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

export const assignGlitch = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; defenderId: string | null }) => input)
  .handler(({ data }) => {
    if (requireGuardian().role !== 'commander') return { error: 'Alleen commanders mogen glitches toewijzen.' }
    return db.transaction((tx) => {
      if (typeof data?.glitchId !== 'string' || (data.defenderId !== null && typeof data.defenderId !== 'string')) {
        return { error: 'Ongeldige toewijzing.' }
      }
      if (data.defenderId !== null) {
        const defender = tx.select().from(guardians).where(eq(guardians.guardianId, data.defenderId)).get()
        if (defender?.role !== 'defender') return { error: 'Kies een geldige defender.' }
      }
      const result = tx.update(glitches).set({ assignedDefenderId: data.defenderId })
        .where(eq(glitches.glitchId, data.glitchId)).run()
      return result.changes ? {} : { error: 'Deze glitch bestaat niet meer.' }
    })
  })

export const addGlitchUpdate = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; description: string }) => input)
  .handler(({ data }) => {
    const guardian = requireGuardian()
    const description = typeof data?.description === 'string' ? data.description.trim() : ''
    if (typeof data?.glitchId !== 'string' || !description || description.length > MAX_ECHO_DESCRIPTION_LENGTH) {
      return { error: 'Vul een geldige beschrijving in.' }
    }
    return db.transaction((tx) => {
      const incident = tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!incident || guardian.role !== 'defender' || incident.assignedDefenderId !== guardian.guardianId) {
        return { error: 'Alleen de toegewezen defender kan hier een update plaatsen.' }
      }
      tx.insert(echoes).values({ echoId: `EC-${randomUUID()}`, glitchId: incident.glitchId,
        description, timestamp: new Date().toISOString(), reportingGuardianId: guardian.guardianId }).run()
      return {}
    })
  })
