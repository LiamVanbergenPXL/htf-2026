import type { CSSProperties } from 'react'

/**
 * A rearing dragon looming behind the whole page, drawn as a unified,
 * finely detailed ink illustration on parchment. Its anger follows realm
 * integrity: asleep at 100, darkening, raising its wings and glaring as
 * glitches pile up. Smoke from Kritiek; fire breath from the mouth at Desync.
 */
export function RealmDragon({ integrity }: { integrity: number }) {
  const anger = Math.min(1, Math.max(0, (100 - integrity) / 100))

  // Jaw opens progressively as anger rises; fire ignites once the jaw is open
  const jawOpen = Math.min(1, Math.max(0, (anger - 0.45) / 0.55))
  const firePower = Math.min(1, Math.max(0, (jawOpen - 0.25) / 0.75))

  const styleVars = {
    '--anger': anger,
    '--jaw-open': jawOpen.toFixed(3),
    '--fire-power': firePower.toFixed(3),
  } as CSSProperties

  return (
      <div
          aria-hidden="true"
          className="realm-dragon pointer-events-none fixed -top-16 -right-[420px] w-[900px] sm:-top-44 sm:-right-[700px] sm:w-[1500px]"
          style={styleVars}
      >
        <svg viewBox="0 0 1000 700" className="dragon-body w-full overflow-visible">
          <defs>
            <radialGradient id="dragon-eye" cx="45%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#fffbe0" />
              <stop offset="45%" stopColor="#ffae19" />
              <stop offset="100%" className="dragon-eye-color" />
            </radialGradient>

            <linearGradient id="ink-body-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#231811" />
              <stop offset="55%" stopColor="#2f2118" />
              <stop offset="100%" stopColor="#180f0a" />
            </linearGradient>

            <linearGradient id="wing-membrane" x1="0%" y1="0%" x2="85%" y2="100%">
              <stop offset="0%" stopColor="#2b1f17" stopOpacity="0.92" />
              <stop offset="60%" stopColor="#3c2b20" stopOpacity="0.76" />
              <stop offset="100%" stopColor="#4f392b" stopOpacity="0.48" />
            </linearGradient>

            <pattern id="dragon-hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(32)">
              <line x1="0" y1="0" x2="0" y2="6" stroke="#f1e3c4" strokeWidth="0.85" opacity="0.24" />
              <line x1="0" y1="0" x2="6" y2="0" stroke="#140d09" strokeWidth="0.6" opacity="0.2" />
            </pattern>

            <linearGradient id="fire-outer" x1="1" x2="0">
              <stop offset="0%" stopColor="#ffe07d" />
              <stop offset="22%" stopColor="#f77f1a" stopOpacity="0.95" />
              <stop offset="62%" stopColor="#c22814" stopOpacity="0.72" />
              <stop offset="100%" stopColor="#6e1109" stopOpacity="0" />
            </linearGradient>

            <linearGradient id="fire-core" x1="1" x2="0">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
              <stop offset="35%" stopColor="#fff1a8" stopOpacity="0.85" />
              <stop offset="100%" stopColor="#ff9d2e" stopOpacity="0" />
            </linearGradient>
          </defs>

          <g className="dragon-ink" fill="url(#ink-body-grad)">
            {/* ================= FAR WING ================= */}
            <g className="dragon-wing-far" opacity="0.72">
              <path
                  d="M525 372 L546 210 L595 55 C665 45 735 55 815 45 C775 85 765 115 785 150 C735 160 715 185 715 225 C670 230 645 255 635 295 C590 310 558 342 525 372 Z"
                  fill="url(#wing-membrane)"
              />
              <path
                  d="M528 370 L548 210 L595 55 M595 55 L815 45 M595 55 L785 150 M595 55 L715 225 M575 130 L635 295"
                  stroke="#1f150f"
                  strokeWidth="4.2"
                  strokeLinecap="round"
                  fill="none"
              />
              <path d="M595 55 L582 32 L604 48 Z" fill="#1a110b" />
            </g>

            {/* ================= TAIL ================= */}
            <g className="dragon-tail">
              <path d="M672 432 C748 455 808 520 875 550 C925 572 965 560 1015 530 C985 568 940 595 880 582 C805 565 745 505 665 476 Z" />
              <path d="M740 468 L752 452 L758 474 M782 490 L796 474 L800 498 M824 516 L839 502 L841 526 M868 542 L884 530 L882 550" />
              <path
                  d="M720 462 C785 495 835 545 900 568 M760 488 Q772 498 784 494 M805 516 Q818 526 830 522 M850 542 Q864 552 878 548"
                  stroke="#f1e3c4"
                  strokeWidth="1.3"
                  opacity="0.24"
                  fill="none"
              />
              <path d="M998 538 L1038 508 L1022 542 L1046 554 L1004 556 Z" />
            </g>

            {/* ================= HIND LEG ================= */}
            <g className="dragon-hind-leg">
              <path d="M602 428 C658 438 685 488 668 532 C658 555 642 566 654 585 L688 604 L672 608 L656 598 L660 612 L644 610 L636 598 L628 610 L614 594 C624 574 622 552 612 532 C595 498 582 460 602 428 Z" />
              <path
                  d="M618 456 C642 468 652 496 642 524 M628 538 Q642 544 654 540"
                  stroke="#f1e3c4"
                  strokeWidth="1.4"
                  opacity="0.25"
                  fill="none"
              />
              <path d="M688 604 L702 612 L684 609 M660 612 L670 622 L654 614 M628 610 L632 622 L620 611" fill="#170f0a" />
            </g>

            {/* ================= FORELEG ================= */}
            <g className="dragon-fore-leg">
              <path d="M466 420 C446 460 424 488 400 508 L374 522 L386 528 L398 524 L382 538 L398 540 L408 532 L404 546 L422 540 C434 520 462 494 492 452 Z" />
              <path
                  d="M464 446 C448 470 432 488 416 502"
                  stroke="#f1e3c4"
                  strokeWidth="1.3"
                  opacity="0.24"
                  fill="none"
              />
              <path d="M374 522 L358 526 L378 527 M382 538 L366 546 L388 542 M404 546 L396 558 L412 545" fill="#170f0a" />
            </g>

            {/* ================= UNIFIED TORSO, NECK & SKULL ================= */}
            <g className="dragon-torso">
              <path
                  d="M324 140
                 C356 142 382 160 402 190
                 C438 244 456 306 472 354
                 C525 335 605 345 672 388
                 C708 410 722 448 698 476
                 C672 504 605 496 545 478
                 C495 462 458 446 436 414
                 C412 352 394 286 368 232
                 C352 200 334 182 312 174 Z"
              />

              {/* Belly scutes & muscular contour lines */}
              <path
                  d="M446 414 Q464 422 482 418 M462 432 Q482 440 502 434 M482 448 Q505 456 526 450 M508 464 Q532 472 554 466 M536 476 Q562 484 588 478"
                  stroke="#f1e3c4"
                  strokeWidth="1.5"
                  opacity="0.28"
                  fill="none"
              />
              <path
                  d="M518 378 C542 396 546 426 528 450 M548 386 C568 406 572 432 556 454 M578 396 C594 414 598 436 586 454 M608 408 C622 424 624 442 614 456"
                  stroke="#140d09"
                  strokeWidth="2"
                  opacity="0.45"
                  fill="none"
              />

              {/* Dorsal spines along neck & spine */}
              <path d="M372 152 L396 134 L388 164 M394 174 L422 158 L410 188 M414 204 L444 192 L428 220 M430 238 L462 228 L444 256 M444 276 L476 268 L456 294 M456 314 L486 310 L466 334 M496 346 L520 322 L522 350 M546 348 L572 326 L572 354 M596 358 L622 338 L618 366" />

              {/* Neck & throat scale segmentation */}
              <path
                  d="M328 178 Q350 186 358 204 M344 208 Q366 216 374 234 M360 238 Q382 246 390 264 M376 270 Q398 278 406 296 M392 304 Q414 312 422 330 M408 338 Q430 346 438 364"
                  stroke="#f1e3c4"
                  strokeWidth="1.6"
                  opacity="0.28"
                  fill="none"
              />
            </g>

            {/* ================= NEAR WING ================= */}
            <g className="dragon-wing-near">
              <path
                  d="M528 370 L595 190 L695 45 C785 48 875 68 970 92 C915 132 900 172 925 215 C865 220 835 252 835 302 C775 298 735 322 712 365 C652 352 590 356 528 370 Z"
                  fill="url(#wing-membrane)"
              />
              <path
                  d="M715 95 Q795 135 885 130 M705 135 Q775 185 845 205 M670 185 Q720 245 765 285 M615 235 Q645 295 665 340 M655 110 Q725 165 795 185"
                  stroke="#f1e3c4"
                  strokeWidth="1.15"
                  opacity="0.22"
                  fill="none"
              />
              <path
                  d="M530 368 L598 192 L695 45 M695 45 L970 92 M695 45 L925 215 M695 45 L835 302 M635 136 L712 365"
                  stroke="#1c120c"
                  strokeWidth="5.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
              />
              <path d="M695 45 L676 14 L692 26 L708 16 L704 42 Z" fill="#170f0a" />
            </g>

            {/* ================= SCULPTED HEAD & CONNECTED JAW ================= */}
            <g className="dragon-head" style={{ transformOrigin: '328px 156px' }}>
              {/* Swept horns merged into cranial ridge */}
              <path d="M312 136 C338 102 378 76 432 66 C392 92 364 116 344 146 Z" />
              <path d="M292 132 C312 104 342 86 382 80 C354 98 334 116 320 138 Z" opacity="0.85" />
              <path
                  d="M342 114 L352 124 M364 98 L374 108 M388 84 L396 94"
                  stroke="#f1e3c4"
                  strokeWidth="1.3"
                  opacity="0.32"
              />

              {/* Cheek & jaw crest */}
              <path d="M326 164 L356 166 L334 178 M318 178 L346 184 L322 192" />

              {/* Lower Jaw pivoting smoothly from joint (286, 184) */}
              <g
                  className="dragon-jaw"
                  style={{
                    transformOrigin: '286px 184px',
                    transform: `rotate(${(jawOpen * 24).toFixed(1)}deg)`,
                  }}
              >
                <path
                    d="M168 186
                   C208 185 248 184 286 183
                   C302 195 296 210 274 212
                   C236 214 198 205 166 194
                   C162 192 163 187 168 186 Z"
                />
                {/* Chin horn & jaw ridge */}
                <path d="M174 195 L162 203 L184 199 Z" />
                <path
                    d="M188 196 Q235 202 282 195"
                    stroke="#f1e3c4"
                    strokeWidth="1.2"
                    opacity="0.25"
                    fill="none"
                />
                {/* Lower teeth integrated along jaw rim */}
                <path
                    d="M178 186 L181 177 L184 186 M196 186 L199 179 L202 186 M214 185 L217 177 L220 185 M234 185 L237 179 L240 185 M254 184 L257 178 L260 184"
                    fill="#f1e3c4"
                    opacity="0.76"
                />
              </g>

              {/* Continuous Upper Skull, Snout & Cheekbone */}
              <path
                  d="M336 140
                 C304 122 262 124 234 138
                 L176 155
                 C154 161 144 169 143 178
                 C143 185 152 189 168 189
                 L274 185
                 C302 183 326 174 342 158
                 C350 148 346 144 336 140 Z"
              />

              {/* Nasal horn & subtle snout contour lines */}
              <path d="M164 159 L146 142 L176 155 Z" />
              <path
                  d="M178 161 Q212 156 242 146 M186 169 Q218 164 248 156 M242 168 Q272 172 298 160"
                  stroke="#f1e3c4"
                  strokeWidth="1.2"
                  opacity="0.24"
                  fill="none"
              />
              <ellipse cx="164" cy="170" rx="4.2" ry="2.3" transform="rotate(-18 164 170)" fill="#120b07" />

              {/* Upper teeth along snout edge */}
              <path
                  d="M164 188 L167 198 L170 188 M182 188 L185 195 L188 188 M200 187 L203 196 L206 187 M218 187 L221 194 L224 187 M238 186 L241 195 L244 186 M258 185 L261 192 L264 185"
                  fill="#f1e3c4"
                  opacity="0.82"
              />

              {/* Brow ridge */}
              <path
                  className="dragon-brow"
                  d="M234 146 L278 138 L294 144"
                  stroke="#170f0a"
                  strokeWidth="5.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  fill="none"
              />
            </g>

            {/* Woodcut engraving hatch over the unified dragon */}
            <rect width="1000" height="700" fill="url(#dragon-hatch)" className="dragon-hatch" style={{ mixBlendMode: 'multiply' }} />
          </g>

          {/* ================= EYE ================= */}
          <g className="dragon-head" style={{ transformOrigin: '328px 156px' }}>
            <g className="dragon-eye">
              <ellipse cx="258" cy="153" rx="13" ry="7.5" fill="#140c08" />
              <ellipse cx="258" cy="153" rx="10.5" ry="5.5" fill="url(#dragon-eye)" />
              <ellipse cx="258" cy="153" rx="1.8" ry="5.2" fill="#120a0e" />
              <circle cx="255" cy="151" r="1.2" fill="#ffffff" opacity="0.85" />
              <path
                  className="dragon-lid"
                  d="M245 153 C250 144 266 144 271 153 C266 162 250 162 245 153 Z"
                  fill="#2e2017"
              />
            </g>
          </g>

          {/* ================= NOSTRIL SMOKE (Kritiek & Desync) ================= */}
          <g className="dragon-smoke" fill="#5c4738">
            <path d="M162 169 C145 161 132 145 140 130 C146 118 128 105 138 92 C148 105 162 118 156 134 C150 148 160 159 162 169 Z" opacity="0.72" />
            <circle cx="152" cy="158" r="6.5" opacity="0.55" />
            <circle cx="144" cy="142" r="9.5" opacity="0.4" />
            <circle cx="138" cy="122" r="12.5" opacity="0.25" />
          </g>

          <text className="dragon-zzz font-display" x="210" y="95" fill="#6b5442" fontSize="36">
            z Z z
          </text>

          {/* ================= FIRE BREATH FROM THE MOUTH GAP ================= */}
          <g
              className="dragon-fire"
              style={{
                opacity: firePower,
                transformOrigin: '164px 190px',
                transform: `scale(${(0.2 + firePower * 0.85).toFixed(3)}) rotate(${(12 + jawOpen * 14).toFixed(1)}deg)`,
              }}
          >
            <g transform="translate(164 190) translate(-600 -60)">
              {/* Outer streaming flame */}
              <path
                  className="fire-layer"
                  d="M600 54
                 C535 32 455 20 365 34
                 C295 44 230 28 155 46
                 C85 62 10 56 -420 96
                 C-110 104 125 102 215 94
                 C295 86 355 104 430 88
                 C505 74 555 70 600 66 Z"
                  fill="url(#fire-outer)"
              />
              {/* Secondary inner flame */}
              <path
                  className="fire-layer"
                  d="M600 56
                 C535 42 465 40 390 52
                 C315 62 235 54 -170 78
                 C175 82 285 80 375 74
                 C465 70 540 68 600 63 Z"
                  fill="#ff9e2c"
                  opacity="0.85"
              />
              {/* Tapered bright core */}
              <path
                  className="fire-layer"
                  d="M600 58
                 C545 53 490 54 425 60
                 C480 66 542 66 600 62 Z"
                  fill="url(#fire-core)"
              />
            </g>
          </g>
        </svg>
      </div>
  )
}