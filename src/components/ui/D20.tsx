import type { ReactNode } from 'react'

// Front view of an icosahedron: outer hexagon, centre face, and the edges between them.
const HEXAGON = '100,8 180,54 180,146 100,192 20,146 20,54'
const FACE = '100,50 144,126 56,126'
const EDGES = [
  [100, 50, 100, 8], [100, 50, 180, 54], [100, 50, 20, 54],
  [144, 126, 180, 54], [144, 126, 180, 146], [144, 126, 100, 192],
  [56, 126, 100, 192], [56, 126, 20, 146], [56, 126, 20, 54],
]

type D20Props = {
  className?: string
  /** Fill of the centre face. */
  faceClassName?: string
  strokeClassName?: string
  /** Rendered on the centre face, e.g. a number. */
  children?: ReactNode
}

export function D20({ className = '', faceClassName = 'fill-transparent', strokeClassName = 'stroke-current', children }: D20Props) {
  return (
    <svg viewBox="0 0 200 200" className={className} aria-hidden="true">
      <g className={strokeClassName} strokeWidth="5" strokeLinejoin="round" fill="none">
        <polygon points={HEXAGON} />
        <polygon points={FACE} className={faceClassName} />
        {EDGES.map(([x1, y1, x2, y2]) => <line key={`${x1}${y1}${x2}${y2}`} x1={x1} y1={y1} x2={x2} y2={y2} />)}
      </g>
      {children}
    </svg>
  )
}
