import {
  GameElement,
  GameElements,
} from "./Texture"
import {
  Unique,
} from "./Types"
import {
  X, Y,
  fromCantor,
  toCantor,
  ceil,
  floor,
} from "./Math"
import * as Mathlib from "./Math"

export interface Coord {
  readonly [Unique.Newtype]: Unique.ChunkCoord
  x: X
  y: Y
}

export type Chunks<T> = {
  [cantorPair: number]: Array<T>
}

export const CHUNK_RATIO = 1 / 256

export const toCoord: (c: Mathlib.Coord) => Coord
  = (c) => ({ x: floor(c.x * CHUNK_RATIO), y: floor(c.y * CHUNK_RATIO) } as any as Coord)

export const fromCoord: (c: Coord) => Mathlib.Coord
  = (c) => ({ x: c.x * (1 / CHUNK_RATIO), y: c.y * (1 / CHUNK_RATIO) } as any as Mathlib.Coord)

type insert = <T>(chunks: Chunks<T>, c: Coord, elems: Array<T>) => Chunks<T>
export const insert: insert = (chunks, c, elems) => {
  const nat = toCantor(c)
  chunks[nat] = elems
  return chunks
}

type remove = <T>(chunks: Chunks<T>, c: Coord) => Chunks<T>
export const remove: remove = (chunks, c) => {
  const nat = toCantor(c)
  delete chunks[nat]
  return chunks
}

type append = <T>(chunks: Chunks<T>, c: Coord, elems: Array<T>) => Chunks<T>
export const append: append = (chunks, c, elems) => {
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

type getChunksInRadius = <T>(chunks: Chunks<T>, radius: number) => Chunks<T>
export const getChunksInRadius: getChunksInRadius = (chunks, radius) => {
  for (let i = 0; i < 10; i++) {
    for (let j = 0; j < 10; j++) {
      const nat = toCantor({
        x: cos(PI * 2 * i / 10) * radius as X,
        y: sin(PI * 2 * j / 10) * radius as Y,
      } as Coord)
    }
  }
  return chunks
}

type getElemsInRect = <T>(
  chunks: Chunks<T>,
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
      const nat = toCantor({ x: cx + x, y: cy + y } as Coord)
      if (chunks[nat]) {
        for (const elem of chunks[nat]) elems.push(elem)
      }
    }
  }

  return elems
}
