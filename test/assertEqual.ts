
import { equals } from "ramda"

export interface Test {
  name: string
  f: () => Promise<void>
}

// lol who needs a testing framework when u can NIH
let tests: Array<Test> = []
export const test: (name: string, f: () => Promise<void>) => void = (name, f) => tests.push({ name, f })
export const runTests: () => void = () => tests.forEach(({ name, f }, i) => {
  f().catch(e => console.log(`${i + 1}. ${name}\n`, e.toString()))
})

type assertEqual = <A>(a: {} & A, b: {} & A) => void
export const assertEqual: assertEqual = ((a, b) => {
  if (!equals(a, b)) {
    type f = (o: any) => string
    const f: f = o =>
      "{ " + Object.keys(o).reduce(
        (acc, k) => {
          const v = typeof o[k] === "object" ? f(o[k]) : o[k]
          return acc.concat([`${k}: ${v}`])
        },
        [] as Array<string>
      ).join(", ") + " }"
    throw new Error(`Objects not equal:\n\tResult: ${f(a)}\n\tWanted: ${f(b)}`)
  }
})
