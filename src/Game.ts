
import * as React from "react"
import Prando from "prando"
import { range } from "lodash"

import { shuffle } from "./Math"

import sun from "../assets/sun.png"
import grass from "../assets/grass.png"
import stars from "../assets/stars.png"
import cloud1 from "../assets/cloud1.png"
import cloud2 from "../assets/cloud2.png"
import cloud3 from "../assets/cloud3.png"
import cloud4 from "../assets/cloud4.png"
import cloud5 from "../assets/cloud5.png"
import cloud6 from "../assets/cloud6.png"
import cloud7 from "../assets/cloud7.png"
import cloud8 from "../assets/cloud8.png"
import cloud9 from "../assets/cloud9.png"

// 314 smoke math
const {
  PI, sin, cos, abs, min, max, floor, round, ceil, pow, random, sign, atan2
} = Math


const NEWTYPE = Symbol()
export type X = number & { readonly [NEWTYPE]: unique symbol }
export type Y = number & { readonly [NEWTYPE]: unique symbol }

type W = <A>(f: (...as: Array<A>) => any, ...as: Array<A>) => A
const W: W = <A>(f: (...as: Array<A>) => any, ...as: Array<A>) => f(...as) as A

export interface Coord {
  x: X
  y: Y
}

export interface Dimensions {
  width: X
  height: Y
}

export interface Style {
  style?: string
}

export interface Filter {
  filter?: string
}

export type CoreElement = {
  collidable: boolean,
  movementFactors: Coord,
  position?: "center" | "top-left"
} & Coord & Dimensions & Filter

export type GameImage = {
  _tag: "GameImage",
  image: HTMLImageElement,
} & CoreElement & Style

export type GameText = {
  _tag: "GameText",
  font: string,
  text: string,
} & CoreElement & Style

export type GameRect = {
  _tag: "GameRect",
} & CoreElement & Style

export interface GradientStop {
  offset: number
  color: string
}

export type GameLinearGradient = {
  _tag: "GameLinearGradient"
  colorStops: Array<GradientStop>
  start: Coord
  stop: Coord
} & CoreElement

export type GameElement
  = GameImage
  | GameText
  | GameRect
  | GameLinearGradient

export type GameElements = Array<GameElement>

export interface Collidable {
  _tag: "Collidable",
  element: GameElement
}

export interface Keybindings {
  up: string,
  left: string,
  down: string,
  right: string,
  jump: string,
  sprint: string,
}

export interface Settings {
  keybindings: Keybindings
  seed: number
}

export const defaultSettings = {
  keybindings: {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
    jump: " ",
    sprint: "Shift",
  },
  seed: floor(random() * 10)
}

export type UserSettings = {
  [K in keyof Settings]?: {
    [Sk in keyof Settings[K]]: Settings[K][Sk]
  }
}

export interface ActiveKeys {
  [key: string]: number
}

export type Player = {
  velocity: Coord,
  airborne: boolean,
} & Coord & Dimensions

export interface GameState {
  context: CanvasRenderingContext2D
  time: { now: number, previous: number }
  lastFrame: number
  player: Player
  screen: Coord
  settings: Settings
  activeKeys: ActiveKeys
  move: Coord
}

export interface ScopedState<A> {
  getState: () => A
  setState: (f: (state: A) => A) => void
}

type Obj<A> = {} & A
export const createState: <A>(state: Obj<A>) => ScopedState<Obj<A>> = <A>(state: Obj<A>) => {
  let o: Obj<A> = state
  return {
    getState: () => ({ ...o }),
    setState: (f: (state: Obj<A>) => Obj<A>) => o = f(o),
  }
}

const debugLines = createState({ lines: [] as Array<string> })


// 60 seconds
export const DAY_CYCLE: number = 60 * pow(10, 3)

export const sunImage = new Image()
sunImage.src = sun
export const grassImage = new Image()
grassImage.src = grass
export const starsImage = new Image()
starsImage.src = stars
export const cloudImages = [
  cloud1, cloud2, cloud3, cloud4, cloud5, cloud6, cloud7, cloud8, cloud9
].map(cloud => {
  const image = new Image()
  image.src = cloud
  return image
})

