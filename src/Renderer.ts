import * as Pixi from "pixi.js"
//import * as Color from "./Color"
import * as Shader from "./Shader"
import {
  Coord,
  X, Y,
} from "./Math"

const {
  PI,
  atan2, sqrt, sin, cos,
  min, max,
  round, floor, ceil,
  sign,
} = Math

type clamp = (a: number, n: number, b: number) => number
const clamp: clamp = (a, n, b) => max(a, min(n, b))

// smoke unsafe code every day 420
type Shape = any
type Graphics = any

interface Uniform {
  readonly index: number
  readonly reference: Array<any>
}

interface Elem {
  shape: Shape
  graphics: Graphics
  color: number
  readonly uniform?: Uniform
}

interface Entity extends Required<Elem> {
  velocity: Coord
  airborne: boolean
}


type mkElem = (app: any, shape: Shape, color: number) => Elem
const mkElem: mkElem = (app, shape, color) => {
  const graphics: any = new Pixi.Graphics()
  graphics.x = shape.x
  graphics.y = shape.y
  graphics.beginFill(color, 1)
  graphics.drawShape({ ...shape, x: 0, y: 0 })
  graphics.endFill()

  app.stage.addChild(graphics)

  return {
    shape,
    graphics,
    color,
  }
}

type Uniforms = { [key: string]: Array<number> }

type setUniform = <R extends Uniforms>(
  uniforms: R,
  key: keyof R,
  index: number,
  values: Array<any>,
) => void
const setUniform: setUniform = (uniforms, key, index, values) => {
  for (let i = 0; i < values.length; i++) {
    uniforms[key][index + i] = values[i]
  }
}

type mkEntity = (app: any, shape: Shape, color: number, uniform: Array<number>) => Entity
const mkEntity: mkEntity = (app, shape, color, uniform) => {
  const index = uniform.length
  const points = getRectVertices(shape, app.view.width, app.view.height)

  for (let i = 0; i < points.length; i++) {
    uniform[index + i] = points[i]
  }

  return {
    ...mkElem(app, shape, color),
    uniform: {
      index,
      reference: uniform,
    },
    velocity: { x: 0, y: 0 } as Coord,
    airborne: false,
  }
}

type mkLight = (app: any, shape: Shape, color: number, uniform: Array<number>) => Elem
const mkLight: mkLight = (app, shape, color, uniform) => {
  const index = uniform.length
  const elem = mkElem(app, shape, color)

  uniform[index] = elem.shape.x / app.view.width
  uniform[index + 1] = elem.shape.y / app.view.height
  uniform[index + 2] = shape.radius

  return {
    ...elem,
    uniform: {
      index,
      reference: uniform,
    }
  }
}

type getRectVertices = (rect: any, w: number, h: number) => [number, number, number, number]
const getRectVertices: getRectVertices = (rect, w, h) => {
  return [
    rect.left / w,
    rect.top / h,
    rect.right / w,
    rect.bottom / h,
  ]
}

type accelerate = (entity: Entity) => void
const accelerate: accelerate = (entity) => {
  const {
    velocity: v
  } = entity
  const gravity = 8
  const walk = 12
  const jump = 64

  if (entity.airborne) {
    entity.velocity.y = min(gravity, entity.velocity.y + gravity) as Y
  }

  if (Object.keys(activeKeys).length)
    console.log(activeKeys, "activeKeys")

  if ("d" in activeKeys) {
    entity.velocity.x = v.x > walk ? v.x : walk as X
  }
  if ("a" in activeKeys) {
    entity.velocity.x = v.x < -walk ? v.x : -walk as X
  }
  if (" " in activeKeys && !entity.airborne) {
    entity.velocity.y = v.y < -jump ? v.y : -jump as Y
  }
}

type closestVertexToAngle = (cs: Array<Coord>, a: number) => null | Coord
const closestVertexToAngle: closestVertexToAngle = (cs, a) => {
  let acc = null
  let smallest = PI

  for (const c of cs) {
    const d = Math.abs(Math.atan2(c.y, c.x) - a)
    if (d < smallest) {
      smallest = d
      acc = c
    }
  }

  return acc
}

