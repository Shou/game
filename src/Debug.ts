import { range } from "ramda"
import * as State from "./ScopedState"
import { ScopedState } from "./ScopedState"
import { GameElement } from "./Texture"


export type TextState = { lines: Array<string | null> }
export const text: ScopedState<TextState>
  = State.create<TextState>({ lines: range(0, 32).map(_ => null) })

export type VisualState = { elems: Array<GameElement | null> }
export const visuals: ScopedState<VisualState>
  = State.create<VisualState>({ elems: range(0, 128).map(_ => null) })
