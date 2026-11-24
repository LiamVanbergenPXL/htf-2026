export const ACHRONA_BUILDINGS = [
  { id: 'gate', name: 'Wachterspoort', action: 'Echo melden', portrait: 'guardian', x: 19, y: 48 },
  { id: 'post', name: 'Echopost', action: 'Glitchregister bekijken', portrait: 'scout', x: 43, y: 70 },
  { id: 'archive', name: 'Raadsarchief', action: 'Rapport downloaden', portrait: 'archer', x: 80, y: 57 },
  { id: 'oracle', name: 'Waarzeggerstoren', action: 'Praat met Auri', portrait: 'oracle', x: 60, y: 32 },
] as const

export type BuildingId = typeof ACHRONA_BUILDINGS[number]['id']

export function isBuildingId(value: unknown): value is BuildingId {
  return ACHRONA_BUILDINGS.some(({ id }) => id === value)
}
