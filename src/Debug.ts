import { range } from "ramda"
import * as State from "./ScopedState"
import { ScopedState } from "./ScopedState"


export type DebugState = { lines: Array<string | null> }
export const debugLines: ScopedState<DebugState>
  = State.create<DebugState>({ lines: range(0, 32).map(_ => null) })