export type dot = (left: [X, Y], right: [X, Y]) => number
export const dot: dot = (left, right) =>
  left.reduce((acc, a, i) => acc + a * right[i], 0)

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
    gameElement.x = W(
      (..._) => gameElement.x - gameElement.width * 0.5,
      gameElement.x, gameElement.width
    )
    gameElement.y = W(
      (..._) => gameElement.y - gameElement.height * 0.5,
      gameElement.y, gameElement.height
    )
  }

  switch (gameElement._tag) {
    case "GameImage": {
      const { image, x, y, width, height } = gameElement as GameImage
      context.drawImage(image, x, y, width, height)
      break
    }

    case "GameText": {
      const { font, text, x, y, width, height } = gameElement as GameText
      context.font = font
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
    context: { canvas },
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
    stop: { x: 0, y: canvas.height } as Coord,
    x: 0 as X,
    y: 0 as Y,
    width: canvas.width as X,
    height: canvas.height as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
  }

  const stars: Array<GameImage> = [0, 1].map(index => ({
    _tag: "GameImage",
    image: starsImage,
    x: starsImage.width * index as X,
    y: 0 as Y,
    width: starsImage.width as X,
    height: starsImage.height as Y,
    filter: `opacity(${(1 - blue / 255) * 100}%)`,
    movementFactors: { x: 0.1, y: 0.1 } as Coord,
    collidable: false,
    position: "top-left",
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
    context: { canvas },
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [128, 128] as [X, Y]
  const radius = min(canvas.width, canvas.height) * 0.67
  const [originX, originY] = [
    canvas.width * 0.5,
    canvas.height - 1,
  ] as [X, Y]
  const [x, y] = [
    W(
      (..._) => sin(PI * 2 * t) * radius + originX - width * 0.5,
      originX,
    ),
    W(
      (..._) => cos(PI * 2 * t) * radius + originY - width * 0.5,
      originY,
    ),
  ]

  const sun: GameImage = {
    _tag: "GameImage",
    image: sunImage,
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
  }

  return [ sun ]
}

export type renderClouds = (state: GameState) => GameElements
export const renderClouds: renderClouds = (state) => {
  const {
    settings,
    context: { canvas },
    time: { now },
    screen,
  } = state

  const t: number = (now % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [256, 256] as [X, Y]
  const deltaX = now / 1000 * 2 as X
  const [x, y] = [
    W((..._) => canvas.width * 0.5 - deltaX, deltaX),
    100 as Y,
  ]
  const movementFactors = { x: 0.5, y: 0.5 } as Coord

  const walk: Array<Coord> = randomWalk(settings.seed, 30 as X)
  let clouds: Array<GameImage> = []
  if (clouds.length === 0) {
    const rng = new Prando(settings.seed)
    const images = shuffle(cloudImages, () => rng.next(0, 1))

    clouds = walk.reduce((acc, coord, i) => {
      const {
        x: oldX,
      } = i > 0 ? acc[acc.length - 1] : { x: -500 } as Coord
      const cloud: GameImage = {
        _tag: "GameImage",
        image: images[i % images.length],
        x: oldX + coord.x * width * 0.2 as X,
        y: height as Y,
        width,
        height,
        movementFactors,
        collidable: false,
        filter: [
          `brightness(${brightness(t)}%)`,
          `hue-rotate(${redness(t) / 255 * 120}deg)`,
          `opacity(90%)`,
        ].join(" "),
      }
      return [ ...acc, cloud ]
    }, [] as Array<GameImage>)
  }

  debugLines.setState(({ lines }) => {
    lines[0] = clouds.map(
      cloud => `{ ${(cloud.x + x).toFixed(1)}, ${(cloud.y + y).toFixed(1)} }`
    ).join(", ")
    return { lines }
  })

  const testX = screen.x

  // TODO multiply these by something like (screen.x / canvas.width) or w/e
  // the end goal is to make the clouds repeat
  return clouds.map(cloud => ({
    ...cloud,
    x: cloud.x + x as X,
    y: cloud.y + y as Y,
  }))
}

// NOTE: will return _at least_ one coord object
export type randomWalk = (
  seed: number,
  xMax: X,
) => Array<Coord>
export const randomWalk: randomWalk = (seed, xMax) => {
  const rng = new Prando(seed * xMax)
  const x = round(rng.next(1, min(xMax, 10))) as X
  const y = round(rng.next(-3, 3)) as Y
  const coord: Coord = { x, y }

  return x < xMax
    ? [ coord ].concat(randomWalk(seed, W((..._) => xMax - x, xMax, x)))
    : [ coord ]
}

let grasses: Array<GameRect> = []
export type renderGrass = (state: GameState) => GameElements
export const renderGrass: renderGrass = (state) => {
  const {
    time: { now },
    context: { canvas },
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
      const xRange = range(x) as Array<X>
      const yRange = range(y) as Array<Y>
      const floor: Array<GameRect> = xRange.map(i => ({
        _tag: "GameRect",
        x: W((..._) => oldX + i * width, oldX, i, width),
        y: W((..._) => oldY + y * height, oldY, y, height),
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 } as Coord,
        collidable: true,
      }))
      const wall: Array<GameRect> = yRange.map(i => ({
        _tag: "GameRect",
        x: oldX,
        y: W((..._) => oldY + y * height, oldY, y, height),
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 } as Coord,
        collidable: true,
      }))
      return acc.concat(wall.concat(floor))
    }, [] as Array<GameRect>).map(elem => ({
      ...elem,
      y: W((..._) => elem.y + canvas.height, elem.y)
    }))
  }

  return grasses as GameElements
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
  }
  const outlineElem: GameRect = {
    _tag: "GameRect",
    x,
    y,
    width: W((..._) => width + 10, width),
    height: W((..._) => height + 10, height),
    style: `rgba(255,255,255,0.5)`,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  return [
    outlineElem,
    playerElem,
  ]
}

