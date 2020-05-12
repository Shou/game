// the sikest file

import { Effects } from "./Effects"
import {
  Coord,
  Integer,
  Milliseconds,
  Natural,
  Seconds,
  X,
  Y,
} from "./Math"
import { ScopedState } from "./ScopedState"

export namespace Unique {
  export declare const Newtype: unique symbol
  export type X = { readonly 0: unique symbol }[0]
  export type Y = { readonly 0: unique symbol }[0]
  export type Integer = { readonly 0: unique symbol }[0]
  export type Milliseconds = { readonly 0: unique symbol }[0]
  export type Seconds = { readonly 0: unique symbol }[0]
  export type Natural = { readonly 0: unique symbol }[0]
}

export type Newtype<A, B> = A & { readonly [Unique.Newtype]: B }

export const coerce = <A, B, C>(newtype: Newtype<A, B>) =>
  newtype as unknown as Newtype<A, C>

// Inspired by Conon McBride's "Control.Newtype"
// https://hackage.haskell.org/package/newtype-0.2.2.0/docs/Control-Newtype.html
// https://pursuit.purescript.org/packages/purescript-newtype/3.0.0/docs/Data.Newtype
export const wrap = <A, B>(a: A) =>
  a as Newtype<A, B>

export const unwrap = <A, B>(newtype: Newtype<A, B>) =>
  newtype as A

export const over: <A, B>(newtype: Newtype<A, B>, f: (a: A) => A) => Newtype<A, B>
  = (newtype, f) => wrap(f(unwrap(newtype)))

export interface Dimensions {
  width: X
  height: Y
}

export interface Style {
  style?: string
}

export interface Filter {
  filter?: string
}

export type CoreElement = {
  collidable: boolean,
  movementFactors: Coord,
  position?: "center" | "top-left",
  layer: Natural,
} & Coord & Dimensions & Filter

export type GameImage = {
  readonly _tag: "GameImage",
  image: HTMLImageElement,
} & CoreElement & Style

export interface Font {
  family: string
  size: number
}

export type GameText = {
  readonly _tag: "GameText",
  font: Font,
  text: string,
} & CoreElement & Style

export type GameRect = {
  readonly _tag: "GameRect",
} & CoreElement & Style

export interface GradientStop {
  offset: number
  color: string
}

export type GameLinearGradient = {
  readonly _tag: "GameLinearGradient"
  colorStops: Array<GradientStop>
  start: Coord
  stop: Coord
} & CoreElement

export type GameElement
  = GameImage
  | GameText
  | GameRect
  | GameLinearGradient

export type GameElements = Array<GameElement>

export interface Keybindings {
  up: string
  left: string
  down: string
  right: string
  jump: string
  sprint: string
  zoom: string
}

export interface Settings {
  keybindings: Keybindings
  fps: number
  seed: number
}

export const defaultSettings = {
  keybindings: {
    up: "w",
    left: "a",
    down: "s",
    right: "d",
    jump: " ",
    sprint: "Shift",
    zoom: "m",
  },
  fps: 30,
  seed: Math.floor(Math.random() * 10),
}

export type UserSettings = {
  [K in keyof Settings]?: {
    [Sk in keyof Settings[K]]: Settings[K][Sk]
  }
}

export interface ActiveKeys {
  [key: string]: Milliseconds
}

export type Player = {
  velocity: Coord,
  airborne: boolean,
} & Coord & Dimensions

export interface GameState {
  readonly context: CanvasRenderingContext2D
  dimensions: Dimensions
  time: { now: Milliseconds, previous: Milliseconds }
  lastFrame: Milliseconds
  player: Player
  screen: Coord
  settings: Settings
  activeKeys: ActiveKeys
  zoom: number
  chunks: GameChunks
  readonly effects: ScopedState<{ effects: Effects }>
}

export type MutableGameState = Omit<GameState, "context" | "effects">

export type GameChunks = {
  [cantorPair: number]: Array<GameElement>
}
