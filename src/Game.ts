
import * as React from "react"
import Prando from "prando"
import { range, minBy, keys, sortBy } from "ramda"

import {
  ActiveKeys,
  GameChunks,
  GameElement,
  GameElements,
  GameImage,
  GameLinearGradient,
  GameRect,
  GameState,
  GameText,
  Player,
  UserSettings,
  coerce,
  wrap,
} from "./Types"
import * as Effects from "./Effects"
import {
  Coord,
  Integer,
  Milliseconds,
  Natural,
  Seconds,
  X,
  Y,
  cantor,
  ceil,
  diff,
  dot,
  floor,
  round,
  shuffle,
  toSeconds,
} from "./Math"
import * as Assets from "./Assets"
import { ScopedState } from "./ScopedState"
import * as State from "./ScopedState"
import * as Debug from "./Debug"

// 314 smoke math
const {
  PI, sin, cos, abs, min, max, pow, random, sign, atan2
} = Math


export const defaultSettings = {
  keybindings: {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
    jump: " ",
    sprint: "Shift",
    zoom: "m",
  },
  fps: 30,
  seed: floor(random() * 10),
}

export const CHUNK_SIZE = 100

type merge = (chunksA: GameChunks, chunksB: GameChunks) => GameChunks
const merge: merge = (chunksA, chunksB) => {
  let acc = { ...chunksA }

  for (const k in chunksB) {
    acc[k] = (acc[k] || []).concat(chunksB[k])
  }

  return acc
}

type getScreenChunks = (state: GameState) => GameElements
export const getScreenChunks: getScreenChunks = (state) => {
  const {
    dimensions: { width, height },
    screen: { x, y },
    chunks,
  } = state

  let blocks: GameElements = []
  for (let ix = floor(x / CHUNK_SIZE); ix < ceil((x + width) / CHUNK_SIZE); ix++) {
    for (let iy = floor(y / CHUNK_SIZE); iy < ceil((y + height) / CHUNK_SIZE); iy++) {
      const elems = chunks?.[cantor(ix, iy)]
      if (elems?.length > 0) {
        blocks = blocks.concat(elems)
      }
    }
  }

  return blocks
}


// 60 seconds
export const DAY_CYCLE: number = 60 * pow(10, 3)

