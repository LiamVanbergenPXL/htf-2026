import { Volume2 } from 'lucide-react'

type EchoGuardianProps = {
  speaking: boolean
  listening: boolean
  prompting: boolean
  text: string
  success: boolean
}

export function EchoGuardian({ speaking, listening, prompting, text, success }: EchoGuardianProps) {
  const state = speaking ? 'speaking' : listening ? 'listening' : success ? 'success' : 'idle'
  const message = speaking && text ? text
    : listening ? 'Ik luister, wachter. Vertel mij welke onrust je hebt waargenomen.'
      : prompting ? 'Een ogenblik, wachter. Maak je gereed om te spreken.'
        : success ? 'Je waarschuwing is ontvangen. Moge het licht van Achrona je pad bewaken.'
          : 'Welkom, wachter. Ik ben Auri, hoeder van Achrona. Welke onrust heb je waargenomen?'

  return (
    <div className="echo-guardian-panel my-5 flex flex-col items-center gap-4 rounded-2xl border border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-indigo-50 px-5 py-4 sm:flex-row" data-state={state}>
      <div className="echo-guardian relative h-32 w-28 shrink-0" aria-hidden="true">
        <svg viewBox="0 0 140 160" className="h-full w-full overflow-visible" fill="none">
          <ellipse cx="70" cy="151" rx="35" ry="5" fill="#6d4aff" opacity=".12" />
          <circle className="guardian-aura" cx="70" cy="73" r="57" stroke="#bba7ff" strokeDasharray="3 8" opacity=".55" />
          <g className="guardian-body">
            <path d="M28 142c2-28 13-45 42-45s40 17 42 45c-23 13-61 13-84 0Z" fill="#38206b" />
            <path d="m46 109 24 14 24-14-6 36H52l-6-36Z" fill="#7751c8" />
            <path d="m70 116-7 12 7 11 7-11-7-12Z" fill="#81eee1" />
            <path d="M24 83C17 50 35 13 70 9c35 4 53 41 46 74l-13 27-33-8-33 8-13-27Z" fill="#4b2b84" stroke="#a991e6" strokeWidth="2" />
            <path d="M34 76c0-32 15-51 36-55 21 4 36 23 36 55l-9 22H43l-9-22Z" fill="#241640" />
            <path d="M40 60c3-18 18-27 30-27s27 9 30 27v21c0 21-15 35-30 35S40 102 40 81V60Z" fill="#f1c7a9" />
            <path d="M38 67c0-28 14-41 32-41 19 0 34 14 34 42L91 52l-11 6-10-14c-6 12-18 18-32 23Z" fill="#ece3ff" />
            <path d="M49 76c4-3 8-3 12-1M79 75c4-2 8-2 12 1" stroke="#674536" strokeWidth="2.5" strokeLinecap="round" />
            <g className="guardian-eyes">
              <ellipse cx="55" cy="84" rx="4" ry="5" fill="#263142" />
              <ellipse cx="85" cy="84" rx="4" ry="5" fill="#263142" />
              <circle cx="56" cy="82" r="1.3" fill="white" />
              <circle cx="86" cy="82" r="1.3" fill="white" />
            </g>
            <ellipse cx="47" cy="94" rx="6" ry="3" fill="#e18f8c" opacity=".5" />
            <ellipse cx="93" cy="94" rx="6" ry="3" fill="#e18f8c" opacity=".5" />
            <path d="m70 86-2 7h4" stroke="#c68e74" strokeWidth="1.5" strokeLinecap="round" />
            <path className="guardian-smile" d="M62 101q8 7 16 0" stroke="#864742" strokeWidth="2.5" strokeLinecap="round" />
            <g className="guardian-mouth">
              <ellipse cx="70" cy="103" rx="7" ry="5" fill="#71393f" />
              <path d="M65 100h10" stroke="#fff2df" strokeWidth="2" strokeLinecap="round" />
              <ellipse cx="70" cy="106" rx="4" ry="1.5" fill="#e69b9d" />
            </g>
            <path d="m70 12-6 10 6 9 6-9-6-10Z" fill="#8af7dd" stroke="#d8fff5" />
          </g>
          <g className="guardian-orb">
            <circle cx="121" cy="46" r="8" fill="#d7fff5" stroke="#72d8c3" />
            <path d="m121 40 2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="#45bca9" />
          </g>
        </svg>
        {listening ? <span className="absolute right-0 bottom-4 flex size-7 items-center justify-center rounded-full bg-accent text-white"><span className="guardian-listening-dot size-2 rounded-full bg-white" /></span> : null}
      </div>
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <span className="text-sm font-semibold text-violet-950">Auri</span>
          <span className="rounded-full bg-violet-100 px-2 py-0.5 text-[10px] font-medium text-violet-700">Guardian van Achrona</span>
          {speaking ? <Volume2 className="size-4 text-accent" aria-label="Auri spreekt" /> : null}
        </div>
        <p className="text-sm leading-relaxed text-violet-950">{message}</p>
        <div className="mt-3 flex h-4 items-center gap-1 text-accent" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5, 6].map((index) => <span key={index} className="guardian-voice-bar w-1 rounded-full bg-current" style={{ animationDelay: `${index * -0.11}s`, height: `${index % 2 ? 5 : 9}px` }} />)}
        </div>
      </div>
    </div>
  )
}
