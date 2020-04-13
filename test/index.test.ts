
import "jsdom-global/register"
import * as Game from "../src/Game"

interface Test {
  name: string
  f: () => Promise<void>
}

let tests: Array<Test> = []
const test: (name: string, f: () => Promise<void>) => void = (name, f) => tests.push({ name, f })
const runTests: () => void = () => tests.forEach(({ name, f }, i) => {
  f().catch(e => console.log(`${i}. ${name}: ${e.toString()}`))
})


const context: CanvasRenderingContext2D = {
  canvas: {
    width: 1920,
    height: 1080,
  },
} as CanvasRenderingContext2D

const defaultGameState: Game.GameState = {
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
  settings: Game.defaultSettings,
  activeKeys: {
    keys: {},
  },
  move: { x: 0, y: 0 },
}


test("Should collide", async () => {
  const movementState = Object.assign(defaultGameState, {
    time: 1000,
    keys: {
      [Game.defaultSettings.keybindings.right]: 0,
      [Game.defaultSettings.keybindings.down]: 0,
    },
  })
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: context.canvas.width * 0.5 - 5,
    y: context.canvas.height * 0.5 - 5,
    width: 100,
    height: 100,
    collidable: true,
    movementFactors: { x: 1, y: 1 },
  }
  const move = Game.movement(movementState, [ rect ])
  console.log(`x: ${move.x}, y: ${move.y}`)
})

runTests()
