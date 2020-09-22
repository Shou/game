import * as Chunks from "./Chunks"
import * as Color from "./Color"
import * as Debug from "./Debug"
import * as Effects from "./Effects"
import {
  Coord,
  Integer,
  Milliseconds,
  Natural,
  Seconds,
  X,
  Y,
  abs,
  ceil,
  diff,
  dot,
  floor,
  fromCantor,
  PI,
  range,
  round,
  shuffle,
  sign,
  sqrt,
  sum,
  toCantor,
  toSeconds,
} from "./Math"
import * as Random from "./Random"
import { DAY_CYCLE } from "./Scenery"
import { ScopedState } from "./ScopedState"
import * as State from "./ScopedState"
import {
  CoreElem,
  GameArc,
  GameElement,
  GameElements,
  GameImage,
  GameLine,
  GameLinearGradient,
  GameRect,
  GameText,
} from "./Texture"
import {
  ActiveKeys,
  Entity,
  GameState,
  Keybindings,
  UserSettings,
  coerce,
  defaultSettings,
  mapCoerce,
  wrap,
} from "./Types"
import * as World from "./World"
import * as Renderer from "./Renderer"

import Prando from "prando"
import { minBy, sortBy } from "ramda"
import * as React from "react"

const Assets = {
  starsImage: document.createElement("img"),
  cloudImages: [],
  mountainImages: [],
}

// 314 smoke math
const {
  sin, cos, min, max, pow, random, atan2,
} = Math


// NOTES
// - Maybe we should use timestamps instead of booleans... everywhere??!?!?
//   - Then we can calculate things like e.g. last time feet touched ground,
//     last time we were airborne, etc


// NOTE apparently this is called spatial hashing and it's useful for infinite
//      worlds but dynamic quad-trees are better if your game size is fixed,
//      but we don't know what that sik algorithm is or does yet lol
type getScreenChunks = (state: GameState) => GameElements
export const getScreenChunks: getScreenChunks = (state) => {
  const {
    dimensions: { width, height },
    screen: { x, y },
    chunks,
  } = state

  let coords = { x: 0 as X, y: 0 as Y } as Chunks.Coord
  let blocks: GameElements = []
  for (let ix = floor(x * Chunks.CHUNK_RATIO); ix < ceil((x + width) * Chunks.CHUNK_RATIO + 1); ix++) {
    for (let iy = floor(y * Chunks.CHUNK_RATIO); iy < ceil((y + height) * Chunks.CHUNK_RATIO + 1); iy++) {
      coords.x = coerce(ix)
      coords.y = coerce(iy)
      const elems = chunks?.[toCantor(coords)]
      if (elems?.length > 0) {
        blocks = blocks.concat(elems)
      }
    }
  }

  return blocks
}

export type renderGameElement = (
  context: CanvasRenderingContext2D,
  gameElement: GameElement,
) => void
export const renderGameElement: renderGameElement = (context, gameElement) => {
  const { texture, coord } = gameElement

  if ("color" in texture && texture.color != null) {
    context.fillStyle = Color.toString(texture.color)
    context.strokeStyle = Color.toString(texture.color)
  }
  if ("filter" in texture && texture.filter != null) {
    context.filter = texture.filter
  }
  if ("position" in texture && texture.position === "top-left") {
    if ("radius" in texture) {
      coord.x = coord.x + texture.radius as X
      coord.y = coord.y + texture.radius as Y
    }
  } else {
    if ("width" in texture && "height" in texture) {
      coord.x = diff(coord.x, texture.width * 0.5 as X)
      coord.y = diff(coord.y, texture.height * 0.5 as Y)
    }
  }

  switch (texture.type) {
    case "GameImage": {
      const {
        image,
        width, height
      }: GameImage = texture
      const { x, y, } = coord
      context.drawImage(image, coord.x, y, width, height)
      break
    }

    case "GameText": {
      const {
        font,
        text,
        width, height,
      }: GameText = texture
      const { x, y, } = coord
      context.font = `${font.size}px ${font.family}`
      context.fillText(text, x, y, width)
      break
    }

    case "GameRect": {
      const { width, height, }: GameRect = texture
      const { x, y, } = coord
      context.fillRect(x, y, width, height)
      break
    }

    case "GameLinearGradient": {
      const {
        start,
        stop,
        colorStops,
        width, height,
      }: GameLinearGradient = texture
      const { x, y, } = coord
      const gradient = context.createLinearGradient(start.x, start.y, stop.x, stop.y)
      colorStops.forEach(({ offset, color }) => gradient.addColorStop(offset, color))
      context.fillStyle = gradient
      context.fillRect(x, y, width, height)
      break
    }

    case "GameLine": {
      const {
        width, height,
        lineWidth,
      } = texture
      const { x, y, } = coord
      context.lineWidth = lineWidth
      context.beginPath()
      context.moveTo(x, y)
      context.lineTo(x + width, y + height)
      context.stroke()
      break
    }

    case "GameArc": {
      const {
        radius,
        startAngle,
        endAngle,
        antiClockwise,
        fill,
        lineWidth,
      }: GameArc = texture
      const { x, y, } = coord
      context.lineWidth = lineWidth
      context.beginPath()
      context.arc( x, y, radius, startAngle, endAngle, antiClockwise)
      if (fill) {
        context.fill()
      } else {
        context.stroke()
      }
      break
    }

    default: {
      const totalityCheck: never = texture
      throw new Error()
    }
  }

  context.filter = "none"
}

