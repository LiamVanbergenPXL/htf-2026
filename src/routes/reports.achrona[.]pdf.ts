import { createFileRoute } from '@tanstack/react-router'
import { getCurrentGuardian } from '#/lib/auth.server'
import { renderCouncilReport } from '#/lib/council-report.server'
import { readGlitchOverview } from '#/lib/glitch-overview.server'

export const Route = createFileRoute('/reports/achrona.pdf')({
  server: {
    handlers: {
      GET: async () => {
        const headers = { 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' }
        const guardian = await getCurrentGuardian()
        if (!guardian) return new Response('Log eerst in.', { status: 401, headers })

        if (guardian.guardianId.startsWith('guest-')) return new Response('Alleen voor Guardians.', {status: 403, headers})
        const pdf = await renderCouncilReport((await readGlitchOverview(guardian.role)).glitches)
        return new Response(new Uint8Array(pdf), {
          headers: {
            ...headers,
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="incidentrapport-achrona.pdf"',
          },
        })
      },
    },
  },
})
