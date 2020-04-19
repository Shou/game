
import "jsdom-global/register"
import { X, Y, Coord } from "../src/Game"
import * as Game from "../src/Game"
import { isEqual } from "lodash"

interface Test {
  name: string
  f: () => Promise<void>
}

let tests: Array<Test> = []
const test: (name: string, f: () => Promise<void>) => void = (name, f) => tests.push({ name, f })
const runTests: () => void = () => tests.forEach(({ name, f }, i) => {
  f().catch(e => console.log(`${i + 1}. ${name}\n`, e.toString()))
})

type assertEqual = <A>(a: {} & A, b: {} & A) => void
const assertEqual: assertEqual = ((a, b) => {
  if (!isEqual(a, b)) {
    type f = (o: any) => string
    const f: f = o =>
      Object.keys(o).reduce(
        (acc, k) => acc.concat([`${k}: ${o[k]}`]),
        [] as Array<string>
      ).join(", ")
    throw new Error(`Objects not equal:\n\tResult: ${f(a)}\n\tWanted: ${f(b)}`)
  }
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
    x: 0 as X,
    y: 0 as Y,
    width: 50 as X,
    height: 100 as Y,
    velocity: { x: 0, y: 0 } as Coord,
  },
  screen: { x: 0, y: 0 } as Coord,
  settings: Game.defaultSettings,
  activeKeys: {},
  move: { x: 0, y: 0 } as Coord,
}


test("Should collide: +x, +y", async () => {
  const movementState = Object.assign(defaultGameState, {
    time: 1000,
    activeKeys: {
      [Game.defaultSettings.keybindings.right]: 0,
      [Game.defaultSettings.keybindings.down]: 0,
    },
  })
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: movementState.player.width * 0.5 + 55 as X,
    y: movementState.player.height * 0.5 + 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = Game.movement(movementState)
  const move = Game.collisionResolution(keyMove, movementState, [ rect ])

  assertEqual(move, { x: 5, y: 5 } as Coord)
})
test("Should collide: +x, -y", async () => {
  const movementState = Object.assign(defaultGameState, {
    time: 1000,
    activeKeys: {
      [Game.defaultSettings.keybindings.right]: 0,
      [Game.defaultSettings.keybindings.up]: 0,
    },
  })
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: movementState.player.width * 0.5 + 55 as X,
    y: -movementState.player.height * 0.5 - 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = Game.movement(movementState)
  const move = Game.collisionResolution(keyMove, movementState, [ rect ])

  assertEqual(move, { x: 5, y: -5 } as Coord)
})
test("Should collide: -x, -y", async () => {
  const movementState = Object.assign(defaultGameState, {
    time: 1000,
    activeKeys: {
      [Game.defaultSettings.keybindings.left]: 0,
      [Game.defaultSettings.keybindings.up]: 0,
    },
  })
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: -movementState.player.width * 0.5 - 55 as X,
    y: -movementState.player.height * 0.5 - 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = Game.movement(movementState)
  const move = Game.collisionResolution(keyMove, movementState, [ rect ])

  assertEqual(move, { x: -5, y: -5 } as Coord)
})
test("Should collide: -x, +y", async () => {
  const movementState = Object.assign(defaultGameState, {
    time: 1000,
    activeKeys: {
      [Game.defaultSettings.keybindings.left]: 0,
      [Game.defaultSettings.keybindings.down]: 0,
    },
  })
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: -movementState.player.width * 0.5 - 55 as X,
    y: movementState.player.height * 0.5 + 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  //console.log(`x: ${rect.x}, y: ${rect.y}`, "rect")
  //console.log(`x: ${movementState.player.x}, y: ${movementState.player.y}`, "player")
  const keyMove = Game.movement(movementState)
  //console.log(`x: ${keyMove.x}, y: ${keyMove.y}`, "keyMove")
  const move = Game.collisionResolution(keyMove, movementState, [ rect ])

  assertEqual(move, { x: -5, y: 5 } as Coord)
})

runTests()
