
import * as React from "react"
import Prando from "prando"
import { range } from "lodash"

import sun from "../assets/sun.png"
import grass from "../assets/grass.png"
import stars from "../assets/stars.png"
import cloud1 from "../assets/cloud1.png"
import cloud2 from "../assets/cloud2.png"


interface Coord {
  x: number
  y: number
}

interface Dimensions {
  width: number
  height: number
}

interface Style {
  style?: string
}

interface Filter {
  filter?: string
}

type CoreElement = {
  collidable: boolean,
  movementFactors: Coord,
} & Coord & Dimensions & Filter

type GameImage = {
  _tag: "GameImage",
  image: HTMLImageElement,
} & CoreElement & Style

type GameText = {
  _tag: "GameText",
  font: string,
  text: string,
} & CoreElement & Style

type GameRect = {
  _tag: "GameRect",
} & CoreElement & Style

interface GradientStop {
  offset: number
  color: string
}

type GameLinearGradient = {
  _tag: "GameLinearGradient"
  colorStops: Array<GradientStop>
  start: Coord
  stop: Coord
} & CoreElement

type GameElement
  = GameImage
  | GameText
  | GameRect
  | GameLinearGradient

type GameLayers = Array<GameElement>

interface Collidable {
  _tag: "Collidable",
  element: GameElement
}

interface Keybindings {
  up: any,
  left: any,
  down: any,
  right: any,
  jump: any,
}

interface Settings {
  keybindings: Keybindings
  seed: number
}

const defaultSettings = {
  keybindings: {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
    jump: " ",
  },
  seed: Math.floor(Math.random() * 10)
}

type UserSettings = {
  [K in keyof Settings]?: {
    [Sk in keyof Settings[K]]: Settings[K][Sk]
  }
}

interface ActiveKeys {
  keys: { [key: string]: number },
}

interface GameState {
  context: CanvasRenderingContext2D
  time: number
  lastFrame: number
  playerPosition: Coord
  screenPosition: Coord
  settings: Settings
  activeKeys: ActiveKeys
  move: Coord
}

interface ScopedState<A> {
  getState: () => A
  setState: (state: A) => void
}

const createState: <A>(state: A) => ScopedState<A> = (state) => {
  // why does typescript hate me
  let o: { state: any } = {
    state
  }
  return {
    getState: () => ({ ...o.state }),
    setState: (state) => o.state = state,
  }
}

type setPartialState = <A>(
  scopedState: ScopedState<A>,
  partialState: { [K in keyof A]?: A[K] },
) => void

