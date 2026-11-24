import { createServerFn } from '@tanstack/react-start'
import { networkInterfaces } from 'node:os'

export const getLanAddress = createServerFn({ method: 'GET' }).handler(() => {
  if (process.env.NODE_ENV === 'production') return null
  return Object.values(networkInterfaces()).flat().find(ip => ip?.family === 'IPv4' && !ip.internal &&
    /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/.test(ip.address))?.address ?? null
})
