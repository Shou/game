import * as Pixi from "pixi.js"
import { Viewport } from "pixi-viewport"
import * as Matter from "matter-js"
import * as Ecsy from "ecsy"

//import * as Color from "./Color"
import * as Chunks from "./Chunks"
import * as Shader from "./Shader"
import {
  Coord,
  X, Y,
} from "./Math"
import * as Map from "./MapLoader"

import testMap from "./map-test"

import * as Snow from "./shaders/snow"
import * as Ice from "./shaders/ice"

import topGroundPng from "../assets/TopGround.png"
import groundPng from "../assets/Ground.png"


const {
  PI,
  atan2, sqrt, sin, cos,
  min, max,
  round, floor, ceil,
  sign,
  pow,
  abs,
} = Math

type clamp = (a: number, n: number, b: number) => number
const clamp: clamp = (a, n, b) => max(a, min(n, b))

interface Pixi {
  app: any
  viewport: any
}

interface App {
  pixi: Pixi
  world: Matter.World
  chunks: Chunks.Chunks<any>
}

// smoke unsafe code every day 420
type Shape = any
type Graphics = any

type LightUniform = [
  number, number, number,
  number, number, number,
  number, number, number,
]
type BlockUniform = [
  number, number,
  number, number,
]

type Uniform = LightUniform | BlockUniform

interface Elem {
  // idk if we need this anymore, was previously used for physics
  shape: Shape
  // The physics object. Use this for sik fysix
  body: Matter.Body
  // The graphics object. Rules:
  //  1. don't use it for position
  //  2. only use it for visuals
  graphics: Graphics
  // Shader uniform
  readonly uniform?: Uniform
  loaded: boolean
}

interface StaticElem extends Elem {
  type: "Static"
  uniform: BlockUniform
}

interface Light extends Elem {
  type: "Light"
  uniform: LightUniform
}

interface Entity extends Required<Elem> {
  type: "Entity"
  airborne: boolean
  control: "NPC" | "Controlled"
  bag?: Record<string, any>
}


let us: Record<string, Record<string, any>>
  = {}


type mkElem = (app: App, shape: Shape, color: number | string) => Elem
const mkElem: mkElem = (app, shape, color) => {
  let graphics: any = null
  if (typeof color === "number") {
    graphics = new Pixi.Graphics()
    graphics.beginFill(color, 1)
    graphics.drawShape({ ...shape, x: 0, y: 0 })
    graphics.endFill()
  } else {
    graphics = Pixi.Sprite.from(color)
    graphics.width = 64
    graphics.height = 64
  }
  graphics.x = shape.x
  graphics.y = shape.y

  let body
  if ("width" in shape && "height" in shape) {
    body = Matter.Bodies.rectangle(
      // there's definitely something wrong here, probably to do with the player???
      shape.x,
      shape.y,
      shape.width,
      shape.height,
      {
        //inertia: Infinity,
      }
    )
  } else {
    // wtf
    body = Matter.Bodies.circle(
      shape.x,
      shape.y,
      shape.radius,
      {
        //inertia: Infinity,
      }
    )
  }
  Matter.Body.setStatic(body, true)

  return {
    shape,
    body,
    graphics,
    loaded: false,
  }
}

type mkEntity = (app: App, shape: Shape, color: number) => Entity
const mkEntity: mkEntity = (app, shape, color) => {
  const uniform = getRectVertices(
    shape,
    app.pixi.app.view.width,
    app.pixi.app.view.height,
  )

  const elem = mkElem(app, shape, color)
  Matter.Body.setStatic(elem.body, false)
  elem.body.friction = 0.01
  elem.body.frictionAir = 0.01

  return {
    type: "Entity",
    ...elem,
    uniform,
    airborne: false,
    control: "NPC",
  }
}

type mkLight = (app: App, shape: Shape, color: number) => Light
const mkLight: mkLight = (app, shape, color) => {
  const elem = mkElem(app, shape, color)

  const uniform: LightUniform = [
    // Position
    elem.shape.x / app.pixi.app.view.width,
    elem.shape.y / app.pixi.app.view.height,
    0,
    // Shape
    shape.radius / app.pixi.app.view.width,
    shape.radius / app.pixi.app.view.height,
    // Lighth / distance traveled
    0.1,
    // Color
    (color >> 16) / 255,
    (color >> 8 & 0xFF) / 255,
    (color & 0xFF) / 255,
    // Maybe we can use this to define the shape... rectangle = 1, oval = 0?
  ]

  return {
    type: "Light",
    ...elem,
    uniform,
  }
}

