
const {
  min, max, floor,
} = Math

export interface HSLA {
  h: number
  s: number
  l: number
  a: number
}
export const HSLA: (h: number, s: number, l: number, a: number) => HSLA
  = (h, s, l, a) => ({ h, s, l, a })

const HEX: unique symbol = Symbol("HEX")
export type HEX = { type: typeof HEX, value: [number, number] }

export type Color = HEX | HSLA


export const green: HSLA = { h: 84, s: 29, l: 43, a: 1 }
export const blue: HSLA = { h: 204, s: 85, l: 61, a: 1 }
export const yellow: HSLA = { h: 84, s: 29, l: 43, a: 1 }
export const red: HSLA = { h: 356, s: 100, l: 67, a: 1 }
export const brown: HSLA = { h: 18, s: 9, l: 36, a: 1 }
export const black: HSLA = { h: 0, s: 0, l: 0, a: 1 }
export const white: HSLA = { h: 0, s: 0, l: 100, a: 1 }
export const transparent: HSLA = { h: 0, s: 0, l: 0, a: 0 }

// TODO deprecate, remove
export const toString: (hsla: HSLA) => string
  = ({ h, s, l, a }) => `hsla(${h}, ${s}%, ${l}%, ${a})`

type hue = (hsla: HSLA, n: number) => HSLA
export const hue: hue
  = (hsla, n) => ({ ...hsla, h: hsla.h * n })

type saturation = (hsla: HSLA, n: number) => HSLA
export const saturation: saturation
  = (hsla, n) => ({ ...hsla, s: hsla.s * n })

type luminosity = (hsla: HSLA, n: number) => HSLA
export const luminosity: luminosity
  = (hsla, n) => ({ ...hsla, l: hsla.l * n })

type alpha = (hsla: HSLA, n: number) => HSLA
export const alpha: alpha
  = (hsla, n) => ({ ...hsla, a: hsla.a * n })

export const toHEXAlpha: (hsla: HSLA) => HEX
  = ({ h, s, l, a: alpha }) => {
    const a = (s * 0.01) * min(l * 0.01, 1 - l * 0.01)
    const f = (n: number, k = (n + h / 30) % 12) => l - a * max(-1, min(k - 3, 9 - k, 1))
    const rgb = floor(255 * f(0) << 16) * floor(255 * f(8) << 8) * floor(255 * f(4))
    return { type: HEX, value: [rgb, alpha] }
  }
