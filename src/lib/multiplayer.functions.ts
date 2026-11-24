import { createServerFn } from '@tanstack/react-start'
import { characters } from './achrona-characters'
import { requireGuardian } from './auth.server'
import { syncPresence } from './multiplayer.server'
import type { Pose } from './multiplayer'

export const syncWorld = createServerFn({ method: 'POST' })
  .validator((input: Pose & { speech?: { id: string; text: string } }) => {
    if (!input || ![input.x, input.y, input.angle].every(Number.isFinite)
      || input.x < 0 || input.x > 100 || input.y < 0 || input.y > 100
      || !characters.some(c => c.id === input.character)) throw new Error('Ongeldige spelerpositie.')
    const { x, y, angle, character, speech } = input
    if (speech && (typeof speech.id !== 'string' || speech.id.length > 64 ||
      typeof speech.text !== 'string' || !speech.text.trim() || speech.text.length > 160)) throw new Error('Ongeldig bericht.')
    return { x, y, angle, character, speech: speech ? { id: speech.id, text: speech.text.trim() } : undefined }
  })
  .handler(async ({ data: { speech, ...pose } }) => await syncPresence(await requireGuardian(), pose, speech))
