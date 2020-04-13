
import * as React from "react"
import Prando from "prando"
import { range } from "lodash"

import sun from "../assets/sun.png"
import grass from "../assets/grass.png"
import stars from "../assets/stars.png"
import cloud1 from "../assets/cloud1.png"
import cloud2 from "../assets/cloud2.png"


export interface Coord {
  x: number
  y: number
}

export interface Dimensions {
  width: number
  height: number
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
  up: any,
  left: any,
  down: any,
  right: any,
  jump: any,
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
  },
  seed: Math.floor(Math.random() * 10)
}

export type UserSettings = {
  [K in keyof Settings]?: {
    [Sk in keyof Settings[K]]: Settings[K][Sk]
  }
}

export interface ActiveKeys {
  [key: string]: number
}

export type Player = Coord & Dimensions

export interface GameState {
  context: CanvasRenderingContext2D
  time: number
  lastFrame: number
  player: Player
  screenPosition: Coord
  settings: Settings
  activeKeys: ActiveKeys
  move: Coord
}

export interface ScopedState<A> {
  getState: () => A
  setState: (state: A) => void
}

export const createState: <A>(state: A) => ScopedState<A> = (state) => {
  // why does typescript hate me
  let o: { state: any } = {
    state
  }
  return {
    getState: () => ({ ...o.state }),
    setState: (state) => o.state = state,
  }
}

export type setPartialState = <A>(
  scopedState: ScopedState<A>,
  partialState: { [K in keyof A]?: A[K] },
) => void
export const setPartialState: setPartialState = (
  scopedState,
  partialState,
) => {
  const state = scopedState.getState()
  scopedState.setState(
    Object.assign(
      state,
      partialState,
    )
  )
}

export type merge = <R>(
  left: { [Kl in keyof R]: any },
  right: { [Kr in keyof R]: any },
) => R
export const merge: merge = (left, right) => {
  return left
}


// 60 seconds
export const DAY_CYCLE: number = 60 * Math.pow(10, 3)

export const sunImage = new Image()
sunImage.src = sun
export const grassImage = new Image()
grassImage.src = grass
export const starsImage = new Image()
starsImage.src = stars
export const cloudImages = [cloud1, cloud2].map(cloud => {
  const image = new Image()
  image.src = cloud
  return image
})

