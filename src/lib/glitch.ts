/** Lifecycle of a glitch, in order. */
export const GLITCH_STATUSES = [
  'LEAKED',
  'ASSESSING',
  'CONTAINING',
  'FIXED',
] as const

export type GlitchStatus = (typeof GLITCH_STATUSES)[number]

export type Glitch = {
  glitchId: string
  status: GlitchStatus
  description: string
  /** ISO 8601 */
  timestamp: string
  assignedDefenderId?: string | null
  assignedDefender?: string | null
  updates?: { id: string; author: string; text: string; timestamp: string }[]
  imageEchoIds?: string[]
}
