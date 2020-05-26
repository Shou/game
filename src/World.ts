import {
  ChunkCoord,
  GameChunks,
  CHUNK_RATIO,
  deleteChunk,
  fromChunkCoord,
  insertChunk,
  toChunkCoord,
} from "./Chunks"
import * as Colors from "./Colors"
import {
  Coord,
  Integer,
  Natural,
  X, Y,
  abs,
  diff,
  floor,
  fromCantor,
  range,
  round,
  toCantor,
} from "./Math"
import {
  CoreElem,
  GameElement,
  GameElements,
  GameRect,
  Rectangle,
} from "./Texture"
import {
  GameState,
  coerce,
  mapCoerce,
  unwrap,
  wrap,
} from "./Types"
import * as Random from "./Random"
import { DAY_CYCLE } from "./Scenery"

import Prando from "prando"
import { sortBy } from "ramda"

const {
  min, max,
} = Math


type mkCaves = (seed: number, quantity: number) => {
  caves: GameChunks
  dimensions: Coord & Rectangle
}
const mkCaves: mkCaves = (seed, quantity) => {
  const rng = new Prando(seed)
  const walk = Random.walk2D(quantity, 2, 10 as X, () => rng.next(0, 1))

  let minX = 0
  let maxX = 0
  let minY = 0
  let maxY = 0
  for (const c of walk) {
    minX = min(c.x, minX)
    maxX = max(c.x, maxX)
    minY = min(c.y, minY)
    maxY = max(c.y, maxY)
  }

  const x = round(minX - (minX + maxX) * 0.5)
  const width = round(maxX - minX)

  const y = 0
  const height = round(maxY - minY)

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

  const texture: GameRect = {
    type: "GameRect",
    width: 100 as X,
    height: 100 as Y,
    style: Colors.toString(Colors.brown),
    movementFactors: { x: 1, y: 1 } as Coord,
    collidable: true,
    layer: 32 as Natural,
  }

  let caves: GameChunks = {}
  for (let ix = x; ix < x + width; ix++) {
    for (let iy = y; iy < height; iy++) {
      if (!walkSet.has(`${ix}x${iy}`)) {
        const coord = {
          x: ix * 100 as X,
          y: iy * 100 as Y,
        } as Coord
        caves = insertChunk(caves, toChunkCoord(coord), {
          texture,
          coord,
        })
      }
    }
  }

  return {
    caves,
    dimensions: {
      x: x * 100 as X,
      y: 0 as Y,
      width: width * 100 as X,
      height: height * 100 as Y,
    } as Coord & Rectangle,
  }
}

type mkGrass = (seed: number, quantity: number, start: number) => {
  grasses: GameChunks
  dimensions: Coord & Rectangle
}
const mkGrass: mkGrass = (seed, quantity, start) => {
  const rng = new Prando(seed)
  const walk = Random.walk(quantity, 1 as Y, 0 as Y, () => rng.next(0, 1))

  const width = 100 as X
  const height = 100 as Y

  const texture: GameRect = {
    type: "GameRect",
    width,
    height,
    style: "green",
    movementFactors: { x: 1, y: 1 } as Coord,
    collidable: true,
    layer: 32 as Natural,
  }

  let grasses: GameChunks = {}
  for (let i = 0; i < walk.length; i++) {
    const { x, y } = walk[i]

    const oldX = i > 0 ? round(walk[i - 1].x) : 0 as Integer
    const oldY = i > 0 ? round(walk[i - 1].y) : 0 as Integer

    for (const ix of range(round(oldX), round(x))) {
      for (const iy of range(round(oldY), round(y))) {
        const coord = {
          x: start + ix * width as X,
          y: iy * height as Y,
        } as Coord
        grasses = insertChunk(grasses, toChunkCoord(coord), {
          texture,
          coord,
        })
      }
    }
  }

  return {
    grasses,
    dimensions: {} as any, // TODO not necessary yet?
  }
}

let world: GameChunks = []
type renderWorld = (state: GameState) => GameChunks
export const renderWorld: renderWorld = (state) => {
  if (Object.keys(world).length === 0) {
    const {
      settings: { seed },
    } = state

    const {
      caves,
      dimensions: { x },
    } = mkCaves(seed, 2000)
    const {
      grasses,
    } = mkGrass(seed, 100, x)
    console.log(grasses, `mkGrass(seed, 100, ${x})`)
    console.log(toCantor, fromCantor)

    let cavesMaskedGrass = caves
    for (const key in grasses) {
      const c = parseInt(key) as Natural
      const coord: ChunkCoord = fromCantor(c)
      let hasCaveAbove = coord.y >= 0
      let j = 1 as Y
      while (hasCaveAbove) {
        const up: ChunkCoord = { ...coord, y: diff(coord.y, j) }
        if (toCantor(up) in caves) {
          console.log(`${up.x} x ${up.y}`, "deleted")
          cavesMaskedGrass = deleteChunk(caves, up)
        } else {
          hasCaveAbove = up.y >= 0
        }
        j++
      }
    }
    for (const key in grasses) {
      const coord = fromCantor(parseInt(key) as Natural)
      cavesMaskedGrass = insertChunk(cavesMaskedGrass, coord, grasses[key][0])
    }

    world = cavesMaskedGrass
  }

  return world
}