type rectAngleVertex = (rect: any, angle: number) => null | Coord
const rectAngleVertex: rectAngleVertex = (rect, angle) => {
  return closestVertexToAngle([
    { x: rect.left, y: rect.top },
    { x: rect.right, y: rect.top },
    { x: rect.right, y: rect.bottom },
    { x: rect.left, y: rect.bottom },
  ] as Array<Coord>, angle)
}

type angleFromTo = (ax: number, ay: number, bx: number, by: number) => number
const angleFromTo: angleFromTo = (ax, ay, bx, by) => {
  return atan2(by - ay, bx - ax)
}

type gjkSupport = (shape: any, d: any) => any
const gjkSupport: gjkSupport = (shape, d) => {
}

//const gjk = (p, q, a) => null

type lineIntersect = <C extends Coord>(Axy0: C, Axy1: C, Bxy0: C, Bxy1: C) => null | Coord
const lineIntersect: lineIntersect = (Axy0, Axy1, Bxy0, Bxy1) => {
  const denom = (Axy0.x - Axy1.x) * (Bxy0.y - Bxy1.y) - (Axy0.y - Axy1.y)*(Bxy0.x - Bxy1.x)

  if (denom !== 0) {
    const detA = Axy0.x * Axy1.y - Axy0.y * Axy1.x
    const detB = Bxy0.x * Bxy1.y - Bxy0.y * Bxy1.x
    return {
      x: (detA * (Bxy0.x - Bxy1.x) - (Axy0.x - Axy1.x) * detB) / denom,
      y: (detA * (Bxy0.y - Bxy1.y) - (Axy0.y - Axy1.y) * detB) / denom,
    } as Coord
  }

  return null
}

type collide = <B extends Elem>(entity: Entity, collidables: Array<B>) => void
const collide: collide = (entity, collidables) => {
  const {
    shape: s,
    velocity: v,
  } = entity

  const [ cx, cy ] = [cos(PI * 0.25), sin(PI * 0.25)]
  const [ rx, ry ] = [s.width * 0.5, s.height * 0.5]
  const [ mx, my ] = [s.left + rx, s.top + ry]

  const [aivx, aivy] = [cos(v.x * -1), sin(v.y * -1)]

  const aFrom = atan2(v.y, v.x)
  const aTo = atan2(v.y * -1, v.x * -1)

  for (const { shape } of collidables) {
    const containment = [
      shape.contains(s.left + v.x, s.top + v.y),
      shape.contains(s.right + v.x, s.top + v.y),
      shape.contains(s.right + v.x, s.bottom + v.y),
      shape.contains(s.left + v.x, s.bottom + v.y),
    ]

    // XXX remove always false predicate
    if (containment.some(id => id)) {
      entity.velocity.y = min(0, v.y) as Y
      move(entity, s.x, shape.y - s.height)
      entity.airborne = false
      return

      const ecrx = clamp(-cx * rx, cos(aFrom) * rx, cx * rx) + mx
      const ecry = clamp(-cy * ry, sin(aFrom) * ry, cy * ry) + my

      const crx = shape.width * 0.5
      const cry = shape.height * 0.5

      const cmx = shape.left + crx * 0.5
      const cmy = shape.top + cry * 0.5

      const A0 = angleFromTo(mx, my, shape.x, shape.y)
      const At = angleFromTo(mx + v.x, my + v.y, shape.x, shape.y)
      const V0 = rectAngleVertex(s, A0)
      const Vt = closestVertexToAngle([
        { x: s.left + v.x, y: s.top + v.y },
        { x: s.right + v.x, y: s.top + v.y },
        { x: s.right + v.x, y: s.bottom + v.y },
        { x: s.left + v.x, y: s.bottom + v.y },
      ] as Array<Coord>, At)

      // FIXME FIXME FIXME
      // This is wrong because it's relative to the element's centre, when it
      // should be along the velocity vector instead and we should see where
      // the velocity vector line intersects with the element. We _should_ be
      // able to use the velocity vector angle to figure out which side we're
      // intersecting with and from that we know the x or y coordinate and can
      // derive the associated x/y coordinate using the angle.
      //
      // We also have to account for small entities and small collidables.
      // Right now the angle will miss a collidable that's smaller.
      const ccrx = clamp(-cx * crx, cos(aTo) * crx, cx * crx) + cmx
      const ccry = clamp(-cy * cry, sin(aTo) * cry, cy * cry) + cmy

      const [ diffX, diffY ] = [ ccrx - ecrx, ccry - ecry ]

      const slideX = v.x + diffX + v.y + diffX

      debug(block => {
        block.x = s.left + v.x
        block.y = s.top + v.y
        block.width = s.width
        block.height = s.height
      })

      // TODO we shouldn't use "move" here, we should change the velocity such
      // that we don't penetrate the element
      entity.velocity.y = min(0, v.y) as Y
      move(entity, s.x + slideX, s.y + diffY)
      entity.airborne = false
    } else {
      entity.airborne = true
    }
  }
}

