import type { BuildingId } from './achrona-map.ts'

/** Every simulated glitch starts with this, so the demo never mixes with real reports. */
export const SIMULATED_PREFIX = 'SIM-'

/**
 * Glitches arriving during a demo wave, written in the world of Achrona.
 * Each sits in the building it describes, so it lights up there on the map.
 */
export const SIMULATION_INCIDENTS: readonly { description: string; buildingId: BuildingId }[] = [
  { description: 'De klokkentoren bij de Wachterspoort slaat dertien en daarna nul', buildingId: 'gate' },
  { description: 'Runen in het Raadsarchief herschrijven zichzelf', buildingId: 'archive' },
  { description: 'De Waarzeggerstoren toont een toekomst die al voorbij is', buildingId: 'oracle' },
  { description: 'Echo-sensoren in de Echopost horen dezelfde stem op drie plaatsen tegelijk', buildingId: 'post' },
  { description: 'Wachters bij de poort zien zichzelf een minuut te laat aankomen', buildingId: 'gate' },
  { description: 'Boodschappers komen in de Echopost aan voordat ze vertrokken zijn', buildingId: 'post' },
  { description: 'Archiefrollen in het Raadsarchief verbleken tot lege bladzijden', buildingId: 'archive' },
  { description: 'Sterrenkaarten in de Waarzeggerstoren draaien de verkeerde kant op', buildingId: 'oracle' },
]

export function isSimulatedGlitch(glitchId: string) {
  return /^SIM-[0-9A-F]{8}$/.test(glitchId)
}

export function newSimulatedGlitchId() {
  // Global crypto works in both Node and the browser; this module is shared.
  return `${SIMULATED_PREFIX}${crypto.randomUUID().replace(/-/g, '').slice(0, 8).toUpperCase()}`
}

/** Prefers an incident not on screen yet, so a wave reads as separate incidents. */
export function pickSimulationIncident(inUse: ReadonlySet<string>) {
  const fresh = SIMULATION_INCIDENTS.filter(({ description }) => !inUse.has(description))
  const pool = fresh.length ? fresh : SIMULATION_INCIDENTS
  return pool[Math.floor(Math.random() * pool.length)]
}
