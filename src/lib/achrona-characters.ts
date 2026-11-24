export const characters = [
  { id: 'guardian', name: 'Kristalwachter', equipment: 'Kristalstaf en zilveren pantser' },
  { id: 'scout', name: 'Sabelverkenner', equipment: 'Gebogen sabel en rond schild' },
  { id: 'archer', name: 'Lichtschutter', equipment: 'Lichtboog en vizierhelm' },
] as const

export type CharacterId = typeof characters[number]['id']
