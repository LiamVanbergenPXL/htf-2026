import { randomUUID } from 'node:crypto'
import { eq } from 'drizzle-orm'
import { db } from './index.ts'
import { guardians, guardianCredentials } from './schema.ts'
import { hashPassword } from '../lib/password.server.ts'

const [codename, role] = process.argv.slice(2)
const password = process.env.GUARDIAN_PASSWORD
if (!codename?.trim() || codename.length > 100 || !['commander','defender'].includes(role) ||
    !password || password.length < 12 || password.length > 256) {
  throw new Error('Geef een codename, commander of defender en GUARDIAN_PASSWORD van 12 tot 256 tekens op.')
}
const guardianId = randomUUID()
const passwordHash = hashPassword(password)
await db.transaction(async tx => {
  if (await tx.select({ id: guardians.guardianId }).from(guardians).where(eq(guardians.codename, codename)).get()) {
    throw new Error('Die codename is al in gebruik.')
  }
  await tx.insert(guardians).values({ guardianId, codename, role: role === 'commander' ? 'commander' : 'defender' }).run()
  await tx.insert(guardianCredentials).values({ guardianId, passwordHash }).run()
})
console.log('Guardian aangemaakt.')
