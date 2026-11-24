import { createHash, randomBytes } from 'node:crypto'
import { deleteCookie, getCookie, setCookie, getRequest } from '@tanstack/start-server-core/request-response'
import { redirect } from '@tanstack/react-router'
import { and, eq, gt, lte } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { guardians, sessions } from '#/db/schema.ts'

import { playerSlot } from './player-slot'

function requestSlot() {
  const request = getRequest()
  return playerSlot(request.headers.get('x-achrona-player') ?? new URL(request.url).searchParams.get('speler'))
}

function sessionCookie() {
  const slot = requestSlot()
  return slot ? `guardian-session-${slot}` : 'guardian-session'
}
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

export async function findGuardianForToken(token: string) {
  return await db.select({
    guardianId: guardians.guardianId,
    codename: guardians.codename,
    role: guardians.role,
  }).from(sessions).innerJoin(guardians, eq(sessions.guardianId, guardians.guardianId))
    .where(and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.expiresAt, new Date().toISOString())))
    .get() ?? null
}

export async function getCurrentGuardian() {
  const token = getCookie(sessionCookie())
  return token ? await findGuardianForToken(token) : null
}

export async function requireGuardian() {
  const guardian = await getCurrentGuardian()
  if (!guardian) throw redirect({ to: '/login', search: { speler: requestSlot() } })
  return guardian
}

export async function destroySession() {
  const token = getCookie(sessionCookie())
  if (token) await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token))).run()
  deleteCookie(sessionCookie(), cookieOptions)
}

export async function createSession(guardianId: string) {
  // Replace an existing session on login to prevent session fixation.
  await destroySession()
  await db.delete(sessions).where(lte(sessions.expiresAt, new Date().toISOString())).run()
  const token = randomBytes(32).toString('hex')
  await db.insert(sessions).values({
    tokenHash: hashToken(token),
    guardianId,
    expiresAt: new Date(Date.now() + SESSION_SECONDS * 1000).toISOString(),
  }).run()
  setCookie(sessionCookie(), token, { ...cookieOptions, maxAge: SESSION_SECONDS })
}