const loadedElems: Chunks.Chunks<Elem> = {}

type loadElem = <T extends Elem>(app: App, elem: T) => void
const loadElem: loadElem = (app, elem) => {
  app.pixi.viewport.addChild(elem.graphics)
  Matter.World.add(app.world, elem.body)
  elem.loaded = true
  Chunks.insert(
    loadedElems,
    elem.body.position as Chunks.Coord,
    [elem],
  )
}

type unloadElem = <T extends Elem>(app: App, elem: T) => void
const unloadElem: unloadElem = (app, elem) => {
  app.pixi.viewport.removeChild(elem.graphics)
  Matter.World.remove(app.world, elem.body)
  elem.loaded = false
  Chunks.remove(
    loadedElems,
    elem.body.position as Chunks.Coord,
  )
}

type getRectVertices = (rect: any, w: number, h: number) => BlockUniform
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
  if (Object.keys(activeKeys).length) {
    console.log(activeKeys, "activeKeys")
  }

  // TODO there has to be a way to set X velocity without affecting Y.
  //      Right now setting Y slows falling down.
  if ("d" in activeKeys) {
    Matter.Body.setVelocity(
      entity.body,
      {
        x: Math.min(5, (entity.body.velocity.x + 5) / 2),
        y: entity.body.velocity.y,
      }
    )
  }
  if ("a" in activeKeys) {
    Matter.Body.setVelocity(
      entity.body,
      {
        x: Math.max(-5, (entity.body.velocity.x - 5) / 2),
        y: entity.body.velocity.y,
      }
    )
  }
  if (" " in activeKeys && !entity.airborne) {
    Matter.Body.applyForce(
      entity.body,
      entity.body.position,
      { x: 0, y: -0.33 }
    )
  }
}

