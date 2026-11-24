import { db } from './index.ts'
import { echoes, glitches } from './schema.ts'

if (process.env.TURSO_DATABASE_URL || process.env.NODE_ENV === 'production') throw new Error('De demoseed is alleen voor een lokale ontwikkeldatabase.')

const rows: (typeof glitches.$inferInsert)[] = [
  { glitchId: 'GL-0142', status: 'LEAKED', description: 'Time loop detected near the eastern clock tower', timestamp: '2026-11-10T13:42:00Z' },
  { glitchId: 'GL-0141', status: 'ASSESSING', description: 'Magic reserves dropping faster than expected', timestamp: '2026-11-10T11:05:00Z' },
  { glitchId: 'GL-0139', buildingId: 'archive', status: 'CONTAINING', description: 'Portal flicker in the archive vaults', timestamp: '2026-11-09T22:17:00Z' },
  { glitchId: 'GL-0137', status: 'FIXED', description: 'Echo sensors reporting duplicate signals', timestamp: '2026-11-08T08:30:00Z' },
]

// Wipe and refill so the seed can be re-run safely.
await db.transaction(async (tx) => {
  // Echoes reference glitches and must be cleared before resetting demo data.
  await tx.delete(echoes).run()
  await tx.delete(glitches).run()
  await tx.insert(glitches).values(rows).run()
})

console.log(`Seeded ${rows.length} glitches.`)
