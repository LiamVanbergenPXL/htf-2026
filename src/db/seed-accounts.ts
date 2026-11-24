import { db } from './index.ts'
import { guardianCredentials, guardians } from './schema.ts'
import { hashPassword } from '../lib/password.server.ts'

const accounts = [
  { guardianId: 'guardian-defender', codename: 'defender', role: 'defender', password: 'Defender2026!' },
  { guardianId: 'guardian-commander', codename: 'commander', role: 'commander', password: 'Commander2026!' },
] as const

if (process.env.NODE_ENV === 'production') {
  throw new Error('Testaccounts mogen niet in productie worden aangemaakt.')
}

// Re-running this seed preserves existing accounts, passwords and application data.
db.transaction((tx) => {
  for (const { password, ...guardian } of accounts) {
    tx.insert(guardians).values(guardian).onConflictDoNothing().run()
    tx.insert(guardianCredentials).values({
      guardianId: guardian.guardianId,
      passwordHash: hashPassword(password),
    }).onConflictDoNothing().run()
  }
})
console.log('Testaccounts beschikbaar: defender en commander.')
