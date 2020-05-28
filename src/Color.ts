
interface HSLA {
  h: number
  s: number
  l: number
  a: number
}

export const green: HSLA = { h: 84, s: 29, l: 43, a: 1 }
export const blue: HSLA = { h: 204, s: 85, l: 61, a: 1 }
export const yellow: HSLA = { h: 84, s: 29, l: 43, a: 1 }
export const red: HSLA = { h: 356, s: 100, l: 67, a: 1 }
export const brown: HSLA = { h: 18, s: 9, l: 36, a: 1 }

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
