import { describe, expect } from "bun:test"
import { Clock, Effect } from "effect"
import { Mix } from "@opencode/core/mix"
import { KV } from "@opencode/core/kv"
import { Database } from "@opencode/core/database/database"
import { Provider as ProviderSchema } from "@opencode/schema/provider"
import { Model as ModelSchema } from "@opencode/schema/model"
import { LayerNode } from "@opencode/util/effect/layer-node"
import { testEffect } from "./lib/effect"

const it = testEffect(LayerNode.compile(LayerNode.group([Mix.node, KV.node, Database.node])))

const combo = (id: string, candidates: Array<{ providerID: string; modelID: string; weight?: number }>) => ({
  id,
  name: id,
  enabled: true,
  candidates,
})

describe("Mix", () => {
  it.effect("defaults to an empty mix", () =>
    Effect.gen(function* () {
      const mix = yield* Mix.Service
      expect(yield* mix.state()).toEqual({ hideReal: false, combos: [] })
    }),
  )

  it.effect("stores the hideReal flag and keeps it across reads", () =>
    Effect.gen(function* () {
      const mix = yield* Mix.Service
      yield* mix.update({ hideReal: true })
      expect(yield* mix.state()).toEqual({ hideReal: true, combos: [] })
    }),
  )

  it.effect("weights candidates by their weight value", () =>
    Effect.gen(function* () {
      const mix = yield* Mix.Service
      const stored = yield* mix.update({
        combos: [
          combo("aiq-mix", [
            { providerID: "openai", modelID: "gpt-5", weight: 1 },
            { providerID: "google", modelID: "gemini-2.5-pro", weight: 2 },
          ]),
        ],
      })
      expect(stored).toBeUndefined()

      const picks = yield* Effect.forEach(Array.from({ length: 9 }, () => "pick"), () =>
        mix.pick("aiq-mix").pipe(Effect.map((ref) => String(ref.providerID))),
      )

      expect(picks.filter((providerID) => providerID === "google")).toHaveLength(6)
      expect(picks.filter((providerID) => providerID === "openai")).toHaveLength(3)
    }),
  )

  it.effect("skips candidates that are cooling and returns to them when the deadline passes", () =>
    Effect.gen(function* () {
      const mix = yield* Mix.Service
      const now = yield* Clock.currentTimeMillis
      yield* mix.update({
        combos: [
          combo("aiq-mix", [
            { providerID: "openai", modelID: "gpt-5" },
            { providerID: "google", modelID: "gemini-2.5-pro" },
          ]),
        ],
      })
      yield* mix.cool(
        { providerID: ProviderSchema.ID.make("openai"), id: ModelSchema.ID.make("gpt-5") },
        now + 60_000,
      )

      const picks = yield* Effect.forEach(Array.from({ length: 4 }, () => "pick"), () =>
        mix.pick("aiq-mix").pipe(Effect.map((ref) => String(ref.providerID))),
      )

      expect(picks).toEqual(["google", "google", "google", "google"])
    }),
  )

  it.effect("survives kv round trips and clears all layers of an update", () =>
    Effect.gen(function* () {
      const kv = yield* KV.Service
      const mix = yield* Mix.Service
      yield* mix.update({ hideReal: true, combos: [combo("aiq-mix", [{ providerID: "a", modelID: "b" }])] })

      expect(yield* kv.get("mix")).toEqual({
        hideReal: true,
        combos: [combo("aiq-mix", [{ providerID: "a", modelID: "b" }])],
      })

      yield* mix.update({ combos: [] })
      expect(yield* mix.state()).toEqual({ hideReal: true, combos: [] })
    }),
  )
})
