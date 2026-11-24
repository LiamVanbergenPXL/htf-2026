import { defineConfig } from 'drizzle-kit'

const schema = './src/db/schema.ts'
export default defineConfig(process.env.TURSO_DATABASE_URL ? {
  dialect: 'turso', schema, dbCredentials: { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
} : {
  // drizzle-kit talks to SQLite through @libsql/client, which needs a file: URL. A bare
  // Windows path like C:\...\test.db would be read as an unknown "C:" scheme.
  dialect: 'sqlite', schema, dbCredentials: { url: `file:${process.env.DB_FILE_NAME ?? 'local.db'}` },
})
