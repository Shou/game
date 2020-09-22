// the sikest file

import {
  Chunks,
} from "./Chunks"
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
import {
  GameElement,
  GameTexture,
  Rectangle,
} from "./Texture"

export namespace Unique {
  export declare const Newtype: unique symbol
  export type X = { readonly 0: unique symbol}[0]
  export type Y = { readonly 0: unique symbol}[0]
  export type Integer = { readonly 0: unique symbol}[0]
  export type Milliseconds = { readonly 0: unique symbol}[0]
  export type Seconds = { readonly 0: unique symbol}[0]
  export type Natural = { readonly 0: unique symbol}[0]
  export type NaturalInteger = { readonly 0: unique symbol}[0]
  export type Coord = { readonly 0: unique symbol}[0]
  export type ChunkCoord = { readonly 0: unique symbol}[0]
}

// We use this to force TS to not expand the type so error messages are clear.
interface Opaque {}

// We use this to define Newtypes. While Newtype itself _can_ be used for
// definitions it results in both ambiguous and verbose error messages if
// type checking fails.
export interface MkNewtype<A> extends Opaque {
  readonly [Unique.Newtype]: A
}

export type Newtype<A, B> = A & MkNewtype<B>

export const coerce = <A, B, C>(newtype: Newtype<A, B>) =>
  newtype as unknown as Newtype<A, C>

export const mapCoerce: <T, A, B>(array: Array<Newtype<T, A>>) => Array<Newtype<T, B>>
  = (a) => a as any

// Inspired by Conon McBride's "Control.Newtype"
// https://hackage.haskell.org/package/newtype-0.2.2.0/docs/Control-Newtype.html
// https://pursuit.purescript.org/packages/purescript-newtype/3.0.0/docs/Data.Newtype
export const wrap = <A, B>(a: A) =>
  a as Newtype<A, B>

export const unwrap = <A, B>(newtype: Newtype<A, B>) =>
  newtype as A

export const over: <A, B>(newtype: Newtype<A, B>, f: (a: A) => A) => Newtype<A, B>
  = (newtype, f) => wrap(f(unwrap(newtype)))

export interface Keybindings {
  up: string
  left: string
  down: string
  right: string
  jump: string
  crouch: string
  zoom: string
  pause: string
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
    crouch: "Ctrl",
    zoom: "m",
    pause: "p",
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

export type Entity = {
  velocity: Coord
  airborne: boolean
  coord: Coord
  weight: Natural
  textures: Array<GameTexture>
} & Rectangle // what abut round enemies????!!!!

export interface GameState {
  readonly context: CanvasRenderingContext2D
  readonly effects: ScopedState<{ effects: Effects }>
  dimensions: Rectangle
  time: { now: Milliseconds, previous: Milliseconds }
  lastFrame: Milliseconds
  player: Entity
  screen: Coord
  settings: Settings
  activeKeys: ActiveKeys
  zoom: number
  chunks: Chunks<GameElement>
  paused: boolean
}

export type MutableGameState = Omit<GameState, "context" | "effects">
