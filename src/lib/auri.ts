export const MAX_AURI_QUESTION_LENGTH = 1000

export type AuriMessage = { role: 'user' | 'assistant'; content: string }
export type AuriIncident = {
  glitchId: string
  status: 'LEAKED' | 'ASSESSING' | 'CONTAINING' | 'FIXED'
  description: string
  timestamp: string
  echoes: { description: string; timestamp: string; codename: string; hasImage: boolean }[]
}
export type AuriAnswer = {
  content: string
  sources: { glitchId: string; description: string; status: AuriIncident['status'] }[]
  checkedAt: string
}
