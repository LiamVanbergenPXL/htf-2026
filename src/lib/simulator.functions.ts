import { createServerFn } from '@tanstack/react-start'
import { and, asc, inArray, like, ne } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, glitches } from '#/db/schema.ts'
import { requireGuardian } from './auth.server'
import { SIMULATED_PREFIX, newSimulatedGlitchId, pickSimulationIncident } from './desync-simulator'

const commanderOnly = { success: false, error: 'Alleen commanders kunnen de Desync-simulator gebruiken.' } as const
const simulated = like(glitches.glitchId, `${SIMULATED_PREFIX}%`)

/** One simulated glitch arrives as LEAKED. The client calls this repeatedly for a wave. */
export const simulateGlitch = createServerFn({ method: 'POST' }).handler(() => {
  if (requireGuardian().role !== 'commander') return commanderOnly
  const inUse = new Set(db.select({ description: glitches.description }).from(glitches)
    .where(and(simulated, ne(glitches.status, 'FIXED'))).all().map((row) => row.description))
  const glitchId = newSimulatedGlitchId()
  // The building makes the glitch light up on the Achrona map.
  const { description, buildingId } = pickSimulationIncident(inUse)
  db.insert(glitches).values({
    glitchId, buildingId, status: 'LEAKED', description, timestamp: new Date().toISOString(),
  }).run()
  return { success: true, glitchId } as const
})

/** Fixes the oldest open simulated glitch. `remaining` tells the client when to stop. */
export const resyncSimulatedGlitch = createServerFn({ method: 'POST' }).handler(() => {
  if (requireGuardian().role !== 'commander') return commanderOnly
  return db.transaction((tx) => {
    const open = tx.select({ glitchId: glitches.glitchId }).from(glitches)
      .where(and(simulated, ne(glitches.status, 'FIXED'))).orderBy(asc(glitches.timestamp)).all()
    if (!open.length) return { success: true, glitchId: null, remaining: 0 } as const
    tx.update(glitches).set({ status: 'FIXED' }).where(inArray(glitches.glitchId, [open[0].glitchId])).run()
    return { success: true, glitchId: open[0].glitchId, remaining: open.length - 1 } as const
  })
})

/** Removes every simulated glitch and any echoes posted on them; real data is untouched. */
export const clearSimulation = createServerFn({ method: 'POST' }).handler(() => {
  if (requireGuardian().role !== 'commander') return commanderOnly
  return db.transaction((tx) => {
    const ids = tx.select({ glitchId: glitches.glitchId }).from(glitches).where(simulated).all().map((row) => row.glitchId)
    if (ids.length) {
      // Echo images cascade with their echo.
      tx.delete(echoes).where(inArray(echoes.glitchId, ids)).run()
      tx.delete(glitches).where(inArray(glitches.glitchId, ids)).run()
    }
    return { success: true, removed: ids.length } as const
  })
})
