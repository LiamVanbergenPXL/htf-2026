import * as T from 'three'
import type { CharacterId } from './achrona-characters'

/** Outlines are drawn in the character's local front plane, with real thickness. */
export function buildHero(id: CharacterId, mesh: (parent: T.Object3D, geometry: T.BufferGeometry, color: number, x: number, y: number, z: number) => T.Mesh) {
  const root = new T.Group()
  const torso = new T.Group()
  root.add(torso)
  const silver = 0xcad5e7, blue = 0x1448dd, teal = 0x53bdc0, dark = 0x252943
  const gold = 0xe9a938, violet = 0x514591, cyan = 0x65e6ff
  const faceted = new T.SphereGeometry(1, 9, 6)
  const cube = new T.BoxGeometry()
  const head = new T.Group()
  head.position.y = 3.05
  torso.add(head)

  function oval(p: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const m = mesh(p, faceted, color, x, y, z)
    m.scale.set(w, h, d)
    return m
  }
  function block(p: T.Group, x: number, y: number, z: number, w: number, h: number, d: number, color: number) {
    const m = mesh(p, cube, color, x, y, z)
    m.scale.set(w, h, d)
    return m
  }
  function plate(p: T.Group, outline: number[][], depth: number, color: number, x = 0, y = 0, z = 0) {
    const profile = new T.Shape(outline.map(([a, b]) => new T.Vector2(a,b)))
    const shape = new T.ExtrudeGeometry(profile, { depth, bevelEnabled: false })
    return mesh(p, shape, color, x, y, z)
  }
  function rod(p: T.Group, start: number[], end: number[], radius: number, color: number) {
    const a = new T.Vector3(...start), b = new T.Vector3(...end)
    const axis = b.clone().sub(a)
    const m = mesh(p, new T.CylinderGeometry(radius, radius, axis.length(), 7), color, 0, 0, 0)
    m.position.copy(a).lerp(b, .5)
    m.quaternion.setFromUnitVectors(new T.Vector3(0,1,0), axis.normalize())
    return m
  }
  const skin = id === 'guardian' ? teal : id === 'scout' ? 0xc5d6a3 : 0x299cba
  const cloth = id === 'guardian' ? blue : id === 'scout' ? gold : violet
  const broad = id === 'guardian' ? 1.22 : 1
  const legs = [-1,1].map(sign => {
    const hip = new T.Group()
    root.add(hip)
    hip.position.set(sign * .35, 1.26, 0)
    oval(hip,0,-.45,0,.32,.57,.34,dark)
    block(hip,0,-.93,.07,.54,.56,.7,id === 'guardian' ? silver : id === 'archer' ? violet : 0x704a32)
    return hip
  })
  oval(torso,0,1.98,0,.89 * broad,.91,.58,cloth)
  oval(torso,0,1.45,0,.84,.16,.57,dark)
  block(torso,0,1.45,.56,.26,.22,.09,id === 'scout' ? gold : silver)
  oval(head,0,.04,0,.71 * broad,.69,.57,skin)
  const arms = [-1,1].map(sign => {
    const arm = new T.Group()
    torso.add(arm)
    arm.position.set(sign * .87 * broad,2.47,0)
    rod(arm,[0,0,0],[sign * .18,-.6,.09],.23,cloth)
    rod(arm,[sign * .18,-.6,.09],[sign * .25,-.84,.49],.19,skin)
    oval(arm,sign * .25,-.82,.49,.24,.24,.24,skin)
    return arm
  })
  if (id === 'guardian') {
    for (const side of [-1,1]) {
      plate(head,[[0,0],[side * .6,.45],[side * .22,-.24]],.15,teal,side * .63,.04,-.1)
      plate(head,[[0,0],[side * .49,.1],[side * .51,.24],[0,.14]],.06,0xc3f4ed,side * .05,.08,.49)
      block(head,side * .28,.09,.55,.13,.07,.05,dark)
      plate(head,[[0,0],[.16,0],[.08,.28]],.12,0xf4edd6,side * .44,-.37,.43)
      const arm = arms[side === -1 ? 0 : 1]
      oval(arm,0,-.01,0,.61,.46,.62,silver)
      rod(arm,[-.34,.13,.43],[-.04,.07,.58],.033,blue)
      rod(arm,[-.04,.07,.58],[.24,.19,.48],.033,blue)
      oval(torso,side * .61,2.42,.42,.16,.17,.1,silver)
      oval(torso,side * .61,2.42,.51,.1,.11,.07,blue)
    }
    oval(head,0,-.1,.56,.2,.22,.14,0x328e95)
    block(head,0,-.34,.49,.66,.035,.09,0x25575d)
    plate(torso,[[-.62,.3],[.62,.3],[.44,-.48],[0,-.66],[-.46,-.48]],.15,0x596b84,0,2.05,.43)
    const arm = arms[1]
    rod(arm,[.27,-1.81,.5],[.27,1.65,.5],.1,0x694d3e)
    plate(arm,[[0,-.4],[-.36,.05],[0,1.28],[.36,.05]],.16,silver,.27,1.4,.42)
    plate(arm,[[0,-.2],[-.21,.08],[0,.89],[.21,.08]],.1,blue,.27,1.4,.59)
  } else if (id === 'scout') {
    for (const side of [-1,1]) {
      oval(head,side * .62,.12,-.03,.24,.26,.18,skin)
      oval(head,side * .22,.07,.48,.095,.06,.06,dark)
      oval(head,side * .22,-.16,.46,.32,.26,.26,0xe2e2c1)
    }
    plate(head,[[-.18,.08],[.18,.08],[0,-.14]],.08,dark,0,-.02,.71)
    oval(head,0,.46,-.09,.69,.34,.54,0x70491f)
    plate(head,[[-.35,.32],[.12,.42],[.36,-.12],[.1,-.24]],.2,gold,0,.39,.31)
    oval(torso,0,2.6,.04,.62,.16,.56,0xcd4e2e)
    plate(torso,[[0,.4],[.29,.22],[-.44,-.65],[-.76,-.73]],.08,0x804f31,0,2.1,.52)
    const shield = arms[0]
    oval(shield,-.15,-.64,.55,.75,.81,.17,gold)
    oval(shield,-.15,-.64,.68,.62,.68,.13,0xa37c44)
    oval(shield,-.15,-.64,.8,.18,.18,.11,silver)
    const hand = arms[1]
    rod(hand,[.25,-.94,.49],[.26,-.3,.49],.1,timberBrown)
    block(hand,.26,-.3,.49,.64,.1,.15,dark)
    plate(hand,[[-.14,0],[.16,0],[.28,.55],[.22,1.23],[-.1,1.78],[.03,1.12],[0,.58]],.12,silver,.26,-.29,.43)
    for (let i = 0; i < 3; i++) oval(hand,.16,-.45 - i * .11,.19 + i * .08,.22,.1,.21,0xf2d3a1)
  } else {
    oval(head,0,.09,0,.78,.72,.65,violet)
    plate(head,[[-.66,.16],[.6,.28],[.36,-.12],[-.46,-.23]],.16,0x171832,0,.01,.48)
    plate(head,[[-.55,.13],[.37,.23],[.2,.095],[-.49,.015]],.06,0xa6c4ff,0,.01,.65)
    for (const sign of [-1,1]) {
      oval(head,sign * .68,.04,-.01,.2,.31,.31,dark)
      oval(arms[sign === -1 ? 0 : 1],0,-.05,0,.4,.37,.43,violet)
    }
    plate(torso,[[-.68,.4],[.65,.4],[.45,-.52],[0,-.65],[-.52,-.46]],.12,0x41377b,0,2.02,.44)
    const hand = arms[0]
    const bow = [[-.22,-2,.45],[-.69,-1.49,.63],[-.83,-.71,.71],[-.65,.08,.62],[-.22,.68,.45]]
    for (let i = 1; i < bow.length; i++) rod(hand,bow[i-1],bow[i],.075,cyan)
    rod(hand,bow[0],[-.02,-.69,.45],.023,0xd6fcff)
    rod(hand,[-.02,-.69,.45],bow[4],.023,0xd6fcff)
    rod(hand,[-.02,-.69,.45],[-1.47,-.57,.61],.045,cyan)
    plate(hand,[[0,0],[.34,.15],[.27,-.13]],.08,cyan,-1.55,-.57,.58)
  }
  root.scale.setScalar(1.32)
  return { root, animate(stride: number, time: number, reduced: boolean) {
    legs.forEach((leg, i) => { leg.rotation.x = stride * (i ? -.52 : .52) })
    arms.forEach((arm, i) => { arm.rotation.x = stride * (i ? .23 : -.23) })
    torso.position.y = Math.abs(stride) * .12 + (reduced ? 0 : Math.sin(time * 2) * .024)
  } }
}
const timberBrown = 0x68482c
