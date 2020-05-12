
import {
  Unique,
  Newtype,
  wrap,
} from "./Types"


export type X = Newtype<number, Unique.X>
export type Y = Newtype<number, Unique.Y>

export type Integer = Newtype<number, Unique.Integer>

export type Milliseconds = Newtype<number, Unique.Milliseconds>
export type Seconds = Newtype<number, Unique.Seconds>

export const toSeconds: (ms: Milliseconds) => Seconds
  = (ms) => ms / 1000 as Seconds

export const fromSeconds: (ss: Seconds) => Milliseconds
  = (ss) => ss * 1000 as Milliseconds

export const diff: <A>(a: Newtype<number, A>, b: Newtype<number, A>) => Newtype<number, A>
  = (a, b) => wrap(a - b)

export const floor = <A>(n: number & A) => Math.floor(n) as Integer
export const ceil = <A>(n: number & A) => Math.ceil(n) as Integer
export const round = <A>(n: number & A) => Math.round(n) as Integer

export type Natural = Newtype<Integer, Unique.Natural>

export const natural: <A>(n: number & A) => Natural
  = (n) => Math.max(0, n) as Natural

export interface Coord {
  x: X
  y: Y
}


// Cantor pair and a bijection from integer to natural because cantor pairs
// only deal in absolutes
type cantor = (a: Integer, b: Integer) => Natural
export const cantor: cantor = (a, b) => {
  const aNat = a >= 0 ? a * 2 : -a * 2 - 1
  const bNat = b >= 0 ? b * 2 : -b * 2 - 1
  return natural(0.5 * (aNat + bNat) * (aNat + bNat + 1) + bNat)
}

export const dot: (left: [X, Y], right: [X, Y]) => number
  = (left, right) => left.reduce((acc, a, i) => acc + a * right[i], 0)

type shuffle = <A>(list: Array<A>, rand: () => number) => Array<A>
export const shuffle: shuffle = (list, rand) =>
  list
    .map(value => ({ sort: rand(), value }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value)
