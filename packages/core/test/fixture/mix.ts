// Empty mix for tests that build ModelResolver.layer by hand: no combos, so the catalog path is unchanged.
import { Effect, Layer } from "effect"
import { Mix } from "@opencode/core/mix"

const EMPTY = { hideReal: false, combos: [] }

export const mixLayer = Layer.mock(Mix.Service, {
  state: () => Effect.succeed(EMPTY),
  current: () => EMPTY,
  update: () => Effect.void,
  pick: () => Effect.die("unused Mix.pick"),
  cool: () => Effect.void,
})
