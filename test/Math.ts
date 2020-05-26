import { test, assertEqual } from "./assertEqual"

import { Integer, range } from "../src/Math"

test("range should produce 1 to 10", async () => {
  const result = range(1 as Integer, 10 as Integer)
  assertEqual(result, [1,2,3,4,5,6,7,8,9,10] as Array<Integer>)
})

test("range should be empty", async () => {
  const result = range(0 as Integer, 0 as Integer)
  assertEqual(result, [])
})

test("range should produce 10 to 1", async () => {
  const result = range(10 as Integer, 1 as Integer)
  assertEqual(result, [10,9,8,7,6,5,4,3,2,1] as Array<Integer>)
})

test("range should produce 5 to -5", async () => {
  const result = range(5 as Integer, -5 as Integer)
  assertEqual(result, [5,4,3,2,1,0,-1,-2,-3,-4,-5] as Array<Integer>)
})

test("range should produce -5 to 5", async () => {
  const result = range(-5 as Integer, 5 as Integer)
  assertEqual(result, [-5,-4,-3,-2,-1,0,1,2,3,4,5] as Array<Integer>)
})
