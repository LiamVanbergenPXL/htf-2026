import type { BuildingId } from './achrona-map.ts'

/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = [
  'LEAKED',
  'ASSESSING',
  'CONTAINING',
  'FIXED',
] as const

export type GlitchStatus = (typeof GLITCH_STATUSES)[number]

export const GLITCH_TYPES = ['sensor', 'network', 'magic', 'other'] as const
export type GlitchType = typeof GLITCH_TYPES[number]
export const GLITCH_TYPE_LABELS: Record<GlitchType, string> = {
  sensor: 'Sensor', network: 'Netwerk', magic: 'Magie', other: 'Overig',
}

export function isGlitchType(value: unknown): value is GlitchType {
  return GLITCH_TYPES.some(type => type === value)
}

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  glitchType?: GlitchType | null
  buildingId?: BuildingId | null
  description: string
  /** ISO 8601 */
  timestamp: string
  assignedDefenderId?: string | null
  assignedDefender?: string | null
  updates?: { id: string; author: string; text: string; timestamp: string }[]
  imageEchoIds?: string[]
}
