import {
  ChunkCoord,
  GameChunks,
  CHUNK_RATIO,
  deleteChunk,
  fromChunkCoord,
  insertChunk,
  toChunkCoord,
} from "./Chunks"
import * as Color from "./Color"
import {
  Coord,
  Integer,
  Natural,
  X, Y,
  abs,
  ceil,
  diff,
  floor,
  fromCantor,
  range,
  round,
  sqrt,
  toCantor,
} from "./Math"
import {
  CoreElem,
  GameArc,
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
  PI, min, max, cos, sin,
} = Math


// TODO cache n patterns/configurations to lessen perf impact
// TODO corners (and maybe lines?)
type mkEscher = (coord: Coord, radius: Natural) => Array<CoreElem<GameArc>>
const mkEscher: mkEscher = (coord, radius) => {
  const startAngle = floor(Math.random() * 4) * PI * 0.5
  const endAngle = startAngle + PI * 0.5
  const antiClockwise = false

  const density = max(0.5, ceil(Math.random() * 4) / 4)

  // center of the cone in the opposite direction
  const oppositeAngle = startAngle + PI * 1.25
  const corner = {
    x: coord.x + cos(oppositeAngle) * radius * sqrt(2 as Natural) as X,
    y: coord.y + sin(oppositeAngle) * radius * sqrt(2 as Natural) as Y,
  } as Coord

  const color = Color.luminosity(
    Color.saturation(
      Color.brown,
      0.1,
    ),
    1.2,
  )

  let es: Array<CoreElem<GameArc>> = []
  for (let i = 1; i >= density; i -= density) {
    es.push({
      texture: {
        type: "GameArc",
        radius: radius * i as Natural,
        startAngle,
        endAngle,
        antiClockwise,
        fill: false, // maybe?
        lineWidth: 1 as Natural,
        color,
        collidable: false,
        movementFactors: { x: 1 as X, y: 1 as Y } as Coord,
        layer: 33 as Natural,
      },
      coord: corner,
    })
  }

  return es
}

type mkGrassLeaf = (coord: Coord, radius: Natural) => CoreElem<GameArc>
const mkGrassLeaf: mkGrassLeaf = (coord, radius) => {
  const deg = 1
  const color = Color.luminosity(Color.green, 1)

  const texture: GameArc = {
    type: "GameArc",
    radius: radius,
    startAngle: PI * 2 - deg,
    endAngle: PI * 2,
    antiClockwise: false,
    fill: false,
    lineWidth: 2 as Natural,
    color,
    collidable: false,
    movementFactors: { x: 1 as X, y: 1 as Y } as Coord,
    layer: 33 as Natural,
  }

  return {
    texture,
    coord: {
      x: coord.x - radius as X,
      y: coord.y - radius as Y,
    } as Coord,
  }
}

type mkCaves = (seed: number, quantity: number) => {
  caves: GameChunks<GameElement>
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
    color: Color.brown,
    movementFactors: { x: 1, y: 1 } as Coord,
    collidable: true,
    layer: 32 as Natural,
  }

  let caves: GameChunks<GameElement> = {}
  for (let ix = x; ix < x + width; ix++) {
    for (let iy = y; iy < height; iy++) {
      if (!walkSet.has(`${ix}x${iy}`)) {
        const coord = {
          x: ix * 100 as X,
          y: iy * 100 as Y,
        } as Coord

        const scribbles: Array<CoreElem<GameArc>>
          = mkEscher(coord, 50 as Natural)

        caves = insertChunk(caves, toChunkCoord(coord), [
          {
            texture,
            coord,
          },
          ...scribbles,
        ])
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
  grasses: GameChunks<GameElement>
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
    color: Color.green,
    movementFactors: { x: 1, y: 1 } as Coord,
    collidable: true,
    layer: 32 as Natural,
  }

  let grasses: GameChunks<GameElement> = {}
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
        grasses = insertChunk(grasses, toChunkCoord(coord), [
          {
            texture,
            coord,
          },
          mkGrassLeaf(coord, 50 as Natural)
        ])
      }
    }
  }

  return {
    grasses,
    dimensions: {} as any, // TODO not necessary yet?
  }
}

let world: GameChunks<GameElement> = []
type renderWorld = (state: GameState) => GameChunks<GameElement>
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
      cavesMaskedGrass = insertChunk(cavesMaskedGrass, coord, grasses[key])
    }

    world = cavesMaskedGrass
  }

  return world
}
