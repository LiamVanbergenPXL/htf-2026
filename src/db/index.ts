import { createClient } from '@libsql/client'
import { drizzle } from 'drizzle-orm/libsql'
import * as schema from './schema.ts'

const remote = process.env.TURSO_DATABASE_URL
if (process.env.VERCEL && !remote) throw new Error('Configureer TURSO_DATABASE_URL en TURSO_AUTH_TOKEN in Vercel.')
const client = createClient({ url: remote || `file:${process.env.DB_FILE_NAME ?? 'local.db'}`, authToken: process.env.TURSO_AUTH_TOKEN })
if (!remote) await client.execute('PRAGMA foreign_keys = ON')
export const db = drizzle(client, { schema })