const setPartialState: setPartialState = (
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

type merge = <R>(
  left: { [Kl in keyof R]: any },
  right: { [Kr in keyof R]: any },
) => R
const merge: merge = (left, right) => {
  return left
}


// 60 seconds
const DAY_CYCLE: number = 60 * Math.pow(10, 3)

const sunImage = new Image()
sunImage.src = sun
const grassImage = new Image()
grassImage.src = grass
const starsImage = new Image()
starsImage.src = stars
const cloudImages = [cloud1, cloud2].map(cloud => {
  const image = new Image()
  image.src = cloud
  return image
})


type renderGameElement = (
  context: CanvasRenderingContext2D,
  gameElement: GameElement,
) => void
const renderGameElement: renderGameElement = (context, gameElement) => {
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

const brightness: (t: number) => number = t => Math.min(100, Math.max(0.3, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 100)

type renderSky = (state: GameState) => GameLayers
const renderSky: renderSky = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  // wizard magic
  // g n = if n >= 0.2 && n < 0.35 || n > 0.7 && n < 0.85 then max 0 $ sin (n * pi * 2 * 8) * 255 else 0
  const red = t >= 0.2 && t < 0.35 || t > 0.7 && t < 0.85
    ? Math.max(0, Math.sin(t * Math.PI * 2 * 8)) * 255
    : 0
  // h n = max 0 $ sin (n * pi * 2 / 2 - 0.075) * 255 - 128
  const green = Math.max(0, Math.sin(t * Math.PI * 2 / 2 - 0.075) * 255 - 128)
  // f n = min 255 $ max 0.1 (sin (n * pi * 1.8 - 1.4) * 2) * 255
  const blue = Math.min(255, Math.max(0.1, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 255)

  const gradient: GameLinearGradient = {
    _tag: "GameLinearGradient",
    colorStops: [
      { offset: 0, color: `rgb(0,${green},${blue})` },
      { offset: 1 - (red / 255 / 2), color: `rgb(0,${green},${blue})` },
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

type renderSun = (state: GameState) => GameLayers
const renderSun: renderSun = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [150, 150]
  const radius = Math.min(context.canvas.width, context.canvas.height) / 1.5
  const [originX, originY] = [context.canvas.width / 2, context.canvas.height - 1]
  const [x, y] = [
    Math.sin(Math.PI * 2 * t) * radius + originX - width / 2,
    Math.cos(Math.PI * 2 * t) * radius + originY - width / 2,
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

type renderClouds = (state: GameState) => GameLayers
const renderClouds: renderClouds = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const [width, height] = [300, 300]
  const deltaX = time / 1000 * 2
  const [x, y] = [context.canvas.width / 2 - deltaX, 100]
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
type randomWalk = (
  seed: number,
  xMax: number,
) => Array<Coord>
const randomWalk: randomWalk = (seed, xMax) => {
  const rng = new Prando(seed * xMax)
  const x = Math.round(rng.next(1, Math.min(xMax, 10)))
  const y = Math.round(rng.next(-3, 3))
  const coord: Coord = { x, y }

  return x < xMax
    ? [ coord ].concat(randomWalk(seed, xMax - x))
    : [ coord ]
}

let grasses: Array<GameRect> = []
type renderGrass = (state: GameState) => GameLayers
const renderGrass: renderGrass = ({ context, time, settings }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  const [width, height] = [100, 100]
  const quantity = Math.ceil(context.canvas.width / 100)

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
    }, [] as Array<GameRect>)
  }

  return grasses as GameLayers
}

type renderPlayer = (gameState: GameState) => GameLayers
const renderPlayer: renderPlayer = ({ context }) => {
  const [width, height] = [50, 150]
  const [x, y] = [
    context.canvas.width / 2 - width / 2,
    context.canvas.height / 2 - height / 2,
  ]
  const player: GameRect = {
    _tag: "GameRect",
    x, y,
    width, height,
    style: `rgba(0,0,0,0.5)`,
    collidable: true,
    movementFactors: { x: 0, y: 0 },
  }
  const outline: GameRect = {
    _tag: "GameRect",
    x: x - 5,
    y: y - 5,
    width: width + 10,
    height: height + 10,
    style: `rgba(255,255,255,0.5)`,
    collidable: true,
    movementFactors: { x: 0, y: 0 },
  }
  return [
    outline,
    player,
  ]
}

let fpsState = [Date.now()]
type renderDebug = (gameState: GameState) => GameLayers
const renderDebug: renderDebug = (state) => {
  const {
    context,
    time,
    playerPosition,
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
    text: `Player: ${playerPosition.x} x ${playerPosition.y}`,
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

const gameLayers = [
  renderSky,
  renderSun,
  renderClouds,
  renderGrass,
  renderDebug,
  renderPlayer,
]

type renderThoseLayers = (state: GameState) => void
const renderThoseLayers: renderThoseLayers = (state) => {
  const layers = gameLayers.map(layer => {
    try {
      return layer(state)
    } catch(e) {
      console.error(e)
      return []
    }
  }).flat()

  const visibleElems = layers.filter(elem => {
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

  const {
    screenPosition: { x: screenX, y: screenY }
  } = state
  visibleElems.forEach(gameElement => {
    const ge = { ...gameElement }
    const {
      x,
      y,
      movementFactors: { x: moveX, y: moveY },
    } = ge
    ge.x = x - screenX * moveX
    ge.y = y - screenY * moveY
    renderGameElement(state.context, ge)
  })
}

type attachKeyEvents = (
  scopedState: ScopedState<GameState>,
) => void
const attachKeyEvents: attachKeyEvents = (scopedState) => {
  let activeKeys: ActiveKeys = {
    keys: {},
  }
  window.addEventListener("keydown", (event) => {
    if (!(event.key in activeKeys.keys)) {
      const { time } = scopedState.getState()
      activeKeys.keys[event.key] = time
      setPartialState(scopedState, { activeKeys })
    }
  })
  window.addEventListener("keyup", (event) => {
    delete activeKeys.keys[event.key]
    setPartialState(scopedState, { activeKeys })
  })
}

type movement = (state: GameState) => Coord
const movement: movement = (state) => {
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
  } = state

  const f: (k: string) => number = k =>
    Math.min(1000, time - state.activeKeys.keys[k]) / 1000 * Math.PI / 2

  const moveUp = up in state.activeKeys.keys
    ? Math.sin(f(up)) * -10
    : 0
  const moveLeft = left in state.activeKeys.keys
    ? Math.sin(f(left)) * -10
    : 0
  const moveDown = down in state.activeKeys.keys
    ? Math.sin(f(down)) * 10
    : 0
  const moveRight = right in state.activeKeys.keys
    ? Math.sin(f(right)) * 10
    : 0

  const x = moveLeft + moveRight
  const y = moveUp + moveDown

  return {
    x,
    y,
  }
}

const initGame = (context: CanvasRenderingContext2D) => {
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
    playerPosition: { x: context.canvas.width / 2, y: 0 },
    screenPosition: { x: 0, y: 0 },
    settings: defaultSettings,
    activeKeys: {
      keys: {},
    },
    move: { x: 0, y: 0 },
  })

  attachKeyEvents(scopedState)

  const renderFrame = (now: number) => {
    const state = scopedState.getState()

    const delta = now - state.lastFrame
    state.time = now

    const {
      x: moveX,
      y: moveY,
    } = movement(state)

    if (delta > 75) {
      renderThoseLayers({
        ...state,
        move: {
          x: moveX,
          y: moveY,
        },
      })
      state.lastFrame = now
    }

    setPartialState(scopedState, {
      time: state.time,
      lastFrame: state.lastFrame,
      screenPosition: {
        x: state.screenPosition.x + moveX,
        y: state.screenPosition.y + moveY,
      },
    })
    window.requestAnimationFrame(renderFrame)
  }
  window.requestAnimationFrame(renderFrame)
}

type Game = () => React.ReactElement
const Game: Game = () => {
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
