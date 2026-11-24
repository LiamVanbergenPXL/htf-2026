import { createMiddleware, createStart } from '@tanstack/react-start'
import { playerSlot } from './lib/player-slot'

const tabSession = createMiddleware({ type: 'function' }).client(({ next }) => {
  const slot = typeof window === 'undefined' ? undefined : playerSlot(new URLSearchParams(window.location.search).get('speler'))
  return next({ headers: slot ? { 'x-achrona-player': slot } : {} })
})

export const startInstance = createStart(() => ({ functionMiddleware: [tabSession] }))