let fpsState = [Date.now()]
export type renderDebug = (gameState: GameState) => GameElements
export const renderDebug: renderDebug = (state) => {
  const {
    context: { canvas },
    time: { now },
    player,
    screen,
  } = state
  const t = (now % DAY_CYCLE) / DAY_CYCLE
  const dateNow = Date.now()
  const averageTime = fpsState.slice(1).reduce((acc, val, index) => val - fpsState[index - 1], 0) / (fpsState.length - 1)
  const fps = pow(10, 3) / averageTime

  const fpsText: GameText = {
    _tag: "GameText",
    style: "white",
    font: "30px Open Sans Mono",
    text: `${fps.toFixed(1)} fps`,
    x: 1300 as X,
    y: 40 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
  }

  const timeText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Time: ${(t * 24).toFixed(1)}h;`,
    style: "white",
    x: 25 as X,
    y: 40 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
  }

  const playerText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Player: ${player.x} x ${player.y}`,
    style: "white",
    x: 25 as X,
    y: 80 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
  }

  const screenText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Screen: ${screen.x.toFixed(1)} x ${screen.y.toFixed(1)}`,
    style: "white",
    x: 25 as X,
    y: 120 as Y,
    width: 200 as X,
    height: 30 as Y,
    movementFactors: { x: 0, y: 0 } as Coord,
    collidable: false,
    position: "top-left",
  }

  const visibilityBlock: GameRect = {
    _tag: "GameRect",
    style: "rgba(255,255,255, 0.1)",
    x: 150 as X,
    y: 150 as Y,
    width: canvas.width - 300 as X,
    height: canvas.height - 300 as Y,
    collidable: false,
    movementFactors: { x: 0, y: 0 } as Coord,
    position: "top-left",
  }

  fpsState = fpsState.concat([dateNow]).slice(-10)

  const lines: Array<GameText> = debugLines.getState().lines.map((text, i) => {
    return {
      _tag: "GameText",
      font: "30px Open Sans Mono",
      text,
      style: "white",
      x: 150 as X,
      y: 150 + (i + 1) * 30 as Y,
      width: canvas.width as X,
      height: 30 as Y,
      movementFactors: { x: 0, y: 0 } as Coord,
      collidable: false,
      position: "top-left",
    }
  })

  return [
    timeText,
    fpsText,
    playerText,
    screenText,
    visibilityBlock,
    ...lines,
  ]
}

export const gameLayers = [
  renderSky,
  renderSun,
  renderClouds,
  renderGrass,
  renderDebug,
  renderPlayer,
]

export type renderThoseLayers = (state: GameState, elems: GameElements) => void
export const renderThoseLayers: renderThoseLayers = (state, elems) => {
  const {
    screen: { x: screenX, y: screenY }
  } = state
  elems.forEach(gameElement => {
    const {
      x,
      y,
      movementFactors: { x: moveX, y: moveY },
    } = gameElement
    renderGameElement(state.context, {
      ...gameElement,
      x: W((..._) => x - screenX * moveX, x, screenX, moveX),
      y: W((..._) => y - screenY * moveY, y, screenY, moveY),
    })
  })
}

export type getGameElements = (state: GameState) => GameElements
export const getGameElements: getGameElements = (state) => {
  return gameLayers.map(layer => {
    try {
      return layer(state)
    } catch(e) {
      console.error(e)
      return []
    }
  }).flat()
}

// TODO remove debug border/padding of 150px
export type getVisibleElems = (state: GameState, layers: GameElements) => GameElements
export const getVisibleElems: getVisibleElems = (state, layers) => {
  return layers.filter(elem => {
    const {
      x, y,
      width, height,
      movementFactors: {
        x: moveX,
        y: moveY,
      },
    } = elem
    const {
      screen: {
        x: screenX,
        y: screenY,
      },
      context: { canvas },
    } = state
    const topCornerVisible =
      width * 2 + x >= (screenX * moveX) + 150
        && height * 2 + y >= (screenY * moveY) + 150
    const bottomCornerVisible =
      (x - width * 2) <= (screenX * moveX) + canvas.width - 300
        && (y - height * 2) <= (screenY * moveY) + canvas.height - 300
    return bottomCornerVisible && topCornerVisible
  })
}

export type attachKeyEvents = (
  scopedState: ScopedState<GameState>,
) => void
export const attachKeyEvents: attachKeyEvents = (scopedState) => {
  let activeKeys: ActiveKeys = {}
  window.addEventListener("keydown", (event) => {
    if (!(event.key in activeKeys)) {
      const { time } = scopedState.getState()
      activeKeys[event.key] = time.now
      console.log(event.key, "keydown")
      scopedState.setState(state => ({
        ...state,
        activeKeys,
      }))
    }
  })
  window.addEventListener("keyup", (event) => {
    delete activeKeys[event.key]
    scopedState.setState(state => ({
      ...state,
      activeKeys,
    }))
  })
}

export type movement = (state: GameState) => Coord
export const movement: movement = (state) => {
  const {
    time: { now, previous },
    lastFrame,
    settings: {
      keybindings: keys,
    },
    player: { velocity, airborne },
  } = state

  // Time delta
  const dt = (now - previous) / 1000

  const halfPiFraction: (k: string) => number = k =>
    min(1000, now - state.activeKeys[k]) / 1000 * PI * 0.5

  const sprintFactor = (keys.sprint in state.activeKeys ? 1.5 : 1) as X

  const moveLeft = keys.left in state.activeKeys
    ? max(1, velocity.x) * sin(halfPiFraction(keys.left)) * -10 as X
    : min(0, velocity.x + 1) as X
  const moveRight = keys.right in state.activeKeys
    ? sin(halfPiFraction(keys.right)) * 10 as X
    : max(0, velocity.x - 1) as X

  const jump = keys.jump in state.activeKeys && !airborne
    ? sin(min(1000, now - state.activeKeys[keys.jump]) / 1000 * PI * 0.5) * -300 as Y
    : 0 as Y

  // 1. Don't add gravity unless we're airborne
  // 2. If we're airborne but not falling, start falling
  // 3. Add 5% compounding gravity
  // 4. Limit it to 500 * dt
  const gravity = (n: Y) =>
    min(500 * dt, round(n) === 0 ? 10 : (n < 0 ? n * 0.5 : n * 1.05)) as Y

  //console.log(gravity(jump || velocity.y), "gravity")
  debugLines.setState(({ lines }) => {
    lines[1] = `jump: ${jump}, gravity: ${gravity(jump || velocity.y).toFixed(1)}, airborne: ${airborne}`
    return { lines }
  })

  return {
    x: W((..._) => (moveLeft + moveRight) * sprintFactor, moveLeft, moveRight, sprintFactor),
    y: W((..._) => gravity(jump || velocity.y), jump),
  }
}

type collisionResolution = (
  move: Coord,
  state: GameState,
  gameElements: Array<GameElement>
) => Partial<Player>
export const collisionResolution: collisionResolution = (move, state, gameElements) => {
  const {
    context: { canvas },
    player: initPlayer,
  } = state

  if (move.x === 0 && move.y === 0) {
    return {}

  } else {
    const movingPlayer: Player = {
      ...initPlayer,
      velocity: move,
    }
    console.log(movingPlayer, "movingPlayer")

    const correctedPlayer = gameElements.reduce((player, elem) => {
      const { velocity } = player

      const [ diffX, diffY ] = [
        // Where is the element in relation to the player?
        // e.g. elem (50, -50) - player (-50, 50) = (100, -100)
        W((..._) => elem.x - player.x, elem.x, player.x),
        W((..._) => elem.y - player.y, elem.y, player.y),
      ]
      // Is the player movement in direction of the element?
      const moveX = W((..._) => velocity.x / 10, velocity.x)
      const moveY = W((..._) => velocity.y / 10, velocity.y)
      const collidingCourse = dot(
        [moveX, moveY],
        [diffX, diffY],
      )

      console.log(collidingCourse, "collidingCourse")
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

        console.log([velocity.x, velocity.y], "velocity")
        console.log([isInsideElemX, isInsideElemY], "isInsideElem")
        if (isInsideElemX && isInsideElemY) {
          // 1. Get the delta we need to correct
          //    - Should _always_ be the opposite of the original direction, e.g.
          //      if we're moving +x we'll get a -x delta.
          // 2. Multiply it by the angle we're moving in
          //    - If it's 45 degrees both X and Y are affected
          //    - The plane we're moving the fastest in gets multiplied by the
          //      min(1) value
          //    - The plane we're moving the slowest in gets multiplied by the
          //      fraction of what we're moving in the other plane
          //    - We ensure the fraction is absolute so we don't affect the
          //      sign of the delta and velocity in the opposite direction
          const corrected = {
            x: W(
              (..._) => velocity.x + (
                velocity.x > 0
                  ? (leftElemX - rightPlayerX) * min(1, abs(velocity.x / velocity.y))
                  : (rightElemX - leftPlayerX) * min(1, abs(velocity.x / velocity.y))
                ),
              rightElemX, leftElemX, rightPlayerX, leftPlayerX,
            ),
            y: W(
              (..._) => velocity.y + (
                velocity.y > 0
                  ? max(
                      -velocity.y,
                      (upElemY - downPlayerY) * min(1, abs(velocity.y / velocity.x)),
                    )
                  : (downElemY - upPlayerY) * min(1, abs(velocity.y / velocity.x))
                ),
              downElemY, upElemY, downPlayerY, upPlayerY
            ),
          }
          console.log(corrected, "corrected")

          // If the player is touching _none_ of the elements, we're airborne
          const airborne = player.airborne && downPlayerY < upElemY

          return {
            ...player,
            velocity: corrected,
            airborne,
          }
        }
      }

      return player
    }, movingPlayer)

    return {
      ...correctedPlayer,
      x: W(
        (..._) => initPlayer.x + correctedPlayer.velocity.x,
        initPlayer.x, correctedPlayer.velocity.x,
      ),
      y: W(
        (..._) => initPlayer.y + correctedPlayer.velocity.y,
        initPlayer.y, correctedPlayer.velocity.y,
      ),
    }
  }
}

export const initGame = (context: CanvasRenderingContext2D) => {
  const userSettings: UserSettings = (() => {
    try {
      return JSON.parse(localStorage.getItem("game/user-settings") || "{}")
    } catch(e) {
      return {}
    }
  })()

  const scopedState = createState<GameState>({
    context,
    time: { now: 0, previous: 0 },
    lastFrame: 0,
    player: {
      x: context.canvas.width * 0.5 as X,
      y: context.canvas.height * 0.5 as Y,
      width: 50 as X,
      height: 100 as Y,
      velocity: { x: 0, y: 0 } as Coord,
      airborne: true,
    },
    screen: { x: 0 as X, y: 0 as Y },
    settings: defaultSettings,
    activeKeys: {},
    move: { x: 0 as X, y: 0 as Y },
  })

  attachKeyEvents(scopedState)

  const renderFrame = (now: number) => {
    const state = scopedState.getState()

    const delta = now - state.lastFrame
    state.time = { previous: state.time.now, now }

    const gameElements = getGameElements(state)
    const collidableElements = gameElements.filter(elem => elem.collidable)
    const keyMove: Coord = movement(state)
    const movedPlayer: Partial<Player> =
      collisionResolution(keyMove, state, gameElements)

    const player = {
      ...state.player,
      ...movedPlayer,
      // TODO increase these later i guess lol
      x: (movedPlayer.x || state.player.x) % 10000 as X,
      y: (movedPlayer.y || state.player.y) % 10000 as Y,
    }

    // TODO FPS in settings
    if (delta > (1000 / 60)) {
      const movedState = {
        ...state,
        player,
      }
      const visibleElements = getVisibleElems(movedState, gameElements)

      renderThoseLayers(movedState, visibleElements)
      state.lastFrame = now
    }

    scopedState.setState(oldState => ({
      ...oldState,
      time: state.time,
      lastFrame: state.lastFrame,
      player,
      screen: {
        x: W(
          (..._) => player.x - context.canvas.width * 0.5,
          state.screen.x, player.velocity.x,
        ),
        y: W(
          (..._) => player.y - context.canvas.height * 0.5,
          state.screen.y, player.velocity.y,
        ),
      },
    }))
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
