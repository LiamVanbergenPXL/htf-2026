import { ACHRONA_BUILDINGS, type BuildingId } from './achrona-map'

export type MapPoint = { x: number; y: number }
export const PLAZA: MapPoint = { x: 50, y: 58 }
export const SPAWN: MapPoint = { x: 55, y: 76 }
export const shore: MapPoint[] = [
  { x: 6, y: 49 }, { x: 17, y: 31 }, { x: 34, y: 23 }, { x: 50, y: 17 },
  { x: 72, y: 20 }, { x: 88, y: 35 }, { x: 96, y: 55 }, { x: 87, y: 72 },
  { x: 66, y: 79 }, { x: 49, y: 88 }, { x: 25, y: 82 }, { x: 12, y: 69 },
]

export function onIsland({ x, y }: MapPoint) {
  return shore.reduce((inside, a, index) => {
    const b = shore[(index + 1) % shore.length]
    return (a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x ? !inside : inside
  }, false)
}

const models = {
  gate: { wall: '#b7a784', side: '#736850', roof: '#657b89', width: 73, height: 64 },
  post: { wall: '#dfb888', side: '#9f7155', roof: '#a45043', width: 65, height: 52 },
  oracle: { wall: '#aba3be', side: '#6a6285', roof: '#7463aa', width: 45, height: 95 },
  archive: { wall: '#bbbaa7', side: '#777f73', roof: '#3e847d', width: 78, height: 61 },
}

const trees: MapPoint[] = [
  {x: 15,y: 53}, {x: 18,y: 59}, {x: 24,y: 34}, {x: 29,y: 31}, {x: 31,y: 36},
  {x: 41,y: 28}, {x: 45,y: 25}, {x: 49,y: 33}, {x: 72,y: 29}, {x: 77,y: 32},
  {x: 84,y: 40}, {x: 88,y: 45}, {x: 88,y: 62}, {x: 82,y: 68}, {x: 74,y: 71},
  {x: 67,y: 68}, {x: 35,y: 76}, {x: 27,y: 73}, {x: 24,y: 68}, {x: 61,y: 76},
]

export function drawAchrona(ctx: CanvasRenderingContext2D, width: number, height: number) {
  const scale = Math.min(width / 760, height / 560, 1.6)
  const point = ({ x, y }: MapPoint): [number, number] => [width * x / 100, height * y / 100]
  const shape = (points: [number, number][], fill: string | CanvasGradient) => {
    ctx.beginPath()
    points.forEach(([x, y], index) => index ? ctx.lineTo(x, y) : ctx.moveTo(x, y))
    ctx.closePath()
    ctx.fillStyle = fill
    ctx.fill()
  }
  const ellipse = (x: number, y: number, rx: number, ry: number, fill: string) => {
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, 0, 0, 2 * Math.PI)
    ctx.fillStyle = fill
    ctx.fill()
  }
  const coast = shore.map(point)
  shape(coast.map(([x, y]) => [x, y + 27 * scale]), '#122f34')
  shape(coast.map(([x, y]) => [x, y + 18 * scale]), '#343830')
  shape(coast.map(([x, y]) => [x, y + 8 * scale]), '#706755')
  const grass = ctx.createLinearGradient(0, height * .17, width * .7, height * .87)
  grass.addColorStop(0, '#778660')
  grass.addColorStop(1, '#374f42')
  shape(coast, grass)

  // Deterministic flecks give the terrain texture without an image download.
  for (let i = 0; i < 430; i++) {
    const sample = { x: (i * 37.71) % 100, y: (i * 67.37) % 100 }
    if (onIsland(sample)) {
      const [x, y] = point(sample)
      ellipse(x, y, (1 + i % 4) * scale, scale, i % 2 ? '#ddd0a01f' : '#12282035')
    }
  }

  const [cx, cy] = point(PLAZA)
  ctx.lineCap = 'round'
  for (const [color, thickness] of [['#343c34', 24], ['#ad9d75', 17], ['#d6bc8740', 11]] as const) {
    ctx.strokeStyle = color
    ctx.lineWidth = thickness * scale
    for (const destination of [...ACHRONA_BUILDINGS, SPAWN]) {
      const [x, y] = point(destination)
      ctx.beginPath()
      ctx.moveTo(cx, cy)
      ctx.lineTo(x, y)
      ctx.stroke()
    }
  }
  ellipse(cx, cy, 30 * scale, 15 * scale, '#736a59')
  ellipse(cx, cy - 3 * scale, 27 * scale, 13 * scale, '#c3b28b')
  ellipse(cx, cy - 4 * scale, 18 * scale, 9 * scale, '#4d8587')
  ellipse(cx - 3 * scale, cy - 6 * scale, 6 * scale, 2 * scale, '#a5dad5')

  function tree(location: MapPoint, index: number) {
    const [x, y] = point(location)
    const s = scale * (.65 + index % 4 * .13)
    ellipse(x + 5 * s, y, 15 * s, 4 * s, '#17291e80')
    ctx.fillStyle = '#674e38'
    ctx.fillRect(x - 2 * s, y - 14 * s, 4 * s, 13 * s)
    for (let i = 0; i < 3; i++) {
      const base = y - (7 + i * 8) * s
      const radius = (14 - i * 2) * s
      shape([[x - radius, base], [x, base - 23 * s], [x + radius, base], [x, base + 5 * s]], '#345747')
      shape([[x - radius, base], [x, base - 23 * s], [x, base + 5 * s]], '#64825a')
    }
  }

  function building({ id, ...location }: MapPoint & { id: BuildingId }) {
    const [x, y] = point(location)
    const { wall, side, roof, width: bodyWidth, height: bodyHeight } = models[id]
    const w = bodyWidth * scale
    const h = bodyHeight * scale
    const d = 21 * scale
    const left = x - w / 2
    const right = x + w / 2
    const upper = y - h
    ellipse(x + d * .4, y - 2 * scale, w * .72, d * .65, '#19271f70')
    shape([[left,y], [right,y], [right + d,y - d], [right + d,upper - d], [right,upper], [left,upper]], side)
    shape([[left,y], [right,y], [right,upper], [left,upper]], wall)
    ctx.fillStyle = '#302b30'
    ctx.fillRect(x - 7 * scale, y - 20 * scale, 14 * scale, 20 * scale)
    ctx.fillStyle = '#f2ca80'
    const windows = id === 'oracle' ? [-4] : [-.32 * bodyWidth, .22 * bodyWidth]
    for (const offset of windows) {
      ctx.fillRect(x + offset * scale, upper + 17 * scale, 7 * scale, 12 * scale)
    }
    const peak = upper - (id === 'oracle' ? 32 : 20) * scale
    if (id === 'gate') {
      shape([[left - d * .2,upper], [right + d,upper - d], [right + d,upper - d * 1.5], [left + d,upper - d * 1.5], [left - d * .2,upper - d * .5]], roof)
      for (let i = 0; i < 4; i++) ctx.fillRect(left + i * w / 4, upper - 8 * scale, 10 * scale, 8 * scale)
    } else {
      shape([[left - 5 * scale,upper], [x,peak], [x + d,peak - d], [right + d + 5 * scale,upper - d], [right + 5 * scale,upper]], roof)
      shape([[left - 5 * scale,upper], [x,peak], [right + 5 * scale,upper]], '#ffffff22')
    }
  }
  const scenery = [
    ...trees.map((location, index) => ({ y: location.y, draw: () => tree(location, index) })),
    ...ACHRONA_BUILDINGS.map((location) => ({ y: location.y, draw: () => building(location) })),
  ]
  scenery.sort((a, b) => a.y - b.y).forEach(({ draw }) => draw())
}