export type renderGameElement = (
  context: CanvasRenderingContext2D,
  gameElement: GameElement,
) => void
export const renderGameElement: renderGameElement = (context, gameElement) => {
  if ("style" in gameElement && gameElement.style != null) {
    context.fillStyle = gameElement.style
  }
  if ("filter" in gameElement && gameElement.filter != null) {
    context.filter = gameElement.filter
  }
  if ("position" in gameElement && gameElement.position === "top-left") {
  } else {
    gameElement.x = diff(gameElement.x, gameElement.width * 0.5 as X)
    gameElement.y = diff(gameElement.y, gameElement.height * 0.5 as Y)
  }

  switch (gameElement._tag) {
    case "GameImage": {
      const { image, x, y, width, height } = gameElement as GameImage
      context.drawImage(image, x, y, width, height)
      break
    }

    case "GameText": {
      const { font, text, x, y, width, height } = gameElement as GameText
      context.font = `${font.size}px ${font.family}`
      context.fillText(text, x, y, width)
      break
    }

    case "GameRect": {
      const { x, y, width, height } = gameElement as GameRect
      context.fillRect(x, y, width, height)
      break
    }

    case "GameLinearGradient": {
      const {
        start,
        stop,
        colorStops,
        x,
        y,
        width,
        height,
      } = gameElement as GameLinearGradient
      const gradient = context.createLinearGradient(start.x, start.y, stop.x, stop.y)
      colorStops.forEach(({ offset, color }) => gradient.addColorStop(offset, color))
      context.fillStyle = gradient
      context.fillRect(x, y, width, height)
      break
    }
  }

  if ("filter" in gameElement && gameElement.filter != null) {
    context.filter = "none"
  }
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

  const gradient: GameLinearGradient = {
    _tag: "GameLinearGradient",
    colorStops: [
      { offset: 0, color: `rgb(0,${green},${blue})` },
      { offset: 1 - (red / 255 * 0.5), color: `rgb(0,${green},${blue})` },
      { offset: 1, color: `rgb(183, 29, 22)` },
    ],
    start: { x: 0, y: 0 } as Coord,
    stop: { x: 0, y: dimensions.height } as Coord,
    x: 0 as X,
    y: 0 as Y,
    width: dimensions.width as X,
    height: dimensions.height as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 11 as Natural,
  }

  const stars: Array<GameImage> = [0, 1].map(index => ({
    _tag: "GameImage",
    image: Assets.starsImage,
    x: Assets.starsImage.width * index as X,
    y: 0 as Y,
    width: Assets.starsImage.width as X,
    height: Assets.starsImage.height as Y,
    filter: `opacity(${(1 - blue / 255) * 100}%)`,
    movementFactors: { x: 0.1, y: 0.1 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 12 as Natural,
  }))

  return [
    gradient,
    ...stars,
  ]
}

export type renderSun = (state: GameState) => GameElements
export const renderSun: renderSun = (state) => {
  const {
    time: { now },
    dimensions,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [128, 128] as [X, Y]
  const radius = min(dimensions.width, dimensions.height) * 0.67
  const [originX, originY] = [
    dimensions.width * 0.5,
    dimensions.height - 1,
  ] as [X, Y]
  const [x, y] = [
    sin(PI * 2 * t) * radius + originX - width * 0.5 as X,
    cos(PI * 2 * t) * radius + originY - width * 0.5 as Y,
  ]

  const sun: GameImage = {
    _tag: "GameImage",
    image: Assets.sunImage,
    x,
    y,
    width,
    height,
    filter: [
      `saturate(${min(100, 110 - brightness(t))}%)`,
      `hue-rotate(${redness(t) * -90}deg)`,
    ].join(" "),
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    layer: 13 as Natural,
  }

  return [ sun ]
}

export type renderClouds = (state: GameState) => GameElements
export const renderClouds: renderClouds = (state) => {
  const {
    settings,
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

  const clouds: Array<GameImage> = []
  if (clouds.length === 0) {
    const rng = new Prando(settings.seed)
    const images = shuffle(Assets.cloudImages, () => rng.next(0, 1))
    const walk: Array<Coord> = randomWalk(settings.seed, 3 as X)

    for (const coord of walk) {
      const {
        x: oldX,
        y: oldY,
      } = clouds.length > 0
        ? walk[walk.length - 1]
        : { x: -500, y: 100 } as Coord

      const cloud: GameImage = {
        _tag: "GameImage",
        image: images[clouds.length % images.length],
        x: oldX + coord.x * width as X,
        y: oldY + coord.y * height as Y,
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
      }

      clouds.push(cloud)
    }
  }

  Debug.debugLines.modify(({ lines }) => {
    lines[0] = clouds.map(
      cloud => `{ ${(cloud.x + x).toFixed(1)}, ${(cloud.y + y).toFixed(1)} }`
    ).join(", ")
    return { lines }
  })

  // TODO multiply these by something like (screen.x / canvas.width) or w/e
  // the end goal is to make the clouds repeat
  return clouds.map(cloud => ({
    ...cloud,
    x: cloud.x + x as X,
    y: cloud.y + y as Y,
  }))
}

type renderMountains = (state: GameState) => GameElements
const renderMountains: renderMountains = (state) => {
  const {
    time: { now },
  } = state

  const t: number = (now % DAY_CYCLE) / DAY_CYCLE

  const mountain: GameImage = {
    _tag: "GameImage",
    image: Assets.mountainImages[0],
    x: 0 as X,
    y: 500 as Y,
    width: 512 as X,
    height: 512 as Y,
    movementFactors: { x: 0.1, y: 0.1 } as Coord,
    collidable: false,
    filter: `brightness(${brightness(t)}%)`,
    layer: 0 as Natural, ////////////////////////////////////////// TODO FIXME
  }
  return [ mountain ]
}

// NOTE: will return _at least_ one coord object
export type randomWalk = (
  seed: number,
  xMax: X,
) => Array<Coord>
export const randomWalk: randomWalk = (seed, xMax) => {
  const rng = new Prando(seed * xMax)
  const x = round(rng.next(1, min(xMax, 10))) as number as X
  const y = round(rng.next(-3, 3)) as number as Y
  const coord: Coord = { x, y }

  return x < xMax
    ? [ coord ].concat(randomWalk(seed, diff(xMax, x)))
    : [ coord ]
}

// circle t r m
//  = fmap (map (\(x, y) -> (x + m, y)))
//  . fmap (scanr1 (\(ox, oy) (x, y) -> (ox + x, oy + y)))
//  . replicateM t $ (,) <$> fmap (\n -> r * cos (n * pi * 2)) rand <*> fmap (\n -> r * sin (n * pi * 2)) rand
//      where rand = Random.randomRIO @Double (0, 1)
type randomWalk2D =
  (t: number, r: number, m: X, rand: () => number) => Array<Coord>

const randomWalk2D: randomWalk2D = (t, r, m, rand) => {
  let acc: Array<Coord> = [ { x: 0, y: 0 } as Coord ]
  for (let i = 0; i < t; i++) {
    const [rx, ry] = [1,2].map(_ => rand() * PI * 2)
    const { x: oldX, y: oldY } = acc[acc.length - 1]
    const [x, y] = [r * cos(rx) + oldX, r * sin(ry) + oldY]
    acc.push({ x, y } as Coord)
  }
  return acc.map(({ x, y }) => ({ x: x + m as X, y }))
}

let caves: GameElements = []
export type renderCaves = (state: GameState) => GameElements
const renderCaves: renderCaves = (state) => {
  const {
    time: { now },
    settings,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE

  if (caves.length === 0) {
    const rng = new Prando(settings.seed)
    const walk = randomWalk2D(1000, 3, 10 as X, () => rng.next(0, 1))
    const sortedX = [ ...walk].sort((a, b) => a.x - b.x)
    const sortedY = [ ...walk].sort((a, b) => a.y - b.y)

    const [minX, maxX]: [Integer, Integer] = [
      round(sortedX[0].x),
      round(sortedX[sortedX.length - 1].x),
    ]
    const [minY, maxY]: [Integer, Integer] = [
      round(sortedY[0].y),
      round(sortedY[sortedY.length - 1].y),
    ]

    // This looks immoral but whatever lol javascript sucks why does (==)
    // behave on references and not structure smh
    const walkSet: Set<string> = new Set(
      walk.reduce((acc, coord) => acc.concat(
        [-1, 0, 1].map(i =>
          [-1, 0, 1].map(j => 
            `${coerce(round(coord.x + i))}x${coerce(round(coord.y + j))}`
          )
        ).flat()
      ), [] as Array<string>).flat()
    )

    for (let ix = minX; ix < maxX; ix++) {
      for (let iy = minY; iy < maxY; iy++) {
        if (!walkSet.has(`${ix}x${iy}`)) {
          caves.push({
            _tag: "GameRect",
            x: minX * 100 + ix * 100 as X,
            y: abs(minY * 100) + iy * 100 as Y,
            width: 100 as X,
            height: 100 as Y,
            style: "brown",
            movementFactors: { x: 1, y: 1 } as Coord,
            collidable: true,
            layer: 32 as Natural,
          })
        }
      }
    }
  }

  return caves
}

let grasses: Array<GameRect> = []
export type renderGrass = (state: GameState) => GameElements
export const renderGrass: renderGrass = (state) => {
  const {
    time: { now },
    dimensions,
    settings,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE

  const [width, height] = [100, 100] as [X, Y]

  // evil state
  // TODO move map generation into GameState
  if (grasses.length === 0) {
    const walk = randomWalk(settings.seed, 200 as X)
    const walk2 = randomWalk(settings.seed + walk[0].x, 200 as X)
    grasses = walk.reduce((acc, { x, y }, i) => {
      const {
        x: oldX,
        y: oldY
      } = i > 0 ? acc[acc.length - 1] : { x: 0, y: 0 } as Coord
      console.log(acc[acc.length - 1], `acc[${acc.length - 1}]`)
      const xRange = range(x >= 0 ? 0 : x, x >= 0 ? x : 0) as Array<X>
      const yRange = range(y >= 0 ? 0 : y, y >= 0 ? y : 0) as Array<Y>
      const floor: Array<GameRect> = xRange.map(i => ({
        _tag: "GameRect",
        x: oldX + i * width as X,
        y:  oldY + y * height as Y,
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 } as Coord,
        collidable: true,
        layer: 32 as Natural,
      }))
      const wall: Array<GameRect> = yRange.map(i => ({
        _tag: "GameRect",
        x: oldX,
        y: oldY + y * height as Y,
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 } as Coord,
        collidable: true,
        layer: 32 as Natural,
      }))
      return acc.concat(wall.concat(floor))
    }, [] as Array<GameRect>).map(elem => ({
      ...elem,
      y: elem.y + dimensions.height as Y,
    }))
  }

  // TODO do brightness/lighting somewhere more general
  return grasses.map(grass => ({
    ...grass,
    filter: `brightness(${brightness(t)}%)`,
  })) as GameElements
}

export type renderPlayer = (gameState: GameState) => GameElements
export const renderPlayer: renderPlayer = ({ player }) => {
  const { x, y, width, height } = player
  const playerElem: GameRect = {
    _tag: "GameRect",
    x, y,
    width, height,
    style: `rgba(0,0,0,0.5)`,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
    layer: 33 as Natural,
  }
  const outlineElem: GameRect = {
    _tag: "GameRect",
    x,
    y,
    width: width + 10 as X,
    height: height + 10 as Y,
    style: `rgba(255,255,255,0.5)`,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
    layer: 33 as Natural,
  }
  return [
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
  const averageTime = wrap(fpsState.slice(1).reduce(
    (acc, val, index) => acc + diff(val, fpsState[index - 1]) as Milliseconds,
    0 as Milliseconds,
  ) / (fpsState.length - 1))
  const fps = 1000 / averageTime

  const fpsText: GameText = {
    _tag: "GameText",
    style: "white",
    font: { size: 30, family: "Open Sans Mono" },
    text: `${fps.toFixed(1)} fps`,
    x: dimensions.width - 300 as X,
    y: 40 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 101 as Natural,
  }

  const timeText: GameText = {
    _tag: "GameText",
    font: { size: 30, family: "Open Sans Mono" },
    text: `Time: ${(t * 24).toFixed(1)}h;`,
    style: "white",
    x: 25 as X,
    y: 40 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 101 as Natural,
  }

  const playerText: GameText = {
    _tag: "GameText",
    font: { size: 30, family: "Open Sans Mono" },
    text: `Player: ${player.x.toFixed(1)} x ${player.y.toFixed(1)}`,
    style: "white",
    x: 25 as X,
    y: 80 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 101 as Natural,
  }

  const screenText: GameText = {
    _tag: "GameText",
    font: { size: 30, family: "Open Sans Mono" },
    text: `Screen: ${screen.x.toFixed(1)} x ${screen.y.toFixed(1)}`,
    style: "white",
    x: 25 as X,
    y: 120 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
    layer: 101 as Natural,
  }

  const visibilityBlock: GameRect = {
    _tag: "GameRect",
    style: "rgba(255,255,255, 0.1)",
    x: 150 as X,
    y: 150 as Y,
    width: dimensions.width - 300 as X,
    height: dimensions.height - 300 as Y,
    collidable: false,
    movementFactors: { x: 0, y: 0 } as Coord,
    position: "top-left",
    layer: 101 as Natural,
  }

  const lines: Array<GameText> = Debug.debugLines.get().lines.reduce((acc, text, i) => {
    if (text !== null) {
      return acc.concat([
        {
          _tag: "GameText",
          font: { size: 30, family: "Open Sans Mono" },
          text,
          style: "white",
          x: 150 as X,
          y: 150 + (i + 1) * 30 as Y,
          width: dimensions.width as X,
          height: 30 as Y,
          movementFactors: { x: 0, y: 0 } as Coord,
          collidable: false,
          position: "top-left",
          layer: 101 as Natural,
        }
      ])
    }

    return acc
  }, [] as Array<GameText>)

  return [
    timeText,
    fpsText,
    playerText,
    screenText,
    visibilityBlock,
    ...lines,
  ]
}

export const staticLayers = [
  renderGrass,
  renderCaves,
]

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
    const {
      x,
      y,
      width,
      height,
      movementFactors: { x: moveX, y: moveY },
      layer,
    } = gameElement

    const fontSize = gameElement._tag !== "GameText"
      ? {}
      : { font: { ...gameElement.font, size: gameElement.font.size * zoom } }

    layers[layer] = (layers[layer] || []).concat([
      {
        ...gameElement,
        x: (x - screenX * moveX) * zoom as X,
        y: (y - screenY * moveY) * zoom as Y,
        width: width * zoom as X,
        height: width * zoom as Y,
        ...fontSize,
      }
    ])
  }

  const sortedLayerKeys: Array<number>
    = sortBy(id => id, keys(layers))

  for (const key of sortedLayerKeys) {
    for (const gameElement of layers[key]) {
      renderGameElement(state.context, gameElement)
    }
  }
}

type runLayers = (
  state: GameState,
  layers: Array<(gameState: GameState) => GameElements>,
  ) => GameChunks
const runLayers: runLayers = (state, layers) => {
  let acc: GameChunks = {}

  for (const layer of layers) {
    try {
      const elems = layer(state)

      for (const elem of elems) {
        const cantorPair: Natural
          = cantor(floor(elem.x / CHUNK_SIZE), floor(elem.y / CHUNK_SIZE))

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

export type movement = (state: GameState) => Player
export const movement: movement = (state) => {
  const {
    time: { now, previous },
    lastFrame,
    settings: {
      keybindings: keys,
    },
    player: { velocity, airborne },
    zoom,
  } = state

  // Time delta
  const dt = (now - previous) / 1000

  const halfPiFraction: (k: string) => number = k =>
    min(1000, now - state.activeKeys[k]) / 1000 * PI * 0.5

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

    if (keys.zoom in state.activeKeys) {
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
  Debug.debugLines.modify(({ lines }) => {
    lines[1] = `gravity: ${gravity(velocity.y).toFixed(1)}, airborne: ${airborne}`
    return { lines }
  })

  return Object.assign(state.player, {
    velocity: {
      x: moveLeft + moveRight as X,
      y: gravity(velocity.y),
    },
  })
}

type collisionResolution = (
  state: GameState,
  gameElements: Array<GameElement>
) => Partial<Player>
export const collisionResolution: collisionResolution = (state, gameElements) => {
  const {
    player: initPlayer,
  } = state

  if (initPlayer.velocity.x === 0 && initPlayer.velocity.y === 0) {
    return {}

  } else {
    const movingPlayer: Player = {
      ...initPlayer,
      // Airborne until proven false by a downward collision
      airborne: true,
    }
    //console.log(movingPlayer, "movingPlayer")

    const correctedPlayer = gameElements.reduce((player, elem) => {
      const { velocity } = player

      const [ diffX, diffY ] = [
        // Where is the element in relation to the player?
        // e.g. elem (50, -50) - player (-50, 50) = (100, -100)
        diff(elem.x, player.x),
        diff(elem.y, player.y),
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
      if (collidingCourse > 0.5) {
        // Player edges
        const rightPlayerX = player.x + player.width * 0.5 + velocity.x as X
        const leftPlayerX = player.x - player.width * 0.5 + velocity.x as X
        const downPlayerY = player.y + player.height * 0.5 + velocity.y as Y
        const upPlayerY = player.y - player.height * 0.5 + velocity.y as Y

        // Element edges
        const rightElemX = elem.x + elem.width * 0.5 as X
        const leftElemX = elem.x - elem.width * 0.5 as X
        const downElemY = elem.y + elem.height * 0.5 as Y
        const upElemY = elem.y - elem.height * 0.5 as Y

        const isInsideElemX = leftPlayerX < rightElemX && rightPlayerX > leftElemX
        const isInsideElemY = upPlayerY < downElemY && downPlayerY > upElemY

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
              ? velocity.x + correctX as X
              : velocity.x,
            y: round(abs(correctY)) <= round(abs(correctX))
              ? velocity.y + correctY as Y
              : velocity.y,
          }
          //console.log(correctedVelocity, "correctedVelocity")

          // Only if the player is touching _none_ of any elements, we're airborne
          const airborne = player.airborne && downPlayerY < upElemY

          Debug.debugLines.modify(({ lines }) => {
            lines[2] = `elem: ${elem.x}x${elem.y}, player: ${player.x.toFixed(1)}x${player.y.toFixed(1)}`
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
      x: initPlayer.x + correctedPlayer.velocity.x as X,
      y: initPlayer.y + correctedPlayer.velocity.y as Y,
    }
  }
}

export const initGame = (context: CanvasRenderingContext2D) => {
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
      x: context.canvas.width * 0.5 as X,
      y: context.canvas.height * 0.5 as Y,
      width: 100 as X,
      height: 200 as Y,
      velocity: { x: 0, y: 0 } as Coord,
      airborne: true,
    },
    screen: { x: 0 as X, y: 0 as Y },
    settings: defaultSettings,
    activeKeys: {},
    zoom: 1,
    chunks: {},
    effects: State.create({ effects: [] as Effects.Effects }),
  })

  attachKeyEvents(scopedState)

  let debugOnce = true

  const renderFrame = (_now: number) => {
    const now = _now as Milliseconds
    const state = scopedState.get()

    if (Object.keys(state.chunks).length === 0) {
      state.chunks = runLayers(state, staticLayers)
    }

    // Adjust for zoom-level
    state.dimensions = {
      width: state.dimensions.width / state.zoom as X,
      height: state.dimensions.height / state.zoom as Y,
    }
    // Center according to zoom
    state.screen = {
      x: state.screen.x - (state.dimensions.width / state.zoom * 0.5) + state.dimensions.width * 0.5 as X,
      y: state.screen.y - (state.dimensions.height / state.zoom * 0.5) + state.dimensions.height * 0.5 as Y,
    }

    const delta = diff(now, state.lastFrame)
    state.time = { previous: state.time.now, now }

    const effectState = Effects.runEffects(state)
    Object.assign(state, effectState)

    let movedPlayer: Player = movement(state)
    state.player = movedPlayer

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
      = visibleElements.filter(elem => elem.collidable)
    if (debugOnce) console.log(collidableElements, "collidableElements")

    const resolvedPlayer: Partial<Player>
      = collisionResolution(state, collidableElements)

    const player = {
      ...state.player,
      ...resolvedPlayer,
      // TODO increase these later i guess lol
      x: (resolvedPlayer.x || state.player.x) % 10000 as X,
      y: (resolvedPlayer.y || state.player.y) % 10000 as Y,
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
      fpsState = fpsState.concat([dateNow]).slice(-1000)
    }

    scopedState.modify(oldState => ({
      ...oldState,
      ...effectState,
      time: state.time,
      lastFrame: state.lastFrame,
      player,
      screen: {
        x: diff(player.x, state.dimensions.width * 0.5 as X),
        y: diff(player.y, state.dimensions.height * 0.5 as Y),
      },
    }))

    debugOnce = false
    window.requestAnimationFrame(renderFrame)
  }
  window.requestAnimationFrame(renderFrame)
}

export type Game = () => React.ReactElement
export const Game: Game = () => {
  const canvasRef = React.useRef<
    HTMLCanvasElement | null
  >(null)

  React.useEffect(() => {
    const context = canvasRef?.current?.getContext("2d")
    if (context != null) {
      initGame(context)
    } else {
      console.warn("Context not ready", canvasRef)
    }
  }, [canvasRef])

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