export type dot = (left: Array<number>, right: Array<number>) => number
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

  switch (gameElement._tag) {
    case "GameImage": {
      const { image, x, y, width, height } = gameElement as GameImage
      context.drawImage(image, x, y, width, height)
      break
    }

    case "GameText": {
      const { font, text, x, y, width } = gameElement as GameText
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

export const brightness: (t: number) => number = t => Math.min(100, Math.max(0.3, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 100)

export type renderSky = (state: GameState) => GameElements
export const renderSky: renderSky = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  // wizard magic
  // g n = if n >= 0.2 && n < 0.35 || n > 0.7 && n < 0.85 then max 0 $ sin (n * pi * 2 * 8) * 255 else 0
  const red = t >= 0.2 && t < 0.35 || t > 0.7 && t < 0.85
    ? Math.max(0, Math.sin(t * Math.PI * 2 * 8)) * 255
    : 0
  // h n = max 0 $ sin (n * pi * 2 / 2 - 0.075) * 255 - 128
  const green = Math.max(0, Math.sin(t * Math.PI * 2 * 0.5 - 0.075) * 255 - 128)
  // f n = min 255 $ max 0.1 (sin (n * pi * 1.8 - 1.4) * 2) * 255
  const blue = Math.min(255, Math.max(0.1, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 255)

  const gradient: GameLinearGradient = {
    _tag: "GameLinearGradient",
    colorStops: [
      { offset: 0, color: `rgb(0,${green},${blue})` },
      { offset: 1 - (red / 255 * 0.5), color: `rgb(0,${green},${blue})` },
      { offset: 1, color: `rgb(183, 29, 22)` },
    ],
    start: { x: 0, y: 0 },
    stop: { x: 0, y: context.canvas.height },
    x: 0,
    y: 0,
    width: context.canvas.width,
    height: context.canvas.height,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  const stars: Array<GameImage> = [0, 1].map(index => ({
    _tag: "GameImage",
    image: starsImage,
    x: starsImage.width * index,
    y: 0,
    width: starsImage.width,
    height: starsImage.height,
    filter: `opacity(${(1 - blue / 255) * 100}%)`,
    movementFactors: { x: 0.1, y: 0.1 },
    collidable: false,
  }))

  return [
    gradient,
    ...stars,
  ]
}

export type renderSun = (state: GameState) => GameElements
export const renderSun: renderSun = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [150, 150]
  const radius = Math.min(context.canvas.width, context.canvas.height) * 0.67
  const [originX, originY] = [context.canvas.width * 0.5, context.canvas.height - 1]
  const [x, y] = [
    Math.sin(Math.PI * 2 * t) * radius + originX - width * 0.5,
    Math.cos(Math.PI * 2 * t) * radius + originY - width * 0.5,
  ]

  const sun: GameImage = {
    _tag: "GameImage",
    image: sunImage,
    x,
    y,
    width,
    height,
    filter: `brightness(${brightness(t) * 2}%)`,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  return [ sun ]
}

export type renderClouds = (state: GameState) => GameElements
export const renderClouds: renderClouds = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [300, 300]
  const deltaX = time / 1000 * 2
  const [x, y] = [context.canvas.width * 0.5 - deltaX, 100]
  const cloud: GameImage = {
    _tag: "GameImage",
    image: cloudImages[1],
    x,
    y,
    width,
    height,
    movementFactors: { x: 0.1, y: 0.1 },
    collidable: false,
    filter: `brightness(${brightness(t)}%)`,
  }

  return [ cloud ]
}

// NOTE: will return _at least_ one coord object
export type randomWalk = (
  seed: number,
  xMax: number,
) => Array<Coord>
export const randomWalk: randomWalk = (seed, xMax) => {
  const rng = new Prando(seed * xMax)
  const x = Math.round(rng.next(1, Math.min(xMax, 10)))
  const y = Math.round(rng.next(-3, 3))
  const coord: Coord = { x, y }

  return x < xMax
    ? [ coord ].concat(randomWalk(seed, xMax - x))
    : [ coord ]
}

let grasses: Array<GameRect> = []
export type renderGrass = (state: GameState) => GameElements
export const renderGrass: renderGrass = ({ context, time, settings }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  const [width, height] = [100, 100]

  // evil state
  // TODO move map generation into GameState
  if (grasses.length === 0) {
    const walk = randomWalk(settings.seed, 200)
    grasses = walk.reduce((acc, { x, y }, i) => {
      const {
        x: oldX,
        y: oldY
      } = i > 0 ? acc[acc.length - 1] : { x: 0, y: 0 }
      console.log(acc[acc.length - 1], `acc[${acc.length - 1}]`)
      const xRange: Array<number> = range(x)
      const yRange: Array<number> = range(y)
      const floor: Array<GameRect> = xRange.map(i => ({
        _tag: "GameRect",
        x: oldX + i * width,
        y: oldY + y * height,
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 },
        collidable: true,
      }))
      const wall: Array<GameRect> = yRange.map(i => ({
        _tag: "GameRect",
        x: oldX,
        y: oldY + i * height,
        width,
        height,
        style: "green",
        filter: `brightness(${brightness(t)}%)`,
        movementFactors: { x: 1, y: 1 },
        collidable: true,
      }))
      return acc.concat(wall.concat(floor))
    }, [] as Array<GameRect>).map(elem => ({
      ...elem,
      y: elem.y + context.canvas.height
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
    movementFactors: { x: 1, y: 1 },
  }
  const outlineElem: GameRect = {
    _tag: "GameRect",
    x: x - 5,
    y: y - 5,
    width: width + 10,
    height: height + 10,
    style: `rgba(255,255,255,0.5)`,
    collidable: true,
    movementFactors: { x: 1, y: 1 },
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
    context,
    time,
    player,
    screenPosition,
  } = state
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const now = Date.now()
  const averageTime = fpsState.slice(1).reduce((acc, val, index) => val - fpsState[index - 1], 0) / (fpsState.length - 1)
  const fps = Math.pow(10, 3) / averageTime

  const fpsText: GameText = {
    _tag: "GameText",
    style: "white",
    font: "30px Open Sans Mono",
    text: `${fps.toFixed(1)} fps`,
    x: 1300,
    y: 40,
    width: 200,
    height: 30,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  const timeText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Time: ${(t * 24).toFixed(1)}h;`,
    style: "white",
    x: 25,
    y: 40,
    width: 200,
    height: 30,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  const playerText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Player: ${player.x} x ${player.y}`,
    style: "white",
    x: 25,
    y: 80,
    width: 200,
    height: 30,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  const screenText: GameText = {
    _tag: "GameText",
    font: "30px Open Sans Mono",
    text: `Screen: ${screenPosition.x.toFixed(1)} x ${screenPosition.y.toFixed(1)}`,
    style: "white",
    x: 25,
    y: 120,
    width: 200,
    height: 30,
    movementFactors: { x: 0, y: 0 },
    collidable: false,
  }

  const visibilityBlock: GameRect = {
    _tag: "GameRect",
    style: "rgba(255,255,255, 0.1)",
    x: 150,
    y: 150,
    width: context.canvas.width - 300,
    height: context.canvas.height - 300,
    collidable: false,
    movementFactors: { x: 0, y: 0 },
  }

  fpsState = fpsState.concat([now]).slice(-10)

  return [
    timeText,
    fpsText,
    playerText,
    screenText,
    visibilityBlock,
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
    screenPosition: { x: screenX, y: screenY }
  } = state
  elems.forEach(gameElement => {
    const {
      x,
      y,
      movementFactors: { x: moveX, y: moveY },
    } = gameElement
    renderGameElement(state.context, {
      ...gameElement,
      x: x - screenX * moveX,
      y: y - screenY * moveY,
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
      screenPosition: {
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
      activeKeys[event.key] = time
      setPartialState(scopedState, { activeKeys })
    }
  })
  window.addEventListener("keyup", (event) => {
    delete activeKeys[event.key]
    setPartialState(scopedState, { activeKeys })
  })
}

// TODO collision detection
export type movement = (state: GameState, gameElements: GameElements) => Coord
export const movement: movement = (state, gameElements) => {
  const {
    time,
    settings: {
      keybindings: {
        up,
        left,
        down,
        right,
      },
    },
    context: { canvas },
    screenPosition: screen,
    player,
  } = state

  const halfPiFraction: (k: string) => number = k =>
    Math.min(1000, time - state.activeKeys[k]) / 1000 * Math.PI * 0.5

  const moveUp = up in state.activeKeys
    ? Math.sin(halfPiFraction(up)) * -10
    : 0
  const moveLeft = left in state.activeKeys
    ? Math.sin(halfPiFraction(left)) * -10
    : 0
  const moveDown = down in state.activeKeys
    ? Math.sin(halfPiFraction(down)) * 10
    : 0
  const moveRight = right in state.activeKeys
    ? Math.sin(halfPiFraction(right)) * 10
    : 0

  const move = {
    x: moveLeft + moveRight,
    y: moveUp + moveDown,
  }

  if (move.x === 0 && move.y === 0) {
    return move

  } else {
    const playerCenter = {
      x: player.x + player.width * 0.5,
      y: player.y + player.height * 0.5,
    }

    return gameElements.reduce((accMove, elem) => {
      const [ vectorX, vectorY ] = [
        player.x - elem.x,
        player.y - elem.y,
      ]
      const collidingCourse = dot(
        [accMove.x / 10, accMove.y / 10],
        [vectorX, vectorY],
      )

      console.log(`vx: ${vectorX}, vy: ${vectorY}`)
      console.log(collidingCourse, "collidingCourse")
      if (collidingCourse <= 0.5) {
        return accMove
      } else {
        const elemCenter: Coord = {
          x: elem.x + elem.width * 0.5,
          y: elem.y + elem.height * 0.5,
        }
        const diffX = playerCenter.x - elemCenter.x
        const gapX = diffX - elem.width * 0.5 - player.width * 0.5
        const diffY = playerCenter.y - elemCenter.y
        const gapY = diffY - elem.height * 0.5 - player.height * 0.5

        console.log(`gapY: ${gapY}, gapX: ${gapX}`, "gaps")
        if (gapX >= 0 && gapY >= 0) {
          return {
            x: accMove.x - gapX,
            y: accMove.x - gapY,
          }
        } else {
          return accMove
        }
      }
    }, move)
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
    time: 0,
    lastFrame: 0,
    player: {
      x: context.canvas.width * 0.5,
      y: context.canvas.height * 0.5,
      width: 50,
      height: 100,
    },
    screenPosition: { x: 0, y: 0 },
    settings: defaultSettings,
    activeKeys: {},
    move: { x: 0, y: 0 },
  })

  attachKeyEvents(scopedState)

  const renderFrame = (now: number) => {
    const state = scopedState.getState()

    const delta = now - state.lastFrame
    state.time = now

    const gameElements = getGameElements(state)
    const {
      x: moveX,
      y: moveY,
    } = movement(state, gameElements)

    if (delta > 75) {
      const movedState = {
        ...state,
        move: {
          x: moveX,
          y: moveY,
        },
      }
      const visibleElements = getVisibleElems(movedState, gameElements)

      renderThoseLayers(movedState, visibleElements)
      state.lastFrame = now
    }

    setPartialState(scopedState, {
      time: state.time,
      lastFrame: state.lastFrame,
      player: {
        x: state.player.x + moveX,
        y: state.player.y + moveY,
        width: state.player.width,
        height: state.player.height,
      },
      screenPosition: {
        x: state.screenPosition.x + moveX,
        y: state.screenPosition.y + moveY,
      },
    })
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

  return (
    <canvas
      ref={canvasRef}
      width={1920}
      height={1080}
      style={{
        width: "100vw",
        height: "100vh",
      }}
    />
  )
}

export default Game
