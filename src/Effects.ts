
import {
  GameState,
  MutableGameState,
} from "./Types"
import * as State from "./ScopedState"
import {
  diff,
  toSeconds,
  Milliseconds,
  Seconds,
} from "./Math"
import * as Debug from "./Debug"

const {
  max,
  round,
} = Math

// 1 Effects should run until whenever they want to stop:
//  - What should signal stopping them?
//    - Return NULL because its idiomatic js lol
// 2. Effects should act after movement but before collision resolution(?)
// 3. Maybe we should only act on one GameState field? Let's see how we use it
//
// This means we can implement things like jumping, attacks, that affect the
// player over several frames.
export interface Stop<A> {
  readonly _tag: "Stop"
  value: A
}
export const Stop: <A>(value: A) => Stop<A>
  = (value) => ({ _tag: "Stop", value })
export interface Continue<A> {
  readonly _tag: "Continue"
  value: A
}
export const Continue: <A>(value: A) => Continue<A>
  = (value) => ({ _tag: "Continue", value })

export type EffectResult<A> = Stop<A> | Continue<A>
export type Effect = (state: GameState) => EffectResult<Partial<MutableGameState>>
export type Effects = Array<Effect>


type runEffects = (state: GameState) => Partial<MutableGameState>
export const runEffects: runEffects = (state) => {
  const { effects } = state.effects.get()
  let accEffects: Effects = []
  let accState: Partial<MutableGameState> = {}

  for (const effect of effects) {
    const result: EffectResult<Partial<MutableGameState>> = effect({
      ...state,
      ...accState,
    })

    accState = Object.assign(accState, result.value)

    if (result._tag === "Continue") {
      accEffects.push(effect)
    }
  }

  state.effects.modify(_ => ({ effects: accEffects }))
  return accState
}


export const jumpEffect: Effect = (effectState) => {
  const {
    player,
    activeKeys: keys,
    settings: { keybindings: { jump } },
    time: { now },
  } = effectState

  const delta: Milliseconds = diff(now, keys[jump])

  if (jump in keys && delta < 1000) {
    const y = (1 - toSeconds(delta)) * -100
    Debug.debugLines.modify(({ lines }) => {
      lines[4] = `jump: ${y.toFixed(1)}, now: ${now} - ${keys[jump]}`
      return { lines }
    })

    return Continue({
      player: Object.assign(player, {
        width: 100, // * (1 - round(1 - delta) * 0.25),
        height: 200, // * (1 + round(delta) * 0.25),
        velocity: {
          x: player.velocity.x,
          y,
        },
      }),
    })
  }

  return Stop({
    player: Object.assign(player, {
      width: 100,
      height: 200,
    }),
  })
}

type zoomEffect = (isZoomed: boolean) => Effect
export const zoomEffect: zoomEffect = (isZoomed) => (effectState) => {
  const {
    zoom,
    activeKeys,
    settings: { keybindings: keys },
    time: { now, previous },
  } = effectState

  const delta: Seconds = toSeconds(diff(now, previous))

  if (isZoomed && zoom > 0.5) {
    return Continue({
      zoom: max(zoom - 0.5 * delta, 0.5)
    })
  } else if (!isZoomed && zoom < 1) {
    return Continue({
      zoom: zoom + 0.5 * delta
    })
  }

  return Stop({
    zoom: round(zoom * 2) * 0.5,
  })
}
