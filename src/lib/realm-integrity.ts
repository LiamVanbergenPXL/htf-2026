// Relative import with extension: the unit test loads this file straight into Node.
import { GLITCH_STATUSES, type Glitch, type GlitchStatus } from './glitch.ts'

/** How much one glitch in each status damages the realm, in integrity points. */
export const INTEGRITY_PENALTY: Record<GlitchStatus, number> = {
  LEAKED: 15,
  ASSESSING: 10,
  CONTAINING: 5,
  FIXED: 0,
}

export type RealmLevel = 'STABLE' | 'WAVERING' | 'CRITICAL' | 'DESYNC'

export type RealmIntegrity = {
  /** 0–100, where 100 means no open glitches. */
  integrity: number
  level: RealmLevel
  openCount: number
  counts: Record<GlitchStatus, number>
}

/** Lowest integrity that still belongs to each level, checked top to bottom. */
const LEVEL_FLOORS: [RealmLevel, number][] = [
  ['STABLE', 80],
  ['WAVERING', 50],
  ['CRITICAL', 25],
  ['DESYNC', 0],
]

/**
 * Every open glitch costs a fixed number of points, so one new leak always
 * shows on the meter, however many glitches were fixed before it.
 */
export function calculateRealmIntegrity(glitches: Pick<Glitch, 'status'>[]): RealmIntegrity {
  const counts = Object.fromEntries(GLITCH_STATUSES.map((status) => [status, 0])) as Record<GlitchStatus, number>
  let penalty = 0
  for (const { status } of glitches) {
    counts[status] += 1
    penalty += INTEGRITY_PENALTY[status]
  }
  const integrity = Math.max(0, 100 - penalty)
  const level = LEVEL_FLOORS.find(([, floor]) => integrity >= floor)![0]
  return { integrity, level, openCount: glitches.length - counts.FIXED, counts }
}
