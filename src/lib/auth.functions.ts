import { createServerFn } from '@tanstack/react-start'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardianCredentials, guardians } from '#/db/schema.ts'
import { createSession, destroySession, getCurrentGuardian } from './auth.server'
import { verifyPassword } from './password.server'

export const getCurrentGuardianFn = createServerFn({ method: 'GET' })
  .handler(() => getCurrentGuardian())

export const loginFn = createServerFn({ method: 'POST' })
  .validator((input: unknown) => {
    const data = input as { codename?: unknown; password?: unknown } | null
    if (!data || typeof data.codename !== 'string' || typeof data.password !== 'string'
      || !data.codename.trim() || data.codename.length > 100 || !data.password || data.password.length > 256) {
      throw new Error('Vul een geldige codename en wachtwoord in.')
    }
    return { codename: data.codename.trim(), password: data.password }
  })
  .handler(({ data }) => {
    const account = db.select({ guardianId: guardians.guardianId, passwordHash: guardianCredentials.passwordHash })
      .from(guardians)
      .innerJoin(guardianCredentials, eq(guardianCredentials.guardianId, guardians.guardianId))
      .where(eq(guardians.codename, data.codename)).get()
    // Also calculate a hash for unknown accounts to avoid a fast user-enumeration path.
    const valid = verifyPassword(data.password, account?.passwordHash ?? `${'0'.repeat(32)}:${'0'.repeat(128)}`)
    if (!account || !valid) return { success: false, error: 'Codename of wachtwoord is onjuist.' } as const
    createSession(account.guardianId)
    return { success: true } as const
  })

export const logoutFn = createServerFn({ method: 'POST' }).handler(() => {
  destroySession()
  return { success: true }
})
