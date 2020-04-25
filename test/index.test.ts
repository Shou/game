
import "jsdom-global/register"
import { X, Y, Coord } from "../src/Game"
import * as Game from "../src/Game"
import { isEqual } from "lodash"

interface Test {
  name: string
  f: () => Promise<void>
}

// lol who needs a testing framework when u can NIH
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
      "{ " + Object.keys(o).reduce(
        (acc, k) => {
          const v = typeof o[k] === "object" ? f(o[k]) : o[k]
          return acc.concat([`${k}: ${v}`])
        },
        [] as Array<string>
      ).join(", ") + " }"
    throw new Error(`Objects not equal:\n\tResult: ${f(a)}\n\tWanted: ${f(b)}`)
  }
})


const context: CanvasRenderingContext2D = {
  canvas: {
    width: 1600,
    height: 900,
  },
} as CanvasRenderingContext2D

const defaultGameState: Game.GameState = {
  context,
  time: 0,
  lastFrame: 0,
  player: {
    x: 0 as X,
    y: 0 as Y,
    width: 100 as X,
    height: 100 as Y,
    velocity: { x: 0, y: 0 } as Coord,
    // Gravity should be tested independently
    airborne: false,
  },
  screen: { x: 0, y: 0 } as Coord,
  settings: Game.defaultSettings,
  activeKeys: {},
  move: { x: 0, y: 0 } as Coord,
}


test("Should collide: +x, +y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: defaultGameState.player.width * 0.5 + 55 as X,
    y: defaultGameState.player.height * 0.5 + 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: 10, y: 10} as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: 5, y: 5 } as Coord)
})
test("Should collide: +x, -y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: defaultGameState.player.width * 0.5 + 55 as X,
    y: -defaultGameState.player.height * 0.5 - 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: 10, y: -10} as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: 5, y: -5 } as Coord)
})
test("Should collide: -x, -y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: -defaultGameState.player.width * 0.5 - 55 as X,
    y: -defaultGameState.player.height * 0.5 - 55 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: -10, y: -10} as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: -5, y: -5 } as Coord)
})
test("Should collide: -x, +y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: -105 as X,
    y: 105 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  //console.log(`x: ${rect.x}, y: ${rect.y}`, "rect")
  //console.log(`x: ${defaultGameState.player.x}, y: ${defaultGameState.player.y}`, "player")
  const keyMove = { x: -10, y: 10} as Coord
  //console.log(`x: ${keyMove.x}, y: ${keyMove.y}`, "keyMove")
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: -5, y: 5 } as Coord)
})
test("Should collide: +x", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: 105 as X,
    y: 0 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: 10, y: 0 } as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({x, y }, { x: 5, y: 0 } as Coord)
})
test("Should collide: -x", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: -105 as X,
    y: 0 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: -10, y: 0 } as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({x, y }, { x: -5, y: 0 } as Coord)
})
test("Should collide: +y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: 0 as X,
    y: 105 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: 0, y: 10 } as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({x, y }, { x: 0, y: 5 } as Coord)
})
test("Should collide: -y", async () => {
  const rect: Game.GameRect = {
    _tag: "GameRect",
    x: 0 as X,
    y: -105 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: 0, y: -10 } as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: 0, y: -5 } as Coord)
})
test("Should fall onto block and stay still", async () => {
})

runTests()
