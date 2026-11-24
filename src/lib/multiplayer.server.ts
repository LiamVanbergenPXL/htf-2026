import { eq, gt, sql } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoes, guardians, presence } from '#/db/schema.ts'
import type { Player, Pose } from './multiplayer'

export async function syncPresence(guardian: Pick<Player, 'guardianId' | 'codename' | 'role'>, pose: Pose,
  speech?: { id: string; text: string }) {
  const now = Date.now()
  const seen = new Date(now).toISOString()
  const spokenCutoff = new Date(now - 9000).toISOString()
  const update = db.insert(presence).values({ guardianId: guardian.guardianId, pose, seen,
    message: speech?.text ?? '', messageId: speech?.id, spoken: speech ? seen : null })
    .onConflictDoUpdate({ target: presence.guardianId, set: { pose, seen, ...(speech && {
      message: speech.text, messageId: speech.id,
      spoken: sql`case when ${presence.messageId} = ${speech.id} then ${presence.spoken} else ${seen} end`,
    }) } })
  const [, rows, events] = await db.batch([
    update,
    db.select({ pose: presence.pose, guardianId: guardians.guardianId, role: guardians.role, codename: guardians.codename,
      message: presence.message, spoken: presence.spoken }).from(presence)
      .innerJoin(guardians, eq(guardians.guardianId, presence.guardianId))
      .where(gt(presence.seen, new Date(now - 95000).toISOString())),
    db.select({ id: echoes.echoId, author: guardians.codename, timestamp: echoes.timestamp }).from(echoes)
      .innerJoin(guardians, eq(guardians.guardianId, echoes.reportingGuardianId))
      .where(gt(echoes.timestamp, new Date(now - 60000).toISOString())).orderBy(echoes.timestamp),
  ])
  const players = rows.map(({ pose, spoken, message, ...identity }) => ({
    ...pose, ...identity, message: spoken && spoken > spokenCutoff ? message : '',
  }))
  return { self: players.find(p => p.guardianId === guardian.guardianId) ?? { ...guardian, ...pose, message: '' },
    others: players.filter(p => p.guardianId !== guardian.guardianId),
    announcements: events.map(({ id, author, timestamp }) => ({ id, author, time: Date.parse(timestamp) })), now }
}

export async function leaveRealm(id: string) {
  await db.delete(presence).where(eq(presence.guardianId, id)).run()
}