type move = (entity: Elem, x: number, y: number) => void
const move: move = (entity, x, y) => {
  entity.graphics.x = x
  entity.graphics.y = y
  entity.shape.x = x
  entity.shape.y = y
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

type tileToElem = (app: App, tile: Map.Tile) => StaticElem | Light | Entity
const tileToElem: tileToElem = (app, tile) => {
  const x = tile.x * 64
  const y = tile.y * 64

  const color = Map.tileToColor(tile.type)

  switch (tile.type) {
    case Map.TileType.StrongLight: {
      const shape: Shape = new Pixi.Circle(x, y, 32)
      return mkLight(app, shape, color)
    }

    case Map.TileType.WeakLight: {
      const shape: Shape = new Pixi.Rectangle(x, y, 64, 2 * 64)
      return mkLight(app, shape, color)
    }

    case Map.TileType.Player: {
      const shape: Shape = new Pixi.Rectangle(x, y, 64, 2 * 64)
      const player = mkEntity(app, shape, color)
      player.control = "Controlled"
      return player
    }

    case Map.TileType.Monster: {
      const shape: Shape = new Pixi.Rectangle(x, y, 64, 64)
      const monster = mkEntity(app, shape, color)
      return monster
    }

    case Map.TileType.TopGround: {
      const shape = new Pixi.Rectangle(x, y, 64, 64)
      const elem = mkElem(app, shape, color)
      Chunks.append(
        app.chunks,
        Chunks.toCoord(elem.body.position as Coord),
        [elem],
      )
      return {
        type: "Static",
        ...elem,
        uniform: getRectVertices(elem.shape, app.pixi.app.view.width, app.pixi.app.view.height),
      }
    }

    case Map.TileType.Ground: {
      const shape = new Pixi.Rectangle(x, y, 64, 64)
      const elem = mkElem(app, shape, color)
      elem.graphics.cacheAsBitmap = false

      us.ice = {
        uTime: 0
      }
      elem.graphics.filters = [
        new Pixi.Filter(Ice.vertex, Ice.fragment, us.ice)
      ]

      Chunks.append(
        app.chunks,
        Chunks.toCoord(elem.body.position as Coord),
        [elem],
      )
      return {
        type: "Static",
        ...elem,
        uniform: getRectVertices(elem.shape, app.pixi.app.view.width, app.pixi.app.view.height),
      }
    }

    default: {
      const shape = new Pixi.Rectangle(x, y, 64, 64)
      const elem = mkElem(app, shape, color)
      Chunks.append(
        app.chunks,
        Chunks.toCoord(elem.body.position as Coord),
        [elem],
      )
      return {
        type: "Static",
        ...elem,
        uniform: getRectVertices(elem.shape, app.pixi.app.view.width, app.pixi.app.view.height),
      }
    }
  }
}

const calculateGameSize = (canvas: HTMLCanvasElement, size: number) => {
  console.log(canvas, "canvas")
  const cwRatio = canvas.clientWidth / canvas.clientHeight
  const wRatio = clamp(4/3, cwRatio, 16/9)

  const w = (Math.floor(size * wRatio / 64) * 64) - size

  return {
    width: size + w * 0.5,
    height: size - w * 0.5,
  }
}

type main = (view: HTMLCanvasElement, pausedState: any) => void
export const main: main = (view, pausedState) => {
  const {
    width,
    height,
  } = calculateGameSize(view, 1024)

  view.addEventListener("resize", event => {
    calculateGameSize(view, 1024)
  })

  // FIXME get rid of flickering, attempt below failed at doing so :(
  Pixi.settings.ROUND_PIXELS = true

  const pixiApp = new Pixi.Application({
    width,
    height,
    antialias: true,
    transparent: false,
    resolution: 1,
    view,
  }) as any

  const viewport = new Viewport({
    worldWidth: pixiApp.width,
    worldHeight: pixiApp.height,
  })

  pixiApp.stage.addChild(viewport)

  const engine = Matter.Engine.create({
    positionIterations: 1,
    velocityIterations: 1,
    constraintIterations: 1,
    enableSleeping: false,
  })

  const app: App = {
    pixi: {
      app: pixiApp,
      viewport,
    },
    world: engine.world,
    chunks: {},
  }

  keybindings()

  // We should pass along color with the rects... mat3?
  // [ left, top, right,
  //   bottom, 0, alpha,
  //   r, g, b ]
  // We can use middle as glossiness... maybe
  const uniforms = {
      rects: [] as Array<number>,
      entities: [] as Array<number>,
      lights: [] as Array<number>,
  }

  const worldMap = Map.parseText(testMap)
  if (worldMap instanceof Error) throw worldMap

  const entities: Array<Entity> = []
  const npcs: Array<Entity> = []

  // Background
  const bgShape = new Pixi.Rectangle(0, 0, pixiApp.view.width, pixiApp.view.height)
  const bgGraphics: any = new Pixi.Graphics()
  bgGraphics.x = bgShape.x
  bgGraphics.y = bgShape.y
  bgGraphics.beginFill(0x081A2A, 1)
  bgGraphics.drawShape({ ...bgShape, x: 0, y: 0 })
  bgGraphics.endFill()
  us.background = {
    uTime: 0,
    uWorldX: 0,
  }
  bgGraphics.filters = [
    new Pixi.Filter(Snow.vertex, Snow.fragment, us.background) as any
  ]
  viewport.addChild(bgGraphics)

  let players: Array<Entity> = []

  const elems = worldMap.map(tile => tileToElem(app, tile))
  elems.forEach(elem => {
    switch (elem.type) {
      case "Light": {
        elem.uniform.forEach(
          u => uniforms.lights[uniforms.lights.length] = u
        )
        break
      }

      case "Entity": {
        if (elem.control === "Controlled") {
          entities.push(elem)
          players.push(elem)
        } else {
          entities.push(elem)
          npcs.push(elem)
        }
        break
      }

      default: {
        elem.uniform.forEach(
          u => uniforms.rects[uniforms.rects.length] = u
        )
        break
      }
    }
  })

  const player = players[0]

  if (!player) {
    throw new Error("No Player placed on the map, please put a 'P' somewhere.")
  }

  if (uniforms.lights.length === 0) {
    for (let i = 0; i < 9; i++) uniforms.lights[i] = 0
  }

  const vertexLight = Shader.vertexLight()
  const fragmentLight = Shader.fragmentLight(
    round(uniforms.rects.length * 0.25),
    round(uniforms.lights.length / 3 / 3),
  )
  //const shader = new Pixi.Filter(vertexLight, fragmentLight, uniforms) as any
  //pixiApp.stage.filters = [shader]

  pixiApp.ticker.autoStart = false

  let time = 0
  const physicsTick = 5

  let evil = { x: [0], y: [0] }

  // NOTE We can use app.ticker.start/stop() for pausing
  pixiApp.ticker.add(() => {
    time = performance.now()
    for (const key in us) {
      us[key].uTime = time
    }

    for (let i = 0; i < Math.ceil(pixiApp.ticker.elapsedMS / physicsTick); i++) {
      Matter.Engine.update(engine, physicsTick)
    }

    const screenElems = Chunks.getElemsInRect(
      app.chunks,
      viewport.left - 256,
      viewport.top - 256,
      viewport.screenWorldWidth + 256,
      viewport.screenWorldHeight + 256,
    )
    for (const elem of screenElems) {
      if (!elem.loaded) {
        loadElem(app, elem)
      }
    }
    // TODO why is this commented
    //for (const key in loadedElems) {
    //  const elem = loadedElems[key][0]
    //  if (!screenElems.includes(elem)) {
    //    unloadElem(app, elem)
    //  }
    //}

    accelerate(player)

    for (const npc of npcs) {
      if (npc.body.velocity.x === 0) {
        const x = (Math.round(Math.random()) * 2 - 1)
        Matter.Body.applyForce(
          npc.body,
          npc.body.position,
          { x, y: 0 },
        )
      }
    }

    for (const entity of entities) {
      Matter.Body.setAngle(entity.body, 0)
      if (!entity.loaded) {
        loadElem(app, entity)
      }

      const nearBodies = elems.flatMap(({ body }) => {
        const x = body.position.x - entity.body.position.x
        const y = body.position.y - entity.body.position.y

        const distance = sqrt(
          pow(x, 2) + pow(y, 2)
        )
        if (distance < 64) {
          return [entity.body]
        }
        return []
      })
      const collisions = Matter.Query.collides(
        entity.body,
        nearBodies,
      )
      // TODO only airborne when not touching ground
      if (collisions.length > 0) {
        //console.log(collisions)
        entity.airborne = false
      } else {
        entity.airborne = true
      }

      const vsEntity = getRectVertices(entity.shape, pixiApp.view.width, pixiApp.view.height)
      for (let i = 0; i < 4; i++) {
        uniforms.entities[i] = vsEntity[i]
      }

      movement(entity)
    }

    // TODO move evil state somewhere... less static. model state somehow
    const mx = evil.x.reduce((acc, a) => a + acc, 0) / evil.x.length
    const my = evil.y.reduce((acc, a) => a + acc, 0) / evil.y.length
    // NOTE flooring is necessary to get rid of flickering black lines
    // See: https://github.com/pixijs/pixi.js/issues/4811#issuecomment-377112864
    viewport.moveCenter(
      floor(
        player.body.position.x + min(5, abs(mx) * 0.5) * 50 * sign(mx)
      ),
      floor(
        player.body.position.y + max(0, max(-10, my) * 0.5 * 50)
      ),
    )
    evil.x = evil.x.slice(-19).concat(player.body.velocity.x)
    evil.y = evil.y.slice(-19).concat(player.body.velocity.y)
    bgGraphics.x = viewport.left
    bgGraphics.y = viewport.top
    us.background.uWorldX = viewport.left / 1000
    console.log(us.background.uWorldX, "uWorldX")
  })

  // TODO polling is bad and we should use listeners
  setInterval(() => {
    const { paused } = pausedState.get()
    if (!paused && !pixiApp.ticker.started) {
      pixiApp.ticker.start()
    } else if(paused && pixiApp.ticker.started) {
      pixiApp.ticker.stop()
    }
  }, 100)
}
