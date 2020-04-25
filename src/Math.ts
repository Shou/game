
type shuffle = <A>(list: Array<A>, rand: () => number) => Array<A>
export const shuffle: shuffle = (list, rand) =>
  list
    .map(value => ({ sort: rand(), value }))
    .sort((a, b) => a.sort - b.sort)
    .map(a => a.value)
