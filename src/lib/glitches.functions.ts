import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches, guardians } from '#/db/schema.ts'
import { randomUUID } from 'node:crypto'
import { MAX_ECHO_DESCRIPTION_LENGTH } from './echo'
import { requireGuardian } from './auth.server'
import { readGlitchOverview } from './glitch-overview.server'
import { GLITCH_STATUSES, isGlitchType, type GlitchStatus, type GlitchType } from './glitch'

export const getGlitches = createServerFn({ method: 'GET' })
  .handler(async () => {
    const guardian = await requireGuardian()
    if (!guardian.guardianId.startsWith('guest-')) return readGlitchOverview(guardian.role)
    const rows = await db.select({ glitchId: glitches.glitchId, status: glitches.status,
      buildingId: glitches.buildingId, glitchType: glitches.glitchType, timestamp: glitches.timestamp }).from(glitches).all()
    return { defenders: [], glitches: rows.map(row => ({ ...row, description: 'Afwijking in Achrona',
      assignedDefenderId: null, assignedDefender: null, imageEchoIds: [], updates: [] })) }
  })


export const updateGlitchStatus = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = input as { glitchId?: unknown; status?: unknown } | null
    if (!data || typeof data.glitchId !== 'string' || !data.glitchId.trim() || data.glitchId.length > 100
      || typeof data.status !== 'string' || !GLITCH_STATUSES.includes(data.status as GlitchStatus)) {
      throw new Error('Ongeldige glitch of status.')
    }
    return { glitchId: data.glitchId, status: data.status as GlitchStatus }
  })
  .handler(async ({ data }) => {
    const guardian = await requireGuardian()
    if (guardian.role !== 'commander') {
      return { success: false, error: 'Alleen commanders mogen de status wijzigen.' } as const
    }
    const result = await db.update(glitches).set({ status: data.status })
      .where(eq(glitches.glitchId, data.glitchId)).run()
    if (result.rowsAffected === 0) return { success: false, error: 'Deze glitch bestaat niet meer.' } as const
    return { success: true } as const
  })

/** Lets a commander classify an existing glitch or correct a wrongly chosen type. null clears it. */
export const updateGlitchType = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = input as { glitchId?: unknown; glitchType?: unknown } | null
    if (!data || typeof data.glitchId !== 'string' || !data.glitchId.trim() || data.glitchId.length > 100
      || (data.glitchType !== null && !isGlitchType(data.glitchType))) {
      throw new Error('Ongeldige glitch of type.')
    }
    return { glitchId: data.glitchId, glitchType: data.glitchType as GlitchType | null }
  })
  .handler(async ({ data }) => {
    const guardian = await requireGuardian()
    if (guardian.role !== 'commander') {
      return { success: false, error: 'Alleen commanders mogen het type wijzigen.' } as const
    }
    const result = await db.update(glitches).set({ glitchType: data.glitchType })
      .where(eq(glitches.glitchId, data.glitchId)).run()
    if (result.rowsAffected === 0) return { success: false, error: 'Deze glitch bestaat niet meer.' } as const
    return { success: true } as const
  })

export const assignGlitch = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; defenderId: string | null }) => input)
  .handler(async ({ data }) => {
    if ((await requireGuardian()).role !== 'commander') return { error: 'Alleen commanders mogen glitches toewijzen.' }
    return await db.transaction(async (tx) => {
      if (typeof data?.glitchId !== 'string' || (data.defenderId !== null && typeof data.defenderId !== 'string')) {
        return { error: 'Ongeldige toewijzing.' }
      }
      if (data.defenderId !== null) {
        const defender = await tx.select().from(guardians).where(eq(guardians.guardianId, data.defenderId)).get()
        if (defender?.role !== 'defender') return { error: 'Kies een geldige defender.' }
      }
      const result = await tx.update(glitches).set({ assignedDefenderId: data.defenderId })
        .where(eq(glitches.glitchId, data.glitchId)).run()
      return result.rowsAffected ? {} : { error: 'Deze glitch bestaat niet meer.' }
    })
  })

export const addGlitchUpdate = createServerFn({ method: 'POST' })
  .validator((input: { glitchId: string; description: string }) => input)
  .handler(async ({ data }) => {
    const guardian = await requireGuardian()
    const description = typeof data?.description === 'string' ? data.description.trim() : ''
    if (typeof data?.glitchId !== 'string' || !description || description.length > MAX_ECHO_DESCRIPTION_LENGTH) {
      return { error: 'Vul een geldige beschrijving in.' }
    }
    const echoId = `EC-${randomUUID()}`
    const result = await db.transaction(async (tx) => {
      const incident = await tx.select().from(glitches).where(eq(glitches.glitchId, data.glitchId)).get()
      if (!incident || guardian.role !== 'defender' || incident.assignedDefenderId !== guardian.guardianId) {
        return { error: 'Alleen de toegewezen defender kan hier een update plaatsen.' }
      }
      await tx.insert(echoes).values({ echoId, glitchId: incident.glitchId,
        description, timestamp: new Date().toISOString(), reportingGuardianId: guardian.guardianId }).run()
      return {}
    })
    return result
  })
