import { blob, sqliteTable, text } from 'drizzle-orm/sqlite-core'
// Relative import: drizzle-kit loads this file and doesn't resolve the `#/` alias.
import { GLITCH_STATUSES } from '../lib/glitch.ts'

export const guardians = sqliteTable('guardians', {
  guardianId: text('guardian_id').primaryKey(),
  codename: text('codename').notNull(),
  role: text('role', {
    enum: ['defender', 'commander'],
  }).notNull(),
})

export const glitches = sqliteTable('glitches', {
  glitchId: text('glitch_id').primaryKey(),
  status: text('status', { enum: GLITCH_STATUSES }).notNull(),
  assignedDefenderId: text('assigned_defender_id').references(() => guardians.guardianId, { onDelete: 'set null' }),
  description: text('description').notNull(),
  /** ISO 8601, so lexical order is chronological order. */
  timestamp: text('timestamp').notNull(),
})

export const echoes = sqliteTable('echoes', {
  echoId: text('echo_id').primaryKey(),
  description: text('description').notNull(),
  timestamp: text('timestamp').notNull(),
  reportingGuardianId: text('reporting_guardian_id')
      .notNull()
      .references(() => guardians.guardianId),
  glitchId: text('glitch_id')
      .notNull()
      .references(() => glitches.glitchId),
})

export const echoImages = sqliteTable('echo_images', {
  echoId: text('echo_id').primaryKey().references(() => echoes.echoId, { onDelete: 'cascade' }),
  contentType: text('content_type').notNull(),
  data: blob('data', { mode: 'buffer' }).notNull(),
})

// Credentials are separate so guardian data never includes password hashes.
export const guardianCredentials = sqliteTable('guardian_credentials', {
  guardianId: text('guardian_id').primaryKey().references(() => guardians.guardianId),
  passwordHash: text('password_hash').notNull(),
})

export const sessions = sqliteTable('sessions', {
  tokenHash: text('token_hash').primaryKey(),
  guardianId: text('guardian_id').notNull().references(() => guardians.guardianId),
  expiresAt: text('expires_at').notNull(),
})
