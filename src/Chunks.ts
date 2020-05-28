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
  toCantor,
  floor,
} from "./Math"

export interface ChunkCoord {
  readonly [Unique.Newtype]: Unique.ChunkCoord
  x: X
  y: Y
}

export type GameChunks = {
  [cantorPair: number]: GameElements
}

export const CHUNK_RATIO = 1 / 100

export const toChunkCoord: (c: Coord) => ChunkCoord
  = (c) => ({ x: floor(c.x * CHUNK_RATIO), y: floor(c.y * CHUNK_RATIO) } as any as ChunkCoord)

export const fromChunkCoord: (c: ChunkCoord) => Coord
  = (c) => ({ x: c.x * (1 / CHUNK_RATIO), y: c.y * (1 / CHUNK_RATIO) } as any as Coord)

type insertChunk = (chunks: GameChunks, c: ChunkCoord, elems: Array<GameElement>) => GameChunks
export const insertChunk: insertChunk = (chunks, c, elems) => {
  const nat = toCantor(c)
  return Object.assign(chunks, {
    [nat]: elems
  })
}

type deleteChunk = (chunks: GameChunks, c: ChunkCoord) => GameChunks
export const deleteChunk: deleteChunk = (chunks, c) => {
  const nat = toCantor(c)
  const copy = { ...chunks }
  delete copy[nat]
  return copy
}
