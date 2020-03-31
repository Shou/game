
import * as React from "react"

import sun from "../assets/sun.png"
import grass from "../assets/grass.png"
console.log(sun, "sun")
console.log(grass, "grass")


interface GameState {
  context: CanvasRenderingContext2D
  time: number
}


// 60 seconds
const DAY_CYCLE: number = 60 * Math.pow(10, 6)


type renderSky = (state: GameState) => void
const renderSky: renderSky = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  // wizard magic
  // g n = if n >= 0.2 && n < 0.3 || n > 0.7 && n < 0.8 then max 0 $ sin (n * pi * 2 * 8) * 255 else 0
  const red = t >= 0.2 && t < 0.3 || t > 0.7 && t < 0.8
    ? Math.max(0, Math.sin(t * Math.PI * 2 * 8)) * 255
    : 0
  // h n = max 0 $ sin (n * pi * 2 / 2 - 0.075) * 255 - 128
  const green = Math.max(0, Math.sin(t * Math.PI * 2 / 2 - 0.075) * 255 - 128)
  // f n = min 255 $ max 0.1 (sin (n * pi * 1.8 - 1.4) * 2) * 255
  const blue = Math.min(255, Math.max(0.1, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 255)

  const gradient = context.createLinearGradient(0, 0, 0, context.canvas.height)
  gradient.addColorStop(0, `rgb(0,${green},${blue})`)
  gradient.addColorStop(1, `rgb(${red},${green},${blue})`)

  context.fillStyle = gradient
  context.fillRect(0, 0, context.canvas.width, context.canvas.height)

  context.fillStyle = `rgb(${red},0,0)`
  context.fillRect(0, 0, 50, 50)
  context.fillStyle = `rgb(0,0,${blue})`
  context.fillRect(50, 0, 50, 50)
  context.font = "30px Open Sans Mono"
  context.fillText(`Time: ${(t * 100).toFixed(1)}%; Red: ${red.toFixed(1)}; Blue: ${blue.toFixed(1)}`, 100, 40)
}

type renderSun = (state: GameState) => void
const renderSun: renderSun = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE
  const radius = Math.min(context.canvas.width, context.canvas.height) / 1.5
  const [originX, originY] = [context.canvas.width / 2, context.canvas.height - 1]
  const [x, y] = [
    Math.sin(Math.PI * 2 * t) * radius + originX,
    Math.cos(Math.PI * 2 * t) * radius + originY,
  ]

  const image = new Image()
  image.src = sun

  context.drawImage(image, x, y, 150, 150)
}

const brightness: (t: number) => number = t => Math.max(0.3, Math.sin(t * Math.PI * 1.8 - 1.4) * 2) * 100

type renderGrass = (state: GameState) => void
const renderGrass: renderGrass = ({ context, time }) => {
  const t = (time % DAY_CYCLE) / DAY_CYCLE

  context.filter = `brightness(${brightness(t)}%)`

  const image = new Image()
  image.src = grass

  for (let i = 0; i < context.canvas.width / 100; i++) {
    context.drawImage(
      image,
      i * 100,
      context.canvas.height - 100,
      100,
      100,
    )
  }
}

const initGame = (context: CanvasRenderingContext2D) => {
  let state: GameState = {
    context,
    time: 0
  }
  const render = (now: number) => {
    const delta = state.time - now
    state.time += now

    if (delta > 1000) {
      renderSky({ ...state })
      renderSun({ ...state })
      renderGrass({ ...state })
    }

    window.requestAnimationFrame(render)
  }
  window.requestAnimationFrame(render)
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
