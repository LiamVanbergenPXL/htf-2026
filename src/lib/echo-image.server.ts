import { ECHO_IMAGE_TYPES, MAX_ECHO_IMAGE_BYTES } from './echo'

export async function validateEchoImage(file: File) {
  if (file.size === 0 || file.size > MAX_ECHO_IMAGE_BYTES) {
    return { success: false, error: 'Kies een afbeelding van maximaal 5 MB die niet leeg is.' } as const
  }
  if (!ECHO_IMAGE_TYPES.some((type) => type === file.type)) {
    return { success: false, error: 'Alleen JPG, PNG en WebP zijn toegestaan.' } as const
  }
  const bytes = Buffer.from(await file.arrayBuffer())
  let contentType: string | undefined
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
    && bytes.toString('ascii', 12, 16) === 'IHDR') contentType = 'image/png'
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
    && bytes[bytes.length - 2] === 0xff && bytes[bytes.length - 1] === 0xd9) contentType = 'image/jpeg'
  if (bytes.length >= 16 && bytes.toString('ascii', 0, 4) === 'RIFF'
    && bytes.toString('ascii', 8, 12) === 'WEBP' && ['VP8 ', 'VP8L', 'VP8X'].includes(bytes.toString('ascii', 12, 16))) contentType = 'image/webp'
  if (!contentType || contentType !== file.type) {
    return { success: false, error: 'Dit bestand is geen geldige JPG-, PNG- of WebP-afbeelding.' } as const
  }
  return { success: true, contentType, bytes } as const
}
