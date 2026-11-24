import { newPlayerId } from '#/lib/player-slot'
import { useEffect, useEffectEvent, useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import { syncWorld } from '#/lib/multiplayer.functions'
import type { Announcement, Player, Pose } from '#/lib/multiplayer'

export function useWorldPlayers(readPose: () => Pose, inside: boolean) {
  const router = useRouter()
  const pose = useEffectEvent(readPose)
  const [others, setOthers] = useState<Player[]>([])
  const [self, setSelf] = useState<Player | null>(null)
  const [connection, setConnection] = useState<'connecting' | 'online' | 'offline'>('connecting')
  const [sending, setSending] = useState(false)
  const [queue, setQueue] = useState<Announcement[]>([])
  const [herald, setHerald] = useState<Announcement | null>(null)
  const pending = useRef<{ id: string; text: string } | undefined>(undefined)
  const seen = useRef(new Map<string, number>())

  useEffect(() => {
    let active = true
    let timer: ReturnType<typeof setTimeout>
    let initialized = false
    let polling = false
    let disconnected = false
    function markOffline() {
      disconnected = true
      setConnection('offline')
    }
    if (!navigator.onLine) markOffline()
    async function poll() {
      if (!active || polling) return
      polling = true
      const started = performance.now()
      const speech = pending.current
      try {
        const result = await syncWorld({ data: { ...pose(), speech } })
        if (!active) return
        if (!navigator.onLine) return
        const recovered = disconnected
        disconnected = false
        setConnection('online')
        setSelf(result.self)
        setOthers(result.others)
        if (speech && pending.current?.id === speech.id) {
          pending.current = undefined
          setSending(false)
        }
        const fresh = result.announcements.filter(e => !seen.current.has(e.id) && (initialized || result.now - e.time < 7000))
        for (const e of result.announcements) seen.current.set(e.id, e.time)
        for (const [id, time] of seen.current) if (result.now - time > 65_000) seen.current.delete(id)
        initialized = true
        if (fresh.length) {
          setQueue(list => [...list, ...fresh])
        }
        if (fresh.length || recovered) void router.invalidate().catch(() => {})
      } catch {
        if (active) markOffline()
      } finally {
        polling = false
        if (active) {
          const interval = document.hidden ? 2500 : 150
          timer = setTimeout(poll, Math.max(40, interval - (performance.now() - started)))
        }
      }
    }
    function wake() {
      if (document.hidden) return
      clearTimeout(timer)
      void poll()
    }
    document.addEventListener('visibilitychange', wake)
    window.addEventListener('offline', markOffline)
    window.addEventListener('online', wake)
    void poll()
    return () => {
      active = false
      clearTimeout(timer)
      document.removeEventListener('visibilitychange', wake)
      window.removeEventListener('offline', markOffline)
      window.removeEventListener('online', wake)
    }
  }, [router])

  useEffect(() => {
    if (!inside && !herald && queue.length) {
      setHerald(queue[0])
      setQueue(q => q.slice(1))
    }
  }, [herald, inside, queue])

  useEffect(() => {
    if (!herald || inside) return
    const timer = setTimeout(() => setHerald(null), 6800)
    return () => clearTimeout(timer)
  }, [herald, inside])

  function speak(text: string) {
    if (!text.trim() || pending.current) return false
    pending.current = { id: newPlayerId(), text: text.trim().slice(0,160) }
    setSending(true)
    return true
  }

  return { others, self, online: connection === 'online', offline: connection === 'offline', herald, sending, speak }
}
