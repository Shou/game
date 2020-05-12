export interface ScopedState<A extends {}> {
  get: () => A
  modify: (f: (state: A) => A) => void
}

export const create: <A>(state: A) => ScopedState<A> = <A>(state: A) => {
  let o: A = state
  return {
    get: () => ({ ...o }),
    modify: (f: (state: A) => A) => o = f(o),
  }
}
