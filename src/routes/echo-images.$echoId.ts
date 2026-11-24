import { createFileRoute } from '@tanstack/react-router'
import { eq } from 'drizzle-orm'
import { db } from '#/db/index.ts'
import { echoImages } from '#/db/schema.ts'
import { getCurrentGuardian } from '#/lib/auth.server'

export const Route = createFileRoute('/echo-images/$echoId')({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
        const guardian = await getCurrentGuardian()
        if (!guardian) return new Response('Log eerst in.', { status: 401, headers })
        if (guardian.guardianId.startsWith('guest-')) return new Response('Alleen voor Guardians.', {status: 403, headers})
        const image = await db.select().from(echoImages).where(eq(echoImages.echoId, params.echoId)).get()
        if (!image) return new Response('Afbeelding niet gevonden.', { status: 404, headers })
        return new Response(new Uint8Array(image.data), {
          headers: { ...headers, 'Content-Type': image.contentType, 'Content-Length': String(image.data.length) },
        })
      },
    },
  },
})
