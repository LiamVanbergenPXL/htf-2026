import * as T from 'three'
import { buildHero } from './achrona-hero'
import { characters, type CharacterId } from './achrona-characters'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { ACHRONA_BUILDINGS, type BuildingId } from './achrona-map'
import { PLAZA, shore, onIsland, type MapPoint } from './achrona-scene'

const stone = 0xa5a59c, trim = 0xd8cfaf, slate = 0x38516a, timber = 0x50342b
const brass = 0xd7a94e, amber = 0xffc96c, night = 0x232335

export function createRealm(canvas: HTMLCanvasElement) {
  const renderer = new T.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'low-power' })
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7))
  renderer.shadowMap.enabled = true
  renderer.shadowMap.type = T.PCFSoftShadowMap
  const scene = new T.Scene()
  scene.background = new T.Color(0x718c92)
  scene.fog = new T.FogExp2(0x9bb1ad, .008)
  const camera = new T.OrthographicCamera(-65, 65, 46, -46, .1, 600)
  scene.add(new T.HemisphereLight(0xfff0ce, 0x586762, 2))
  const sun = new T.DirectionalLight(0xffdc9b, 2.7)
  sun.position.set(-56, 82, 46)
  sun.castShadow = true
  Object.assign(sun.shadow.camera, { left: -63, right: 63, top: 67, bottom: -62, far: 230 })
  sun.shadow.mapSize.set(2048, 2048)
  sun.shadow.normalBias = .13
  scene.add(sun)
  const landscape = new T.Group()
  scene.add(landscape)
  const materials = new Map<number, T.MeshStandardMaterial>()
  const geometries = new Set<T.BufferGeometry>()
  const boxGeometry = new T.BoxGeometry(1, 1, 1)
  const roundShapes = new Map<string, T.CylinderGeometry>()
  const jewel = new T.OctahedronGeometry(1)
  function mesh(parent: T.Object3D, geometry: T.BufferGeometry, color: number, x: number, y: number, z: number) {
    geometries.add(geometry)
    let material = materials.get(color)
    if (!material) {
      material = new T.MeshStandardMaterial({ color, flatShading: true, roughness: .89,
        emissive: color === amber || color === 0x8af5ef ? color : 0, emissiveIntensity: .5 })
      materials.set(color, material)
    }
    const piece = new T.Mesh(geometry, material)
    piece.position.set(x, y, z)
    piece.castShadow = piece.receiveShadow = true
    parent.add(piece)
    return piece
  }
  function box(p: T.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, c: number) {
    const m = mesh(p, boxGeometry, c, x, y, z)
    m.scale.set(w, h, d)
    return m
  }
  function round(p: T.Object3D, x: number, y: number, z: number, top: number, base: number, h: number, c: number, sides = 10) {
    const key = [top, base, h, sides].join('/')
    if (!roundShapes.has(key)) roundShapes.set(key, new T.CylinderGeometry(top, base, h, sides))
    return mesh(p, roundShapes.get(key)!, c, x, y, z)
  }
  function beam(p: T.Object3D, a: number[], b: number[], thickness: number, color: number) {
    const start = new T.Vector3(...a), end = new T.Vector3(...b)
    const delta = end.clone().sub(start)
    const m = box(p, 0, 0, 0, thickness, delta.length(), thickness, color)
    m.position.copy(start).lerp(end, .5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize())
  }
  const world = (point: MapPoint) => new T.Vector3(point.x - 50, 0, point.y - 50)
  const sea = box(landscape, 0, -4.4, 0, 480, .8, 420, 0x3b7277)
  sea.receiveShadow = true
  const outline = new T.Shape(shore.map(({ x, y }) => new T.Vector2(x - 50, 50 - y)))
  const island = new T.ExtrudeGeometry(outline, { depth: 3.4, bevelSize: .65, bevelThickness: .55, bevelSegments: 1 })
  island.rotateX(-Math.PI / 2)
  mesh(landscape, island, 0x605b4b, 0, -4, 0)
  const lawn = new T.ShapeGeometry(outline)
  lawn.rotateX(-Math.PI / 2)
  mesh(landscape, lawn, 0x83915d, 0, -.02, 0)
  let seed = 7381
  function random() { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  for (let i = 0; i < 54; i++) {
    const x = (random() - .5) * 290, z = -53 - random() * 70, h = 9 + random() * 36
    round(landscape, x, h / 2 - 6, z, 0, h * .8, h, i % 2 ? 0x576d73 : 0x708489, 6)
    round(landscape, x, h * .86 - 6, z, 0, h * .23, h * .28, 0xd7d9c8, 6)
  }
  function road(a: MapPoint, b: MapPoint) {
    const start = world(a), end = world(b), d = start.distanceTo(end)
    const path = box(landscape, (start.x + end.x) / 2, .015, (start.z + end.z) / 2, 2.7, .1, d, 0xbda681)
    path.rotation.y = Math.atan2(end.x - start.x, end.z - start.z)
    for (let i = 0; i < d; i += 1.5) {
      const pos = start.clone().lerp(end, i / d)
      const stone = box(landscape, pos.x + random() - .5, .09, pos.z, .6 + random(), .08, .5, 0xd3bd93)
      stone.rotation.y = random() * 2
    }
  }
  const roofs = { gate: slate, post: 0xa24e39, oracle: 0x4c4979, archive: 0x47716c }
  function spire(p: T.Object3D, x: number, z: number, radius: number, height: number, color: number) {
    round(p, x, height / 2, z, radius * .89, radius, height, stone)
    for (const y of [.45, height * .51, height - .35]) round(p, x, y, z, radius * 1.04, radius * 1.04, .36, trim)
    round(p, x, height + radius, z, 0, radius * 1.36, radius * 2.4, color)
    round(p, x, height + radius * 2.3, z, .045, .12, 1.55, brass)
    box(p, x + .54, height + radius * 2.6, z, 1.05, .53, .09, color)
    for (const angle of [0, 1.4, -1.4]) {
      const pane = box(p, x + Math.sin(angle) * radius * .93, height * .68, z + Math.cos(angle) * radius * .93, .46, 1.15, .12, amber)
      pane.rotation.y = angle
    }
  }
  function peakedRoof(p: T.Group, w: number, d: number, y: number, pitch: number, color: number) {
    for (const side of [-1, 1]) {
      const roof = box(p, side * w / 4, y + pitch / 2, 0, Math.hypot(w / 2, pitch) + .65, .42, d + 1, color)
      roof.rotation.z = -side * Math.atan2(pitch, w / 2)
      beam(p, [side * w / 2, y, d / 2 + .5], [0, y + pitch, d / 2 + .5], .31, brass)
    }
  }
  function arch(p: T.Object3D, x: number, y: number, z: number, radius: number) {
    box(p, x, y / 2, z, radius * 2, y, .26, night)
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * i / 12
      const block = box(p, x + Math.cos(a) * radius, y + Math.sin(a) * radius, z, .55, .48, .6, trim)
      block.rotation.z = a
    }
    for (const sign of [-1, 1]) box(p, x + sign * radius, y / 2, z, .5, y, .6, trim)
  }
  for (const b of ACHRONA_BUILDINGS) {
    road(PLAZA, { x: b.x, y: b.y + 2 })
    const p = new T.Group()
    landscape.add(p)
    p.position.copy(world(b))
    p.position.z -= 3
    p.rotation.y = b.id === 'archive' ? -.26 : .19
    const roof = roofs[b.id]
    box(p, 0, .28, 0, 11, .6, 7.6, 0x84877b)
    if (b.id === 'gate') {
      for (const x of [-4, 4]) spire(p, x, 0, 2.3, 6.2, roof)
      box(p, 0, 4.6, 0, 6, 2.9, 3.3, stone)
      arch(p, 0, 2.9, 1.8, 1.65)
      for (let i = -2; i <= 2; i++) box(p, i, 6.3, 1.3, .55, .8, .7, trim)
    } else if (b.id === 'oracle') {
      spire(p, 0, 0, 3.3, 10, roof)
      spire(p, -3, 1, 1.4, 5.6, roof)
      spire(p, 2.8, -1.2, 1.5, 7, roof)
      arch(p, 0, 2.1, 3.2, 1.1)
      mesh(p, jewel, 0x8af5ef, 0, 19, 0).scale.set(.7, 1.35, .7)
    } else {
      const hall = b.id === 'archive'
      const width = hall ? 10 : 8, height = hall ? 6 : 4.7
      box(p, 0, height / 2, 0, width, height, 6, hall ? stone : 0xe0c8a0)
      peakedRoof(p, width + .4, 6.9, height, hall ? 3.6 : 3, roof)
      for (const x of [-width / 2 + .25, -2.4, 2.4, width / 2 - .25]) {
        box(p, x, height / 2, 3.12, hall ? .65 : .32, height, hall ? .85 : .25, hall ? trim : timber)
      }
      for (const x of [-1, 1]) {
        box(p, x * 3.4, height * .61, 3.13, 1.1, 1.45, .18, amber)
        if (!hall) beam(p, [x * 1.5, 1, 3.2], [x * 3.8, 4.5, 3.2], .24, timber)
      }
      arch(p, 0, 2.15, 3.22, 1.05)
      if (hall) {
        spire(p, -4.8, -2.8, 1.65, 6.5, roof)
        spire(p, 4.8, -2.8, 1.65, 6.5, roof)
        for (const x of [-3.2, 3.2]) box(p, x, 4.8, 3.5, .84, 2.1, .13, roof)
      } else {
        box(p, 2, 6.7, -1.6, 1.1, 3.2, 1.1, 0x806754)
        box(p, 0, 3.15, 3.3, width, .26, .35, timber)
        box(p, -4.5, 3.1, 2.8, 2, .23, .25, timber)
        box(p, -5.1, 2.3, 2.8, 1.3, 1.3, .2, brass)
      }
    }
  }
  for (let i = 0; i < 360; i++) {
    const p = { x: random() * 100, y: random() * 100 }
    if (!onIsland(p) || (p.x > 15 && p.x < 85 && p.y > 31 && p.y < 77)) continue
    const { x, z } = world(p), h = 2.2 + random() * 4
    round(landscape, x, .7, z, .25, .36, 1.5, timber, 5)
    for (let j = 0; j < 3; j++) round(landscape, x, h * (.42 + j * .22), z, 0, h * (.32 - j * .055), h * .63, [0x34584a, 0x446d51, 0x5e7c55][j], 7)
  }
  const well = world(PLAZA)
  round(landscape, well.x, .17, well.z, 3.4, 3.65, .4, trim, 12)
  round(landscape, well.x, .54, well.z, 1.49, 1.8, .8, stone)
  round(landscape, well.x, .98, well.z, 1.35, 1.35, .1, 0x8af5ef)

  // Batch static geometry by material. Towers and trees then cost one draw per colour.
  landscape.updateMatrixWorld(true)
  const batches = new Map<T.Material, T.BufferGeometry[]>()
  landscape.traverse(obj => {
    if (!(obj instanceof T.Mesh)) return
    const geo = obj.geometry.index ? obj.geometry.toNonIndexed() : obj.geometry.clone()
    geo.applyMatrix4(obj.matrixWorld)
    const list = batches.get(obj.material) ?? []
    list.push(geo)
    batches.set(obj.material, list)
  })
  scene.remove(landscape)
  for (const [material, list] of batches) {
    const geometry = mergeGeometries(list)!
    const m = new T.Mesh(geometry, material)
    m.castShadow = m.receiveShadow = true
    scene.add(m)
    geometries.add(geometry)
    list.forEach(g => g.dispose())
  }
  const hero = new T.Group()
  scene.add(hero)
  const avatars = characters.map(({ id }) => {
    const avatar = buildHero(id, mesh)
    hero.add(avatar.root)
    return { id, ...avatar }
  })
  const beacon = mesh(scene, jewel, 0x8af5ef, 0, 2, 0)
  const wraith = mesh(scene, jewel, 0x91448a, 0, 2, 0)
  const fires = new Map<BuildingId,T.Group>()
  for (const b of ACHRONA_BUILDINGS) {
    const flame = new T.Group()
    flame.position.copy(world(b))
    flame.position.y = b.id === 'oracle' ? 12 : 6
    scene.add(flame)
    for (let i = 0; i < 5; i++) {
      const f = mesh(flame, jewel, i % 2 ? amber : 0xff6126, i * .63 - 1.3, 1, 0)
      f.scale.set(.8, 1.8 + i % 2, .75)
    }
    fires.set(b.id, flame)
  }
  const focus = new T.Vector3(), vector = new T.Vector3()
  let width = 1, height = 1
  const resize = () => {
    width = canvas.clientWidth || 1
    height = canvas.clientHeight || 1
    renderer.setSize(width, height, false)
  }
  const observer = new ResizeObserver(resize)
  observer.observe(canvas)
  resize()
  return {
    project(p: MapPoint) {
      vector.copy(world(p)).project(camera)
      return { x: (vector.x + 1) * 50, y: (1 - vector.y) * 50 }
    },
    frame(p: MapPoint, character: CharacterId, angle: number, moving: boolean, close: boolean, time: number, target: MapPoint | null, hazard: MapPoint | null, burning: Set<BuildingId>, reduced: boolean) {
      const aspect = width / height
      const span = close ? Math.max(15, 11 / aspect) : Math.max(34, 55 / aspect)
      Object.assign(camera, { left: -span * aspect, right: span * aspect, top: span, bottom: -span })
      focus.set(close ? p.x - 50 : 0, close ? 1.7 : 2, close ? p.y - 50 : 0)
      camera.position.copy(focus).add(vector.set(0, 71, 84))
      camera.lookAt(focus)
      camera.updateProjectionMatrix()
      camera.updateMatrixWorld()
      hero.position.copy(world(p))
      hero.rotation.y = angle
      const stride = moving && !reduced ? Math.sin(time * 14) : 0
      for (const avatar of avatars) {
        avatar.root.visible = avatar.id === character
        if (avatar.root.visible) avatar.animate(stride, time, reduced)
      }
      for (const [id, fire] of fires) {
        fire.visible = burning.has(id)
        fire.scale.y = reduced ? 1 : 1 + Math.sin(time * 7 + fire.position.x) * .19
      }
      for (const [object, location] of [[beacon,target],[wraith,hazard]] as const) {
        object.visible = Boolean(location)
        if (location) {
          object.position.copy(world(location))
          object.position.y = 2.1 + (reduced ? 0 : Math.sin(time * 2) * .28)
          object.rotation.y = reduced ? 0 : time
          object.scale.set(1.15, 1.85, 1.15)
        }
      }
      renderer.render(scene, camera)
    },
    dispose() {
      observer.disconnect()
      geometries.forEach(g => g.dispose())
      materials.forEach(m => m.dispose())
      renderer.dispose()
    },
  }
}
