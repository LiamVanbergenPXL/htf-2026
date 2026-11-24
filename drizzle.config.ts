import { defineConfig } from 'drizzle-kit'

const schema = './src/db/schema.ts'
export default defineConfig(process.env.TURSO_DATABASE_URL ? {
  dialect: 'turso', schema, dbCredentials: { url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN },
} : {
  dialect: 'sqlite', schema, dbCredentials: { url: process.env.DB_FILE_NAME ?? 'local.db' },
})
