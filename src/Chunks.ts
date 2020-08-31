import {
  GameElement,
  GameElements,
} from "./Texture"
import {
  Unique,
} from "./Types"
import {
  Coord,
  X, Y,
  fromCantor,
  toCantor,
  ceil,
  floor,
} from "./Math"

export interface ChunkCoord {
  readonly [Unique.Newtype]: Unique.ChunkCoord
  x: X
  y: Y
}

export type GameChunks<T> = {
  [cantorPair: number]: Array<T>
}

export const CHUNK_RATIO = 1 / 256

export const toChunkCoord: (c: Coord) => ChunkCoord
  = (c) => ({ x: floor(c.x * CHUNK_RATIO), y: floor(c.y * CHUNK_RATIO) } as any as ChunkCoord)

export const fromChunkCoord: (c: ChunkCoord) => Coord
  = (c) => ({ x: c.x * (1 / CHUNK_RATIO), y: c.y * (1 / CHUNK_RATIO) } as any as Coord)

type insertChunk = <T>(chunks: GameChunks<T>, c: ChunkCoord, elems: Array<T>) => GameChunks<T>
export const insertChunk: insertChunk = (chunks, c, elems) => {
  const nat = toCantor(c)
  chunks[nat] = elems
  return chunks
}

type deleteChunk = <T>(chunks: GameChunks<T>, c: ChunkCoord) => GameChunks<T>
export const deleteChunk: deleteChunk = (chunks, c) => {
  const nat = toCantor(c)
  delete chunks[nat]
  return chunks
}

type appendChunk = <T>(chunks: GameChunks<T>, c: ChunkCoord, elems: Array<T>) => GameChunks<T>
export const appendChunk: appendChunk = (chunks, c, elems) => {
  const nat = toCantor(c)
  if (chunks[nat]) {
    for (let i = 0; i < elems.length; i++) {
      chunks[nat].push(elems[i])
    }
  } else {
    chunks[nat] = elems
  }
  return chunks
}

const {
  PI, cos, sin
} = Math

type getChunksInRadius = <T>(chunks: GameChunks<T>, radius: number) => GameChunks<T>
export const getChunksInRadius: getChunksInRadius = (chunks, radius) => {
  console.log(toCantor)
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const nat = toCantor({
        x: cos(PI * 2 * i / 10) * radius as X,
        y: sin(PI * 2 * j / 10) * radius as Y,
      } as ChunkCoord)
      console.log(nat, "getChunksInRadius " + i)
    }
  }
  return chunks
}

type getElemsInRect = <T>(
  chunks: GameChunks<T>,
  x: number,
  y: number,
  width: number,
  height: number,
) => Array<T>
export const getElemsInRect: getElemsInRect = (chunks, x, y, width, height) => {
  const elems = []

  const cx = floor(x * CHUNK_RATIO)
  const cy = floor(y * CHUNK_RATIO)
  const cw = ceil(width * CHUNK_RATIO)
  const ch = ceil(height * CHUNK_RATIO)

  for (let x = 0; x < cw; x++) {
    for (let y = 0; y < ch; y++) {
      const nat = toCantor({ x: cx + x, y: cy + y } as ChunkCoord)
      if (chunks[nat]) {
        for (const elem of chunks[nat]) elems.push(elem)
      }
    }
  }

  console.log(elems, "rect elems")
  return elems
}
