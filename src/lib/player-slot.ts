export function playerSlot(value: unknown): string | undefined {
  return typeof value === 'string' && /^[a-f0-9]{8}(-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i.test(value) ? value : undefined
}

export function playerUrl(path: string, slot?: string) {
  return slot ? `${path}?speler=${encodeURIComponent(slot)}` : path
}

// getRandomValues also works on local Wi-Fi HTTP origins.
export function newPlayerId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16))
  bytes[6] = (bytes[6] & 15) | 64
  bytes[8] = (bytes[8] & 63) | 128
  const hex = Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
  return [hex.slice(0,8), hex.slice(8,12), hex.slice(12,16), hex.slice(16,20), hex.slice(20)].join('-')
}
