import { useEffect, useRef, useState } from 'react'
import { getLanAddress } from '#/lib/join-link.functions'

export function JoinCode() {
  const dialog = useRef<HTMLDialogElement>(null)
  const [image, setImage] = useState('')
  const [href, setHref] = useState('/play')
  useEffect(() => {
    let live = true
    async function load() {
      const url = new URL('/play', window.location.origin)
      if (['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
        const host = await getLanAddress()
        if (!host) return
        url.hostname = host
      }
      const qr = await import('qrcode')
      const data = await qr.toDataURL(url.href, { margin: 4, width: 220 })
      if (live) { setImage(data); setHref(url.href) }
    }
    void load().catch(() => {})
    return () => { live = false }
  }, [])
  return <aside className="join-code">
    <button type="button" aria-label="Vergroot de QR-code om mee te spelen" onClick={() => dialog.current?.showModal()}>
      {image && <img src={image} alt="" />}Meespelen
    </button>
    <dialog ref={dialog} className="join-invite" aria-label="Scan om mee te spelen">
      <h2>Scan om mee te spelen</h2>
      {image && <img src={image} alt="QR-code voor de gastingang van Achrona" />}
      <a href={href}>Open de spellink</a>
      <form method="dialog"><button>Sluiten</button></form>
    </dialog>
  </aside>
}
