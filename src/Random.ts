import {
  Coord,
  X, Y,
  abs,
  diff,
  round,
} from "./Math"
import {
} from "./Types"
import Prando from "prando"

const { min, cos, sin, PI } = Math

type walk = (t: number, r: Y, m: Y, rand: () => number) => Array<Coord>
export const walk: walk = (t, r, m, rand) => {
  let acc: Array<Coord> = [ { x: 0, y: m } as Coord ]
  for (let i = 0; i < t; i++) {
    const ry = rand() * r * 2 - r
    const { x: oldX, y: oldY } = acc[acc.length - 1]
    acc.push({
      x: oldX + 1 as X,
      y: oldY + ry as Y,
    } as Coord)
  }
  return acc
}

type walk2D = (t: number, r: number, m: X, rand: () => number) => Array<Coord>
export const walk2D: walk2D = (t, r, m, rand) => {
  let acc: Array<Coord> = [ { x: m, y: 0 } as Coord ]
  for (let i = 0; i < t; i++) {
    const [rx, ry] = [1,2].map(_ => rand() * PI * 2)
    const { x: oldX, y: oldY } = acc[acc.length - 1]
    const [x, y] = [r * cos(rx) + oldX, r * sin(ry) + oldY]
    acc.push({ x, y } as any as Coord)
  }
  return acc
}
