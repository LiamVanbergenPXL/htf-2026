import { PLAZA, type MapPoint } from './achrona-scene'

export const seals = [
  { x: 29, y: 54, name: 'Wachterszegel' },
  { x: 65, y: 42, name: 'Sterrenzegel' },
  { x: 74, y: 64, name: 'Archiefzegel' },
  { ...PLAZA, name: 'Bron op het plein' },
] as const

export function riftPosition(seconds: number): MapPoint {
  return { x: 51 + Math.sin(seconds * .67) * 13, y: 53 + Math.cos(seconds * .92) * 8 }
}

export const travelDistance = (a: MapPoint, b: MapPoint) => Math.hypot(a.x - b.x, a.y - b.y)
