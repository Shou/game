
import "jsdom-global/register"
import { X, Y, Coord, Player, GameState, GameRect } from "../src/Game"
import * as Game from "../src/Game"
import { isEqual, range } from "lodash"

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

const defaultGameState: GameState = {
  context,
  time: { now: 0, previous: 0 },
  lastFrame: 0,
  player: {
    x: 0 as X,
    y: 0 as Y,
    width: 100 as X,
    height: 100 as Y,
    velocity: { x: 0, y: 0 } as Coord,
    // Gravity should be tested independently
    airborne: false,
    effects: [],
  },
  screen: { x: 0, y: 0 } as Coord,
  settings: Game.defaultSettings,
  activeKeys: {},
}


test("Should collide: +x, +y", async () => {
  const rect: GameRect = {
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
  const rect: GameRect = {
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
  const rect: GameRect = {
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
  const rect: GameRect = {
    _tag: "GameRect",
    x: -105 as X,
    y: 105 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }
  const keyMove = { x: -10, y: 10} as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, [ rect ])

  assertEqual({ x, y }, { x: -5, y: 5 } as Coord)
})
test("Should collide: +x", async () => {
  const rect: GameRect = {
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
  const rect: GameRect = {
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
  const rect: GameRect = {
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
  const rect: GameRect = {
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
test("Should collide with _two_ elements, +x, +y", async () => {
  console.log("-------------------")
  const rects: Array<GameRect> = [
    {
      _tag: "GameRect",
      x: 0 as X,
      y: 105 as Y,
      width: 100 as X,
      height: 100 as Y,
      collidable: true,
      movementFactors: { x: 1, y: 1 } as Coord,
    },
    {
      _tag: "GameRect",
      x: 105 as X,
      y: 0 as Y,
      width: 100 as X,
      height: 100 as Y,
      collidable: true,
      movementFactors: { x: 1, y: 1 } as Coord,
    },
  ]
  const keyMove = { x: 10, y: 10 } as Coord
  const { x, y } = Game.collisionResolution(keyMove, defaultGameState, rects)

  assertEqual({ x, y }, { x: 5, y: 5 } as Coord)
})
/*
test("Should fall with gravity onto block and stay still", async () => {
  //console.log("-----------------")
  let state: GameState = {
    ...defaultGameState,
    time: { now: 1000, previous: 0 },
    player: {
      ...defaultGameState.player,
      airborne: true,
    },
  }

  const rect: GameRect = {
    _tag: "GameRect",
    x: 0 as X,
    y: 105 as Y,
    width: 100 as X,
    height: 100 as Y,
    collidable: true,
    movementFactors: { x: 1, y: 1 } as Coord,
  }

  for (const i in range(1, 10)) {
    const keyMove = Game.movement(state)
    //console.log(keyMove, "keyMove")
    const movedPlayer = Game.collisionResolution(keyMove, state, [ rect ])
    //console.log(movedPlayer, "movedPlayer")
    state = {
      ...state,
      player: {
        ...state.player,
        ...movedPlayer,
      },
    }
  }

  assertEqual(
    state.player,
    { x: 0, y: 5, width: 100, height: 100, velocity: { x: 0, y: 0 }, airborne: false } as Player,
  )
})
*/

runTests()
