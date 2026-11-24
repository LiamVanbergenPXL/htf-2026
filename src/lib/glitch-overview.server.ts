import { asc, desc, eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, echoImages, glitches, guardians } from '#/db/schema.ts'

export function readGlitchOverview(role: 'commander' | 'defender') {
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
  const defenders = db.select({ id: guardians.guardianId, name: guardians.codename })
    .from(guardians).where(eq(guardians.role, 'defender')).orderBy(asc(guardians.codename)).all()
  const names = new Map(defenders.map(({ id, name }) => [id, name]))
  const updates = db.select({ id: echoes.echoId, glitchId: echoes.glitchId, text: echoes.description,
    timestamp: echoes.timestamp, author: guardians.codename })
    .from(echoes).innerJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
    .orderBy(desc(echoes.timestamp)).all()
  const byGlitch = new Map<string, typeof updates>()
  for (const update of updates) {
    const group = byGlitch.get(update.glitchId) ?? []
    group.push(update)
    byGlitch.set(update.glitchId, group)
  }
  return {
    defenders: role === 'commander' ? defenders : [],
    glitches: rows.map((glitch) => ({
      ...glitch, imageEchoIds: imagesByGlitch.get(glitch.glitchId) ?? [],
      assignedDefender: names.get(glitch.assignedDefenderId ?? '') ?? null,
      updates: byGlitch.get(glitch.glitchId) ?? [],
    })),
  }
}