type move = (entity: Elem, x: number, y: number) => void
const move: move = (entity, x, y) => {
  entity.graphics.x = clamp(0, x, 64 * 16)
  entity.graphics.y = max(0, y % (64 * 12))
  entity.shape.x = entity.graphics.x
  entity.shape.y = entity.graphics.y
}

type movement = (entity: Entity) => void
const movement: movement = (entity) => {
  const {
    velocity: v
  } = entity

  move(
    entity,
    entity.graphics.x + v.x,
    entity.graphics.y + v.y,
  )

  entity.velocity.x = round(v.x * 0.5 - 0.5 * sign(v.x)) as X
  entity.velocity.y = round(v.y * 0.5 - 0.5 * sign(v.x)) as Y
}

// yeah son, global state 😎
let activeKeys: Record<string, number> = {}
type keybindings = () => void
const keybindings: keybindings = () => {
  window.addEventListener("keydown", (event) => {
    console.log(event)
    activeKeys[event.key] = Date.now()
  })
  window.addEventListener("keyup", (event) => {
    delete activeKeys[event.key]
  })
  window.addEventListener("blur", (event) => {
    for (const key in activeKeys) {
      delete activeKeys[key]
    }
  })
}

let debug: (f: (block: any) => void) => void
  = null as any

type main = (view: HTMLCanvasElement, pausedState: any) => void
export const main: main = (view, pausedState) => {
  const app = new Pixi.Application({
    width: 64 * 16,
    height: 64 * 12,
    antialias: true,
    transparent: false,
    resolution: 1,
    view,
  }) as any

  keybindings()

  // We should pass along color with the rects... mat3?
  // [ left, top, right,
  //   bottom, 0, alpha,
  //   r, g, b ]
  // We can use middle as glossiness... maybe
  const uniforms = {
      rects: [] as Array<number>,
      lights: [] as Array<number>,
  }

  const debugBlock = mkElem(app, new Pixi.Rectangle(0, 0, 100, 100), 0xFF0000)
  debugBlock.graphics.alpha = 0.5
  debug = f => f(debugBlock.graphics)

  const structures: Array<Elem> = []
  const entities: Array<Entity> = []

  const bgShape = new Pixi.Rectangle(0, 0, app.view.width, app.view.height)
  const bgBlock: Elem = mkElem(app, bgShape, 0x8C8888)

  const floorShape = new Pixi.Rectangle(0, app.view.height - 64, app.view.width, 64)
  const floorElem: Elem = mkElem(app, floorShape, 0xAFAAAA)
  structures.push(floorElem)
  uniforms.rects = [
    ...uniforms.rects,
    ...getRectVertices(floorShape, app.view.width, app.view.height),
  ]

  const platformShape = new Pixi.Rectangle(64 * 2, 64 * 8, 64 * 7, 64)
  const platform: Elem = mkElem(app, platformShape, 0xAFAAAA)
  structures.push(platform)
  uniforms.rects = [
    ...uniforms.rects,
    ...getRectVertices(platformShape, app.view.width, app.view.height)
  ]

  const wallShape = new Pixi.Rectangle(64 * 8, 64 * 2, 64, 64 * 4)
  const wall: Elem = mkElem(app, wallShape, 0xAFAAAA)
  structures.push(wall)
  uniforms.rects = [
    ...uniforms.rects,
    ...getRectVertices(wallShape, app.view.width, app.view.height)
  ]

  const floatyboiShape = new Pixi.Rectangle(64 * 11, 64 * 7, 128, 128)
  const floatyboi: Elem = mkElem(app, floatyboiShape, 0xAFAAAA)
  structures.push(floatyboi)
  uniforms.rects = [
    ...uniforms.rects,
    ...getRectVertices(floatyboiShape, app.view.width, app.view.height)
  ]

  //const balloonShape: Shape = new Pixi.Circle(64 * 11, 64 * 7, 64)
  //const balloonElem: Elem = mkElem(balloonShape, 0xAA1111)
  //structures.push(balloonElem)
  //app.stage.addChild(balloonElem.graphics)

  const lightShape: Shape = new Pixi.Circle(app.view.width * 0.5, 8 * 64 - 32, 32)
  const light: Elem = mkLight(app, lightShape, 0xFFFFFF, uniforms.lights)
  structures.push(light)

  const lampShape: Shape
    = new Pixi.Circle(app.view.width - 48, app.view.height * 0.5, 32)
  const lamp: Elem = mkLight(app, lampShape, 0xFFFFFF, uniforms.lights)
  structures.push(lamp)

  const floorLightShape: Shape
    = new Pixi.Circle(128, app.view.height - 128, 32)
  const floorLight: Elem = mkLight(app, floorLightShape, 0xFFFFFF, uniforms.lights)
  structures.push(floorLight)

  const playerShape
    = new Pixi.Rectangle(app.view.width * 0.5, app.view.height * 0.5, 64, 64)
  const player = mkEntity(app, playerShape, 0xEFE8E8, uniforms.rects)
  entities.push(player)

  const vertexLight = Shader.vertexLight()
  const fragmentLight = Shader.fragmentLight(
    round(uniforms.rects.length * 0.25),
    round(uniforms.lights.length * 0.5),
  )
  console.log(fragmentLight, "fragmentLight")
  const shader = new Pixi.Filter(vertexLight, fragmentLight, uniforms) as any
  app.stage.filters = [shader]

  app.ticker.autoStart = false

  // NOTE We can use app.ticker.start/stop() for pausing
  app.ticker.add(() => {
    const time = performance.now()

    for (const entity of entities) {
      accelerate(entity)
      collide(entity, structures)
      movement(entity)

      const vsPlayer = getRectVertices(playerShape, app.view.width, app.view.height)
      for (let i = 0; i < 4; i++) {
        uniforms.rects[player.uniform.index + i] = vsPlayer[i]
      }

      move(lamp, 12 * 64 + cos(time * 0.001) * 128, 256 + sin(time * 0.001) * 128)
      setUniform(uniforms, "lights", 3, [
        lamp.shape.x / app.view.width,
        lamp.shape.y / app.view.height,
      ])

      move(floorLight, app.view.width * 0.5 + cos(time * 0.001) * 8 * 64, floorLight.shape.y)
      setUniform(uniforms, "lights", 6, [
        floorLight.shape.x / app.view.width,
        floorLight.shape.y / app.view.height,
      ])
    }
  })

  // TODO polling is bad and we should use listeners
  setInterval(() => {
    const { paused } = pausedState.get()
    if (!paused && !app.ticker.started) {
      app.ticker.start()
    } else if(paused && app.ticker.started) {
      app.ticker.stop()
    }
  }, 100)
}
