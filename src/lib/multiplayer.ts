import type { CharacterId } from './achrona-characters'

export type Pose = { x: number; y: number; angle: number; character: CharacterId }
export type Player = Pose & {
  guardianId: string
  codename: string
  role: 'defender' | 'commander'
  message: string
}
export type Announcement = { id: string; author: string; time: number }