export const brightness: (t: number) => number = t =>
  min(100, max(0.3, sin(t * PI * 1.8 - 1.4) * 2) * 100)

// g n = if n >= 0.2 && n < 0.35 || n > 0.7 && n < 0.85 then max 0 $ sin (n * pi * 2 * 8) * 255 else 0
// Returns a number between 0 - 1
export const redness: (t: number) => number = t =>
  t >= 0.2 && t < 0.35 || t > 0.7 && t < 0.85
    ? max(0, sin(t * PI * 2 * 8))
    : 0

export type renderSky = (state: GameState) => GameElements
export const renderSky: renderSky = (state) => {
  const {
    time: { now },
    dimensions,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE

  // wizard magic
  const red = redness(t) * 255
  // h n = max 0 $ sin (n * pi * 2 / 2 - 0.075) * 255 - 128
  const green = max(0, sin(t * PI * 2 * 0.5 - 0.075) * 255 - 128)
  // f n = min 255 $ max 0.1 (sin (n * pi * 1.8 - 1.4) * 2) * 255
  const blue = min(255, max(0.1, sin(t * PI * 1.8 - 1.4) * 2) * 255)

  const gradient: CoreElem<GameLinearGradient> = {
    texture: {
      type: "GameLinearGradient",
      colorStops: [
        { offset: 0, color: `rgb(0,${green},${blue})` },
        { offset: 1 - (red / 255 * 0.5), color: `rgb(0,${green},${blue})` },
        { offset: 1, color: `rgb(183, 29, 22)` },
      ],
      start: { x: 0, y: 0 } as Coord,
      stop: { x: 0, y: dimensions.height } as Coord,
      width: dimensions.width,
      height: dimensions.height,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 11 as Natural,
    },
    coord: {
      x: 0 as X,
      y: 0 as Y,
    } as Coord,
  }

  const stars: Array<CoreElem<GameImage>> = [0, 1].map(index => ({
    texture: {
      type: "GameImage",
      image: Assets.starsImage,
      width: dimensions.width,
      height: dimensions.height,
      filter: `opacity(${(1 - blue / 255) * 100}%)`,
      movementFactors: { x: 0.05, y: 0.05 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 12 as Natural,
      color: Color.black,
    },
    coord: {
      x: Assets.starsImage.width * index as X,
      y: 0 as Y,
    } as Coord,
  }))

  return [
    gradient,
    ...stars,
  ]
}

const rays: Array<CoreElem<GameLine>> = []
export type renderSun = (state: GameState) => GameElements
export const renderSun: renderSun = (state) => {
  const {
    time: { now },
    dimensions,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE

  if (t < 0.20 || t > 0.80) {
    return []
  }

  const [width, height] = [128, 128] as [X, Y]
  const radius = min(dimensions.width, dimensions.height) * 0.67
  const [originX, originY] = [
    dimensions.width * 0.5,
    dimensions.height - 1,
  ] as [X, Y]
  const [x, y] = [
    sin(PI * 2 * t) * radius + originX,
    cos(PI * 2 * t) * radius + originY,
  ] as [X, Y]

  const sun: CoreElem<GameArc> = {
    texture: {
      type: "GameArc",
      radius: 100 as Natural,
      startAngle: 0,
      endAngle: 360,
      antiClockwise: false,
      fill: true,
      lineWidth: 1 as Natural,
      filter: [
        `saturate(${min(100, 110 - brightness(t))}%)`,
        `hue-rotate(${redness(t) * -90}deg)`,
      ].join(" "),
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      layer: 13 as Natural,
      color: Color.white,
    },
    coord: {
      x, y,
    } as Coord,
  }

  const rays: Array<CoreElem<GameLine>> = []
  const r = 200
  const n = 100
  for (let i = 0; i < n; i++) {
    rays.push({
      texture: {
        type: "GameLine",
        width: sin(PI * 2 * (i / n)) * r as X,
        height: cos(PI * 2 * (i / n)) * r as Y,
        lineWidth: 15 as Natural,
        collidable: false,
        movementFactors: { x: 0, y: 0 } as Coord,
        layer: 13 as Natural,
        color: Color.HSLA(50,100,50,0.05),
      },
      coord: {
        x, y,
      } as Coord,
    })
  }

  return [
    sun,
    ...rays,
  ]
}

export type renderClouds = (state: GameState) => GameElements
export const renderClouds: renderClouds = (state) => {
  const {
    settings: { seed },
    dimensions,
    time: { now },
    screen,
  } = state

  const t: number = (now % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [256, 256] as [X, Y]
  const deltaX = now / 1000 * 2 as X
  const [x, y] = [
    diff(dimensions.width * 0.5 as X, deltaX),
    100 as Y,
  ]
  const movementFactors = { x: 0.5, y: 0.5 } as Coord

  const clouds: Array<CoreElem<GameImage>> = []
  if (clouds.length === 0) {
    const rng = new Prando(seed)
    const images = shuffle(Assets.cloudImages, () => rng.next(0, 1))
    const walk: Array<Coord> = Random.walk(10, 3 as Y, 0 as Y, () => rng.next(0, 1))

    for (const coord of walk) {
      const cloud: CoreElem<GameImage> = {
        texture: {
          type: "GameImage",
          image: images[clouds.length % images.length],
          width,
          height,
          movementFactors,
          collidable: false,
          filter: [
            `brightness(${brightness(t)}%)`,
            `hue-rotate(${redness(t) / 255 * 120}deg)`,
            `opacity(90%)`,
          ].join(" "),
          layer: 14 as Natural,
          color: Color.transparent,
        },
        coord: {
          x: coord.x * width as X,
          y: coord.y * height as Y,
        } as Coord,
      }

      clouds.push(cloud)
    }
  }

  Debug.text.modify(({ lines }) => {
    lines[0] = clouds.map(
      cloud => `{ ${(cloud.coord.x + x).toFixed(1)}, ${(cloud.coord.y + y).toFixed(1)} }`
    ).join(", ")
    return { lines }
  })

  // TODO multiply these by something like (screen.x / canvas.width) or w/e
  // the end goal is to make the clouds repeat
  return clouds.map(({ texture, coord }) => ({
    texture,
    coord: {
      x: coord.x + x as X,
      y: coord.y + y as Y,
    } as Coord,
  }))
}

type renderMountains = (state: GameState) => GameElements
const renderMountains: renderMountains = (state) => {
  const {
    time: { now },
  } = state

  const t: number = (now % DAY_CYCLE) / DAY_CYCLE

  const mountain: CoreElem<GameImage> = {
    texture: {
      type: "GameImage",
      image: Assets.mountainImages[0],
      width: 512 as X,
      height: 512 as Y,
      movementFactors: { x: 0.1, y: 0.1 } as Coord,
      collidable: false,
      filter: `brightness(${brightness(t)}%)`,
      layer: 0 as Natural, ////////////////////////////////////////// TODO FIXME
      color: Color.transparent,
    },
    coord: {
      x: 0 as X,
      y: 500 as Y,
    } as Coord,
  }
  return [ mountain ]
}

type PlayerTuple = [Coord, Coord, Coord, Coord, Coord]
const previousPlayersState
  = State.create<{ coords: Partial<PlayerTuple> }>({ coords: [] })
export type renderPlayer = (gameState: GameState) => GameElements
export const renderPlayer: renderPlayer = ({ player }) => {
  const {
    coord: { x, y },
    width, height,
    velocity,
  } = player

  const coord = { x, y } as Coord

  const playerElem: CoreElem<GameRect> = {
    texture: {
      type: "GameRect",
      width, height,
      color: Color.HSLA(0,0,0,0.5),
      collidable: true,
      movementFactors: { x: 1, y: 1 } as Coord,
      layer: 33 as Natural,
    },
    coord,
  }
  const outlineElem: CoreElem<GameRect> = {
    texture: {
      type: "GameRect",
      width: width + 10 as X,
      height: height + 10 as Y,
      color: Color.HSLA(0,100,100,0.5),
      collidable: false,
      movementFactors: { x: 1, y: 1 } as Coord,
      layer: 33 as Natural,
    },
    coord,
  }
  const previousCoords = previousPlayersState.get().coords.filter(
    (c): c is Coord => c !== undefined
  )
  let previousPlayers: Array<CoreElem<GameRect>> = []
  for (let i = 0; i < previousCoords.length; i++) {
    const prevCoords = previousCoords[i]
    previousPlayers.push({
      texture: {
        type: "GameRect",
        width: width as X,
        height: height as Y,
        color: Color.HSLA(348,100,47,0.6 / (i + 1)),
        collidable: false,
        movementFactors: { x: 1, y: 1 } as Coord,
        layer: 33 as Natural,
      },
      coord: prevCoords,
    })
  }
  previousPlayersState.modify(({ coords }) => ({
    coords: [
      { x, y } as Coord,
      coords[0],
      coords[1],
      coords[2],
      coords[3],
    ]
  }))

  return [
    ...previousPlayers,
    outlineElem,
    playerElem,
  ]
}

let fpsState: Array<Milliseconds>
  = [Date.now() as Milliseconds]
export type renderDebug = (gameState: GameState) => GameElements
export const renderDebug: renderDebug = (state) => {
  const {
    dimensions,
    time: { now },
    player,
    screen,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE
  let totalTime = 0 as Milliseconds
  for (let i = 1; i < fpsState.length; i++) {
    totalTime = totalTime + fpsState[i] - fpsState[i - 1] as Milliseconds
  }
  const fps = 1000 / (totalTime * (1 / max(1, fpsState.length - 1)))

  const fpsText: CoreElem<GameText> = {
    texture: {
      type: "GameText",
      color: Color.white,
      font: { size: 30, family: "Open Sans Mono" },
      text: `${fps.toFixed(1)} fps`,
      width: 200 as X,
      height: 30 as Y,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 101 as Natural,
    },
    coord: {
      x: dimensions.width - 300 as X,
      y: 40 as Y,
    } as Coord,
  }

  const timeText: CoreElem<GameText> = {
    texture: {
      type: "GameText",
      font: { size: 30, family: "Open Sans Mono" },
      text: `Time: ${(t * 24).toFixed(1)}h;`,
      color: Color.white,
      width: 200 as X,
      height: 30 as Y,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 101 as Natural,
    },
    coord: {
      x: 25 as X,
      y: 40 as Y,
    } as Coord,
  }

  const playerText: CoreElem<GameText> = {
    texture: {
      type: "GameText",
      font: { size: 30, family: "Open Sans Mono" },
      text: `Player: ${player.coord.x.toFixed(1)} x ${player.coord.y.toFixed(1)}`,
      color: Color.white,
      width: 200 as X,
      height: 30 as Y,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 101 as Natural,
    },
    coord: {
      x: 25 as X,
      y: 80 as Y,
    } as Coord,
  }

  const screenText: CoreElem<GameText> = {
    texture: {
      type: "GameText",
      font: { size: 30, family: "Open Sans Mono" },
      text: `Screen: ${screen.x.toFixed(1)} x ${screen.y.toFixed(1)}`,
      color: Color.white,
      width: 200 as X,
      height: 30 as Y,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
      layer: 101 as Natural,
    },
    coord: {
      x: 25 as X,
      y: 120 as Y,
    } as Coord,
  }

  const lines: Array<CoreElem<GameText>> = Debug.text.get().lines.reduce((acc, text, i) => {
    if (text !== null) {
      return acc.concat([
        {
          texture: {
            type: "GameText",
            font: { size: 30, family: "Open Sans Mono" },
            text,
            color: Color.white,
            width: dimensions.width as X,
            height: 30 as Y,
            movementFactors: { x: 0, y: 0 } as Coord,
            collidable: false,
            position: "top-left",
            layer: 101 as Natural,
          },
          coord: {
            x: 150 as X,
            y: 150 + (i + 1) * 30 as Y,
          } as Coord,
        }
      ])
    }

    return acc
  }, [] as Array<CoreElem<GameText>>)

  const visuals: GameElements
    = Debug.visuals.get().elems.reduce((acc, elem, i) => {
      return elem !== null
        ? acc.concat([ elem ])
        : acc
    }, [] as GameElements)

  return [
    timeText,
    fpsText,
    playerText,
    screenText,
    ...lines,
    ...visuals,
    {
      texture: {
        type: "GameText",
        font: { size: 30, family: "Open Sans Mono" },
        text: `Visuals: ${Debug.visuals.get().elems.length}`,
        width: 500 as X,
        height: 30 as Y,
        movementFactors: { x: 0, y: 0 } as Coord,
        collidable: false,
        position: "top-left",
        layer: 101 as Natural,
        color: Color.white,
      },
      coord: {
        x: 100 as X,
        y: dimensions.height - 100 as Y,
      } as Coord,
    },
  ]
}

export const staticLayers = []

export const dynamicLayers = [
  renderSky,
  renderSun,
  renderClouds,
  renderMountains,
  renderPlayer,
  renderDebug,
]

export type renderThoseLayers = (state: GameState, elems: GameElements) => void
export const renderThoseLayers: renderThoseLayers = (state, elems) => {
  const {
    screen: { x: screenX, y: screenY },
    zoom,
  } = state

  const layers: Record<number, GameElements> = {}

  for (const gameElement of elems) {
    const { texture, coord } = gameElement
    const {
      movementFactors: { x: moveX, y: moveY },
      layer,
    } = texture
    const {
      x, y,
    } = coord

    const size = "radius" in texture
      ? { radius: texture.radius * zoom as Natural }
      : {
          width: texture.width * zoom as X,
          height: texture.height * zoom as Y,
        }

    const fontSize = "font" in texture
      ? { font: { ...texture.font, size: texture.font.size * zoom } }
      : {}

    layers[layer] = (layers[layer] || []).concat([
      {
        texture: {
          ...texture,
          ...size,
          ...fontSize,
        },
        coord: {
          x: (x - screenX * moveX) * zoom as X,
          y: (y - screenY * moveY) * zoom as Y,
        },
      } as GameElement
    ])
  }

  const sortedLayerKeys: Array<string>
    = sortBy(parseInt, Object.keys(layers))

  for (const key of sortedLayerKeys) {
    for (const gameElement of layers[key as unknown as number]) {
      renderGameElement(state.context, gameElement)
    }
  }
}

type runLayers = (
  state: GameState,
  layers: Array<(gameState: GameState) => GameElements>,
  ) => Chunks.Chunks<GameElement>
const runLayers: runLayers = (state, layers) => {
  let acc: Chunks.Chunks<GameElement> = {}

  for (const layer of layers) {
    try {
      const elems = layer(state)

      for (const elem of elems) {
        const cantorPair: Natural
          = toCantor(Chunks.toCoord(elem.coord))

        acc[cantorPair] = (acc[cantorPair] || []).concat([ elem ])
      }
    } catch(e) {
      console.error(e)
    }
  }

  return acc
}

export type attachKeyEvents = (
  scopedState: ScopedState<GameState>,
) => void
export const attachKeyEvents: attachKeyEvents = (scopedState) => {
  let activeKeys: ActiveKeys = {}
  window.addEventListener("keydown", (event) => {
    if (!(event.key in activeKeys)) {
      const { time } = scopedState.get()
      activeKeys[event.key] = time.now
      console.log(event.key, "keydown")
      scopedState.modify(state => ({
        ...state,
        activeKeys,
      }))
    }
  })
  window.addEventListener("keyup", (event) => {
    delete activeKeys[event.key]
    scopedState.modify(state => ({
      ...state,
      activeKeys,
    }))
  })
}

// smoke sum types every day
const Jump: unique symbol = Symbol("Jump")
const GoLeft: unique symbol = Symbol("GoLeft")
const GoRight: unique symbol = Symbol("GoRight")
const ToggleZoom: unique symbol = Symbol("ToggleZoom")
const Crouch: unique symbol = Symbol("Crouch")

type Jump = typeof Jump
type GoLeft = typeof GoLeft
type GoRight = typeof GoRight
type ToggleZoom = typeof ToggleZoom
type Crouch = typeof Crouch

type Action
  = Jump
  | GoLeft
  | GoRight
  | ToggleZoom
  | Crouch

type handleInput = (bindings: Keybindings, keys: ActiveKeys) => Array<Action>
export const handleInput: handleInput = (bindings, keys) => {
  let actions: Array<Action> = []

  if (bindings.jump in keys) {
    actions.push(Jump)
  }
  if (bindings.left in keys) {
    actions.push(GoLeft)
  }
  if (bindings.right in keys) {
    actions.push(GoRight)
  }
  if (bindings.zoom in keys) {
    actions.push(ToggleZoom)
  }
  if (bindings.crouch in keys) {
    actions.push(Crouch)
  }

  return actions
}

// TODO move keyboard input elsewhere lol
type movement = (entity: Entity, state: GameState) => Entity
export const movement: movement = (entity, state) => {
  const {
    time: { now, previous },
    lastFrame,
    settings: {
      keybindings: keys,
    },
    zoom,
  } = state
  const {
    velocity,
    airborne,
    coord,
  } = entity

  // Time delta
  const dt: Seconds = toSeconds(diff(now, previous))

  const halfPiFraction: (k: string) => number
    = k => min(1, (now - state.activeKeys[k]) * 0.001) * PI * 0.5

  // TODO "stop" curve
  const moveLeft = keys.left in state.activeKeys
    ? max(1, velocity.x) * sin(halfPiFraction(keys.left)) * -20 as X
    : min(0, velocity.x + 1) as X
  const moveRight = keys.right in state.activeKeys
    ? sin(halfPiFraction(keys.right)) * 20 as X
    : max(0, velocity.x - 1) as X

  state.effects.modify(({ effects }) => {
    if (keys.jump in state.activeKeys && !airborne) {
      effects.push(Effects.jumpEffect)
    }

    if (keys.zoom in state.activeKeys && (zoom === 1 || zoom === 0.5)) {
      const isZoomed = zoom === 1
      effects.push(Effects.zoomEffect(isZoomed))
    }

    return { effects }
  })

  // 1. Add 100% compounding gravity
  // 2. Limit to maximum 500 * dt, i.e. 500px/s
  const gravity = (n: Y) =>
    min(800 * dt, round(n) === 0 ? 1 : (n < 0 ? n * 0.5 : n * 2)) as Y

  //console.log(gravity(jump || velocity.y), "gravity")
  Debug.text.modify(({ lines }) => {
    lines[1] = `velocity: ${(moveLeft + moveRight).toFixed(1)} x ${gravity(velocity.y).toFixed(1)}, airborne: ${airborne}`
    return { lines }
  })

  return Object.assign(entity, {
    velocity: {
      x: moveLeft + moveRight as X,
      y: gravity(velocity.y),
    },
  })
}

// TODO make this generic to entities rather than player
type collisionResolution = (
  state: GameState,
  gameElements: Array<GameElement>
) => Partial<Entity>
export const collisionResolution: collisionResolution = (state, gameElements) => {
  const {
    player: initPlayer,
  } = state

  if (initPlayer.velocity.x === 0 && initPlayer.velocity.y === 0) {
    return {}

  } else {
    const movingPlayer: Entity = {
      ...initPlayer,
      // Airborne until proven false by a downward collision
      airborne: true,
    }
    //console.log(movingPlayer, "movingPlayer")

    const correctedPlayer = gameElements.reduce((player, elem) => {
      const { velocity } = player
      const { texture, coord } = elem

      const [ diffX, diffY ] = [
        // Where is the element in relation to the player?
        // e.g. elem (50, -50) - player (-50, 50) = (100, -100)
        diff(coord.x, player.coord.x),
        diff(coord.y, player.coord.y),
      ]
      // XXX why are we dividing by 10 here? should this be removed?
      // Is the player movement in direction of the element?
      const moveX = velocity.x / 10 as X
      const moveY = velocity.y / 10 as Y
      const collidingCourse = dot(
        [moveX, moveY],
        [diffX, diffY],
      )

      //console.log(collidingCourse, "collidingCourse")
      // TODO support round bois
      if (collidingCourse > 0.5 && !("radius" in texture)) {
        // Player edges
        const rightPlayerX = player.coord.x + player.width * 0.5 + velocity.x as X
        const leftPlayerX = player.coord.x - player.width * 0.5 + velocity.x as X
        const downPlayerY = player.coord.y + player.height * 0.5 + velocity.y as Y
        const upPlayerY = player.coord.y - player.height * 0.5 + velocity.y as Y

        // Element edges
        const rightElemX = coord.x + texture.width * 0.5 as X
        const leftElemX = coord.x - texture.width * 0.5 as X
        const downElemY = coord.y + texture.height * 0.5 as Y
        const upElemY = coord.y - texture.height * 0.5 as Y

        const isInsideElemX = leftPlayerX < rightElemX && rightPlayerX > leftElemX
        const isInsideElemY = upPlayerY < downElemY && downPlayerY > upElemY

        //Debug.visuals.modify(({ elems }) => {
        //  elems.push({
        //    ...elem,
        //    color: Color.HSLA(0,0,100,0.3),
        //  } as any)

        //  return { elems }
        //})

        //console.log([velocity.x, velocity.y], "velocity")
        //console.log([isInsideElemX, isInsideElemY], "isInsideElem")
        if (isInsideElemX && isInsideElemY) {
          const correctX: X = velocity.x > 0
            ? diff(leftElemX, rightPlayerX)
            : diff(rightElemX, leftPlayerX)
          const correctY: Y = velocity.y > 0
            ? diff(upElemY, downPlayerY)
            : diff(downElemY, upPlayerY)

          // 1. Check which has the smallest rounded, absolute change
          // 2. If smallest, use said smallest change
          // 3. Otherwise, default to zero correction
          //
          // This ensures we don't move unnecessarily far when correcting
          const correctedVelocity = {
            x: round(abs(correctX)) <= round(abs(correctY))
              ? sum(velocity.x, correctX)
              : velocity.x,
            y: round(abs(correctY)) <= round(abs(correctX))
              ? sum(velocity.y, correctY)
              : velocity.y,
          } as Coord
          //console.log(correctedVelocity, "correctedVelocity")

          // Only if the player is touching _none_ of any elements, we're airborne
          const airborne = player.airborne && downPlayerY < upElemY

          Debug.text.modify(({ lines }) => {
            lines[2] = `elem: ${coord.x}x${coord.y}, player: ${player.coord.x.toFixed(1)}x${player.coord.y.toFixed(1)}`
            return { lines }
          })

          return {
            ...player,
            velocity: correctedVelocity,
            airborne,
          }
        }
      }

      return player
    }, movingPlayer)

    return {
      ...correctedPlayer,
      coord: {
        x: sum(initPlayer.coord.x, correctedPlayer.velocity.x),
        y: sum(initPlayer.coord.y, correctedPlayer.velocity.y),
      },
    }
  }
}

type collisionResolution2 = (state: GameState) => any
const collisionResolution2: collisionResolution2 = (state) => {
  const {
    chunks,
    player,
  } = state
  const { velocity } = player

  let elems: GameElements = []

  // who needs type safety
  const repel = (from: any, to: any) => diff(to, from) < 0 ? round(to - 0.1) : round(to)

  // X is OK, Y is NOT OK
  // Get the range of chunks from the player to the projected (velocity) position
  const fromX = player.coord.x * Chunks.CHUNK_RATIO
  const toX = (player.coord.x + player.width * 0.5 * sign(velocity.x) + velocity.x) * Chunks.CHUNK_RATIO
  const rx = range(round(fromX), round(toX))

  const fromY = player.coord.y * Chunks.CHUNK_RATIO
  const toY = (player.coord.y + player.height * 0.5 * sign(velocity.y) + velocity.y) * Chunks.CHUNK_RATIO
  const ry = range(
    repel(toY, fromY),
    repel(fromY, toY),
  )

  let firstCrash: Coord | null = null
  for (const x of rx) {
    for (const y of ry) {
      const coord = { x: coerce(x) as X, y: coerce(y) as Y } as Coord
      elems = elems.concat(chunks?.[toCantor(Chunks.toCoord(coord))] || [])
      if (elems.length && !firstCrash) {
        firstCrash = {
          x: x * (1 / Chunks.CHUNK_RATIO) + 50,
          y: y * (1 / Chunks.CHUNK_RATIO),
        } as Coord
      }
    }
  }

  if (firstCrash !== null) {
    Debug.visuals.modify(({ elems: ayylems }) => {
      ayylems.push({
        texture: {
          type: "GameRect",
          width: 100 as X,
          height: 100 as Y,
          color: Color.HSLA(120, 100, 50, 0.3),
          layer: 100 as Natural,
          collidable: false,
          movementFactors: { x: 1, y: 1 } as Coord,
        },
        coord: firstCrash,
      } as CoreElem<GameRect>)

      return { elems: ayylems }
    })
  }

  // We are pretty sure there is a collision at this point, however:
  //  1. We still need to check up to THREE chunks, not just one.
  //  2. We still need to check if we're actually colliding, because this just
  //     tells us if we're in their chunk space; we could have small elements.
  //  3. We need to adjust min(X, Y) to equal the _earliest_ colliding element,
  //     not the latest one (like currently).
  //
  // The next step is to do the actual resolution, as well.
}

type initGame = (props: {
  context: CanvasRenderingContext2D
  showMenu: () => void
}) => void
export const initGame: initGame = ({ context, showMenu }) => {
  // We don't want image smoothing
  context.imageSmoothingEnabled = false

  const userSettings: UserSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem("game/user-settings") || "{}")
    } catch(e) {
      return {}
    }
  })()

  const scopedState = State.create<GameState>({
    context,
    dimensions: {
      width: context.canvas.width as X,
      height: context.canvas.height as Y,
    },
    time: { now: 0 as Milliseconds, previous: 0 as Milliseconds },
    lastFrame: 0 as Milliseconds,
    player: {
      coord: {
        x: 0 as X,
        y: -200 as Y,
      } as Coord,
      width: 100 as X,
      height: 100 as Y,
      velocity: {
        x: 0 as X,
        y: 0 as Y
      } as Coord,
      airborne: true,
      weight: 50 as Natural,
      textures: [] as any, // TODO TOOOOODOOOOOO
    },
    screen: { x: 0 as X, y: 0 as Y } as Coord,
    settings: defaultSettings,
    activeKeys: {},
    zoom: 1,
    chunks: {},
    effects: State.create({ effects: [] as Effects.Effects }),
    paused: false,
  })

  attachKeyEvents(scopedState)

  let debugOnce = true

  const renderFrame = (_now: number) => {
    const now = _now as Milliseconds
    const state = scopedState.get()

    if (Debug.visuals.get().elems.length > 10) {
      Debug.visuals.modify(_ => ({ elems: [] }))
    }

    if (state.settings.keybindings.pause in state.activeKeys) {
      pausedState.modify(_ => ({ paused: true }))
      showMenu()
      return
    }

    // Generate terrain/map/static tings
    if (Object.keys(state.chunks).length === 0) {
      state.chunks = World.renderWorld(state) //runLayers(state, staticLayers)
    }

    // Adjust for zoom-level
    state.dimensions = {
      width: state.dimensions.width / state.zoom as X,
      height: state.dimensions.height / state.zoom as Y,
    }

    const delta = diff(now, state.lastFrame)
    state.time = { previous: state.time.now, now }

    const effectState = Effects.runEffects(state)
    Object.assign(state, effectState)

    state.player = movement(state.player, state)

    const dynamicElements: GameElements
      = Object.values(runLayers(state, dynamicLayers)).map(Object.values).flat()
    if (debugOnce) console.log(dynamicElements, "dynamicElements")
    if (debugOnce) console.log(state.chunks, "state.chunks")
    const screenElements: GameElements
      = getScreenChunks(state)
    if (debugOnce) console.log(screenElements, "screenElements")
    const visibleElements: GameElements = screenElements.concat(dynamicElements)
    if (Object.keys(effectState).length) {
      console.log(visibleElements, "visibleElements")
    }
    const collidableElements: GameElements
      = visibleElements.filter(({ texture }) => texture.collidable)
    if (debugOnce) console.log(collidableElements, "collidableElements")

    const resolvedPlayer: Partial<Entity>
      = collisionResolution(state, collidableElements)
    collisionResolution2(state)

    const player = {
      ...state.player,
      ...resolvedPlayer,
      // TODO increase these later i guess lol
      x: (resolvedPlayer?.coord!.x || state.player.coord.x) % 20000 as X,
      y: (resolvedPlayer?.coord!.y || state.player.coord.y) % 10000 as Y,
    }

    if (delta > (1000 / state.settings.fps)) {
      const movedState = {
        ...state,
        player,
      }

      renderThoseLayers(movedState, visibleElements)
      state.lastFrame = now

      const dateNow: Milliseconds
        = wrap(Date.now())
      fpsState = fpsState.concat([dateNow]).slice(-100)
    }

    scopedState.modify(oldState => ({
      ...oldState,
      ...effectState,
      time: state.time,
      lastFrame: state.lastFrame,
      player,
      screen: {
        x: diff(player.coord.x, state.dimensions.width * 0.5 as X),
        y: diff(player.coord.y, state.dimensions.height * 0.5 as Y),
      } as Coord,
    }))

    debugOnce = false
  }
  loop(0 as Milliseconds, 0 as Milliseconds, renderFrame)
}

type loop = (
  time: Milliseconds,
  prevWinNow: Milliseconds,
  f: (now: Milliseconds) => void
) => void
const loop: loop = (time, prevWinNow, f) => {
  window.requestAnimationFrame(windowNow => {
    const { paused } = pausedState.get()
    let now: Milliseconds = time
    // NOTE this will add _some_ extraneous time but it's tiny so it's ok
    if (!paused) {
      const delta = windowNow - prevWinNow
      now = now + delta as Milliseconds
      f(now)
    }
    loop(now, windowNow as Milliseconds, f)
  })
}

const pausedState = State.create({ paused: true })
export type Game = React.FunctionComponent<{
  paused: boolean
  showMenu: () => void
}>
export const Game: Game = ({ paused, showMenu }) => {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)

  React.useEffect(() => {
    if (canvasRef.current != null) {
      //const context = canvasRef?.current?.getContext("2d") as CanvasRenderingContext2D
      //initGame({ context, showMenu })
      Renderer.main(
        canvasRef.current as HTMLCanvasElement,
        pausedState,
      )
    } else {
      console.warn("Context not ready", canvasRef)
    }
  }, [canvasRef])

  React.useEffect(() => {
    pausedState.modify(() => ({ paused }))
  }, [paused])

  return React.createElement("canvas", {
    ref: canvasRef,
    width: 1600,
    height: 900,
    style: {
      width: "100vw",
      height: "100vh",
    },
  })
}

export default Game
