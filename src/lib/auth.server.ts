import { createHash, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie } from '@tanstack/react-start/server'
import { redirect } from '@tanstack/react-router'
import { and, eq, gt, lte } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians, sessions } from '#/db/schema.ts'

const COOKIE_NAME = 'guardian-session'
const SESSION_SECONDS = 60 * 60 * 8
const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
}

export function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex')
}

export function findGuardianForToken(token: string) {
  return db.select({
    guardianId: guardians.guardianId,
    codename: guardians.codename,
    role: guardians.role,
  }).from(sessions).innerJoin(guardians, eq(sessions.guardianId, guardians.guardianId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .get() ?? null
}

export function getCurrentGuardian() {
  const token = getCookie(COOKIE_NAME)
  return token ? findGuardianForToken(token) : null
}

export function requireGuardian() {
  const guardian = getCurrentGuardian()
  if (!guardian) throw redirect({ to: '/login' })
  return guardian
}

export function destroySession() {
  const token = getCookie(COOKIE_NAME)
  if (token) db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run()
  deleteCookie(COOKIE_NAME, cookieOptions)
}

export function createSession(guardianId: string) {
  // Replace an existing session on login to prevent session fixation.
  destroySession()
  db.delete(sessions).where(lte(sessions.expiresAt, new Date().toISOString())).run()
  const token = randomBytes(32).toString('hex')
  db.insert(sessions).values({
    tokenHash: hashToken(token),
    guardianId,
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
  }).run()
  setCookie(COOKIE_NAME, token, { ...cookieOptions, maxAge: SESSION_SECONDS })
}
