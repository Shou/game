import * as Pixi from "pixi.js"
import * as Matter from "matter-js"
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
  body: Matter.Body
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

  let body
  if ("width" in shape && "height" in shape) {
    body = Matter.Bodies.rectangle(
      // there's definitely something wrong here, probably to do with the player???
      shape.x + shape.width * 0.5 - 32,
      shape.y + shape.height * 0.5 - 32,
      shape.width,
      shape.height,
    )
  } else {
    body = Matter.Bodies.circle(shape.x, shape.y, shape.radius)
  }
  Matter.Body.setStatic(body, true)
  Matter.World.add(app.world, body)

  return {
    shape,
    body,
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

  const elem = mkElem(app, shape, color)
  Matter.Body.setStatic(elem.body, false)
  elem.body.friction = 1.0

  return {
    ...elem,
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

  // Position
  uniform[index + 0] = elem.shape.x / app.view.width
  uniform[index + 1] = elem.shape.y / app.view.height
  uniform[index + 2] = 0
  // Shape
  uniform[index + 3] = shape.radius / app.view.width
  uniform[index + 4] = shape.radius / app.view.height
  // Light strength / distance traveled
  uniform[index + 5] = 0.1
  // Color
  uniform[index + 6] = (color >> 16) / 255
  uniform[index + 7] = (color >> 8 & 0xFF) / 255
  uniform[index + 8] = (color & 0xFF) / 255
  // Maybe we can use this to define the shape... rectangle = 1, oval = 0?

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

  if (Object.keys(activeKeys).length) {
    console.log(activeKeys, "activeKeys")
    console.log(entity.body, "entity body")
  }

  if ("d" in activeKeys) {
    Matter.Body.setVelocity(entity.body, { x: 1, y: entity.body.velocity.y })
  }
  if ("a" in activeKeys) {
    Matter.Body.setVelocity(entity.body, { x: -1, y: entity.body.velocity.y })
  }
  if (" " in activeKeys && !entity.airborne) {
    Matter.Body.setVelocity(entity.body, { x: entity.body.velocity.x, y: -2 })
  }
}

type move = (entity: Elem, x: number, y: number) => void
const move: move = (entity, x, y) => {
  entity.graphics.x = clamp(0, x, 64 * 16)
  entity.graphics.y = max(0, y % (64 * 12))
  entity.shape.x = entity.graphics.x
  entity.shape.y = entity.graphics.y
}

type movement = (entity: Elem) => void
const movement: movement = (entity) => {
  move(
    entity,
    entity.body.position.x,
    entity.body.position.y,
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
  const engine = Matter.Engine.create()
  app.world = engine.world

  const debugBlock = mkElem(app, new Pixi.Rectangle(0, 0, 100, 100), 0xFF0000)
  debugBlock.graphics.alpha = 0.5
  debug = f => f(debugBlock.graphics)

  const structures: Array<Elem> = []
  const entities: Array<Entity> = []

  // Background
  const bgShape = new Pixi.Rectangle(0, 0, app.view.width, app.view.height)
  const bgGraphics: any = new Pixi.Graphics()
  bgGraphics.x = bgShape.x
  bgGraphics.y = bgShape.y
  bgGraphics.beginFill(0x8C8888, 1)
  bgGraphics.drawShape({ ...bgShape, x: 0, y: 0 })
  bgGraphics.endFill()
  app.stage.addChild(bgGraphics)

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
    = new Pixi.Rectangle(app.view.width * 0.4, app.view.height * 0.4, 64, 64)
  const player = mkEntity(app, playerShape, 0xD035B0, uniforms.rects)
  entities.push(player)

  const vertexLight = Shader.vertexLight()
  const fragmentLight = Shader.fragmentLight(
    round(uniforms.rects.length * 0.25),
    round(uniforms.lights.length / 3 / 3),
  )
  console.log(fragmentLight, "fragmentLight")
  const shader = new Pixi.Filter(vertexLight, fragmentLight, uniforms) as any
  app.stage.filters = [shader]

  app.ticker.autoStart = false

  let time = 0

  // NOTE We can use app.ticker.start/stop() for pausing
  app.ticker.add(() => {
    time = performance.now()

    for (let i = 0; i < Math.ceil(app.ticker.elapsedMS / 5); i++) {
      Matter.Engine.update(engine, 5)
      console.log(i, "time step")
    }

    for (const entity of entities) {
      Matter.Body.setAngle(entity.body, 0)
      accelerate(entity)
      movement(entity)
      Matter.Body.setPosition(
        entity.body,
        {
          x: clamp(0, entity.body.position.x, 64 * 15),
          y: max(0, entity.body.position.y % (64 * 12)),
        }
      )

      const vsPlayer = getRectVertices(playerShape, app.view.width, app.view.height)
      for (let i = 0; i < 4; i++) {
        uniforms.rects[player.uniform.index + i] = vsPlayer[i]
      }

      const newLampX = 12 * 64 + cos(time * 0.001) * 128
      const newLampY = 256 + sin(time * 0.001) * 128
      Matter.Body.setVelocity(
        lamp.body,
        {
          x: newLampX - lamp.body.position.x,
          y: newLampY - lamp.body.position.y,
        }
      )
      Matter.Body.setPosition(
        lamp.body,
        {
          x: newLampX,
          y: newLampY,
        },
      )
      movement(lamp)
      setUniform(uniforms, "lights", 9, [
        lamp.shape.x / app.view.width,
        lamp.shape.y / app.view.height,
      ])

      const newFloorLightX = app.view.width * 0.5 + cos(time * 0.001) * 8 * 64
      Matter.Body.setVelocity(
        floorLight.body,
        {
          x: newFloorLightX - floorLight.body.position.x,
          y: 0,
        }
      )
      Matter.Body.setPosition(
        floorLight.body,
        {
          x: newFloorLightX,
          y: floorLight.shape.y,
        },
      )
      movement(floorLight)
      setUniform(uniforms, "lights", 18, [
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
