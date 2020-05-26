import {
  ChunkCoord,
} from "./Chunks"
import {
  Unique,
  MkNewtype,
  Newtype,
  coerce,
  wrap,
} from "./Types"


export const diff: <A>(a: Newtype<number, A>, b: Newtype<number, A>) => Newtype<number, A>
  = (a, b) => wrap(a - b)

export const sum: <A>(...as: Array<Newtype<number, A>>) => Newtype<number, A>
  = (...as) => {
    let acc = 0
    for (const a of as) acc += a
    return wrap(acc)
  }

export const mult: <A>(a: Newtype<number, A>, b: Newtype<number, A>) => Newtype<number, A>
  = (a, b) => wrap(a * b)

export type X = number & MkNewtype<Unique.X>
export type Y = number & MkNewtype<Unique.Y>

export type Milliseconds = number & MkNewtype<Unique.Milliseconds>
export type Seconds = number & MkNewtype<Unique.Seconds>

export const toSeconds: (ms: Milliseconds) => Seconds
  = (ms) => ms * 0.001 as Seconds

export const fromSeconds: (ss: Seconds) => Milliseconds
  = (ss) => ss * 1000 as Milliseconds

export type Integer = number & MkNewtype<Unique.Integer>

export const floor: <A>(n: number & A) => Integer
  = (n) => Math.floor(n) as Integer

export const ceil: <A>(n: number & A) => Integer
  = (n) => Math.ceil(n) as Integer

export const round: <A>(n: number & A) => Integer
  = (n) => Math.round(n) as Integer

export const sign: <A>(n: number & A) => Integer
  = (n) => Math.sign(n) as Integer

// Maybe we can make this polymorphic so that we have e.g. Natural<Integer>
export type Natural = number & MkNewtype<Unique.Natural>
export type NaturalP<A extends number> = A & MkNewtype<Unique.Natural>

export const abs: <A>(n: number & A) => Natural
  = (n) => Math.abs(n) as Natural

export const sqrt: (n: Natural) => Natural
  = (n) => Math.sqrt(n) as Natural

export const PI: Natural
  = Math.PI as Natural

export interface Coord {
  readonly [Unique.Newtype]: Unique.Coord
  x: X
  y: Y
}


// Cantor pair and a bijection from integer to natural because cantor pairs
// only deal in absolutes
type toCantor = (c: ChunkCoord) => Natural
export const toCantor: toCantor = ({ x, y }) => {
  const aNat = x >= 0 ? x * 2 : -x * 2 - 1
  const bNat = y >= 0 ? y * 2 : -y * 2 - 1
  return 0.5 * (aNat + bNat) * (aNat + bNat + 1) + bNat as any as Natural
}

type fromCantor = (c: Natural) => ChunkCoord
export const fromCantor: fromCantor = (c) => {
  const w = floor(0.5 * (sqrt(8 * c + 1 as Natural) - 1))
  const t = w * (w + 1) * 0.5
  const yNat = c - t
  const xNat = w - yNat
  return {
    x: coerce(floor(xNat % 2 === 0 ? xNat * 0.5 : -(xNat + 1) * 0.5)),
    y: coerce(floor(yNat % 2 === 0 ? yNat * 0.5 : -(yNat + 1) * 0.5)),
  } as any as ChunkCoord
}

export const dot: (left: [X, Y], right: [X, Y]) => number
  = (left, right) => left.reduce((acc, a, i) => acc + a * right[i], 0)

type shuffle = <A>(list: Array<A>, rand: () => number) => Array<A>
export const shuffle: shuffle = (list, rand) =>
  list
    .map(value => ({ sort: rand(), value }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value)

// Inclusive range
export const range: (a: Integer, b: Integer) => Array<Integer>
  = (a, b) => {
    let acc: Array<Integer> = []
    const d = b - a
    for (let i = a; i !== b + 1 * sign(d); i = i + 1 * sign(d) as Integer) {
      acc.push(i)
    }
    return acc
  }
