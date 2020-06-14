import * as Pixi from "pixi.js"
//import * as Color from "./Color"
import {
  Coord,
  X, Y,
} from "./Math"

const {
  PI,
  atan2, sqrt, sin, cos,
  min, max,
  round, floor, ceil,
} = Math

type clamp = (a: number, n: number, b: number) => number
const clamp: clamp = (a, n, b) => max(a, min(n, b))

// smoke unsafe code every day 420
type Shape = any
type Graphics = any

interface Elem {
  shape: Shape
  graphics: Graphics
}

interface Entity extends Elem {
  velocity: Coord
  airborne: boolean
}


type mkElem = (shape: Shape, color: number) => Elem
const mkElem: mkElem = (shape, color) => {
  const graphics: any = new Pixi.Graphics()
  graphics.x = shape.x
  graphics.y = shape.y
  graphics.beginFill(color, 1)
  if ("radius" in shape) {
    graphics.drawCircle(0, 0, shape.radius)
  } else {
    graphics.drawRect(0, 0, shape.width, shape.height)
  }
  graphics.endFill()

  return {
    shape,
    graphics,
  }
}

type mkEntity = (shape: Shape, color: number) => Entity
const mkEntity: mkEntity = (shape, color) => {
  return {
    ...mkElem(shape, color),
    velocity: { x: 0, y: 0 } as Coord,
    airborne: false,
  }
}

type accelerate = (entity: Entity) => void
const accelerate: accelerate = (entity) => {
  const gravity = 8
  const walk = 12
  const jump = 64

  if (entity.airborne) {
    entity.velocity.y = min(gravity, entity.velocity.y + gravity) as Y
  }

  if (Object.keys(activeKeys).length)
    console.log(activeKeys, "activeKeys")

  if ("d" in activeKeys) {
    entity.velocity.x = min(walk, entity.velocity.x + walk) as X
  } else if ("a" in activeKeys) {
    entity.velocity.x = max(-walk, entity.velocity.x - walk) as X
  } else if (" " in activeKeys && !entity.airborne) {
    entity.velocity.y = -jump as Y
  } else {
    entity.velocity.x = 0 as X
  }
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

  const aFrom = atan2(v.y, v.x)
  const aTo = atan2(v.y * -1, v.x * -1)

  for (const { shape } of collidables) {
    const isContained
      = shape.contains(s.left + v.x, s.bottom + v.y)
      || shape.contains(s.right + v.x, s.bottom + v.y)
      || shape.contains(s.left + v.x, s.top + v.y)
      || shape.contains(s.right + v.x, s.top + v.y)

    if (isContained) {
      const ecrx = clamp(-cx * rx, cos(aFrom) * rx, cx * rx) + mx
      const ecry = clamp(-cy * ry, sin(aFrom) * ry, cy * ry) + my

      const crx = shape.width * 0.5
      const cry = shape.height * 0.5

      const cmx = shape.left + crx * 0.5
      const cmy = shape.top + cry * 0.5

      const ccrx = clamp(-cx * crx, cos(aTo) * crx, cx * crx) + cmx
      const ccry = clamp(-cy * cry, sin(aTo) * cry, cy * cry) + cmy

      const [ diffX, diffY ] = [ ccrx - ecrx, ccry - ecry ]

      debug(block => {
        block.x = s.left + v.x
        block.y = s.top + v.y
        block.width = s.width
        block.height = s.height
      })

      entity.velocity.y = min(0, v.y) as Y
      move(entity, s.x + diffX, s.y + diffY)
      entity.airborne = false
    } else {
      entity.airborne = true
    }
  }
}

type move = (entity: Entity, x: number, y: number) => void
const move: move = (entity, x, y) => {
  entity.graphics.x = clamp(0, x, 64 * 16)
  entity.graphics.y = max(0, y % (64 * 12))
  entity.shape.x = entity.graphics.x
  entity.shape.y = entity.graphics.y
}

type movement = (entity: Entity) => void
const movement: movement = (entity) => {
  move(
    entity,
    entity.graphics.x + entity.velocity.x,
    entity.graphics.y + entity.velocity.y,
  )
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

const bg = () => {
  // TODO
}

let debug: (f: (block: any) => void) => void
  = null as any

type main = (view: HTMLCanvasElement, pausedState: any) => void
export const main: main = (view, pausedState) => {
  const app = new Pixi.Application({
    width: 64 * 16,
    height: 64 * 12,
    antialias: false,
    transparent: false,
    resolution: 1,
    view,
  }) as any

  keybindings()

  const debugBlock = mkElem(new Pixi.Rectangle(0, 0, 100, 100), 0xFF0000)
  debugBlock.graphics.alpha = 0.5
  debug = f => f(debugBlock.graphics)
  app.stage.addChild(debugBlock.graphics)

  const structures: Array<Elem> = []
  const entities: Array<Entity> = []

  const floorShape = new Pixi.Rectangle(0, app.view.height - 64, app.view.width, 64)
  const floorBlock: Elem = mkElem(floorShape, 0x33AA44)
  structures.push(floorBlock)
  app.stage.addChild(floorBlock.graphics)

  const platformShape = new Pixi.Rectangle(64 * 2, 64 * 8, 64 * 7, 64)
  const platformBlock: Elem = mkElem(platformShape, 0xAFAAAA)
  structures.push(platformBlock)
  app.stage.addChild(platformBlock.graphics)

  const balloonShape: Shape = new Pixi.Circle(64 * 11, 64 * 7, 64)
  const balloonElem: Elem = mkElem(balloonShape, 0xAA1111)
  structures.push(balloonElem)
  app.stage.addChild(balloonElem.graphics)

  const playerShape
    = new Pixi.Rectangle(app.view.width * 0.5, app.view.height * 0.5, 64, 64)
  const player = mkEntity(playerShape, 0xEFE8E8)
  entities.push(player)
  app.stage.addChild(player.graphics)

  // NOTE We can use app.ticker.start/stop() for pausing
  app.ticker.add((lagDelta: number) => {
    for (const entity of entities) {
      accelerate(entity)
      collide(entity, structures)
      movement(entity)
    }
  })
  app.ticker.autoStart = !pausedState.get().paused
}
