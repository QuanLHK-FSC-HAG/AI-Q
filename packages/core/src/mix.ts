export * as Mix from "./mix.js"

import { Clock, Context, Effect, Layer, Option, Schema } from "effect"
import { ConfigMix } from "@opencode/schema/config/mix"
import { Model } from "@opencode/schema/model"
import { Provider } from "@opencode/schema/provider"
import { KV } from "./kv.js"
import { makeGlobalNode } from "@opencode/util/effect/app-node"

export const ID = Provider.ID.make("aiq")
export type ID = Provider.ID

/** Built-in combo that rotates across all currently available chat models. */
export const AUTO = Model.ID.make("auto")

export const Info = ConfigMix.Info
export type Info = ConfigMix.Info
export const Patch = ConfigMix.Patch
export type Patch = ConfigMix.Patch
export const Combo = ConfigMix.Combo
export type Combo = ConfigMix.Combo
export const Candidate = ConfigMix.Candidate
export type Candidate = ConfigMix.Candidate

const EMPTY: Info = { hideReal: false, combos: [] }

export class UnavailableError extends Schema.TaggedError<UnavailableError>()("Mix.UnavailableError", {
  reason: Schema.String,
}) {}

export interface Interface {
  /** Current stored mix, decoded with defaults. */
  readonly state: () => Effect.Effect<Info>
  /** Replace the hideReal flag and/or the combo list in one write. */
  readonly update: (patch: Patch) => Effect.Effect<void>
  /** The current stored mix without the database, for synchronous transform callbacks. */
  readonly current: () => Info
  /** Pick the underlying candidate for a combo: weighted round-robin that skips candidates cooling down. */
  readonly pick: (comboID: string) => Effect.Effect<Ref, UnavailableError>
  /** Pick from an explicit candidate pool, sharing cooling and cursor state for the given id. */
  readonly pickFrom: (comboID: string, candidates: readonly Candidate[]) => Effect.Effect<Ref, UnavailableError>
  /** Mark a candidate as temporarily unusable until epoch millis. In-memory only. */
  readonly cool: (ref: Pick<Ref, "providerID" | "id">, until: number) => Effect.Effect<void>
}
export type Ref = Model.Ref

export class Service extends Context.Service<Service, Interface>()("@opencode/Mix") {}

const decode = Schema.decodeUnknownOption(Info)

const weightOf = (candidate: Candidate) => (candidate.weight !== undefined && candidate.weight > 0 ? candidate.weight : 1)

const keyOf = (providerID: string, id: string) => `${providerID}/${id}`

const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const kv = yield* KV.Service
    let current = Option.getOrElse(decode(yield* kv.get("mix")), () => EMPTY)
    const cooling = new Map<string, number>()
    const cursors = new Map<string, number>()
    const pickFrom = Effect.fn("Mix.pickFrom")(function* (comboID: string, candidates: readonly Candidate[]) {
      if (candidates.length === 0) return yield* new UnavailableError({ reason: "combo_has_no_candidates" })
      const now = yield* Clock.currentTimeMillis
      for (const [key, until] of cooling) if (until <= now) cooling.delete(key)
      const fresh = candidates.filter((candidate) => (cooling.get(keyOf(candidate.providerID, candidate.modelID)) ?? 0) <= now)
      const pool = fresh.length > 0 ? fresh : candidates
      const total = pool.reduce((sum, candidate) => sum + weightOf(candidate), 0)
      const cursor = (cursors.get(comboID) ?? 0) % total
      cursors.set(comboID, (cursor + 1) % total)
      let left = cursor
      for (const candidate of pool) {
        left -= weightOf(candidate)
        if (left < 0) {
          return Model.Ref.make({
            providerID: Provider.ID.make(candidate.providerID),
            id: Model.ID.make(candidate.modelID),
            ...(candidate.variant === undefined ? {} : { variant: Model.VariantID.make(candidate.variant) }),
          })
        }
      }
      const last = pool[pool.length - 1]!
      return Model.Ref.make({
        providerID: Provider.ID.make(last.providerID),
        id: Model.ID.make(last.modelID),
        ...(last.variant === undefined ? {} : { variant: Model.VariantID.make(last.variant) }),
      })
    })
    const service: Interface = Service.of({
      state: () => Effect.succeed(current),
      current: () => current,
      update: Effect.fn("Mix.update")(function* (patch) {
        const merged: Info = {
          hideReal: patch.hideReal ?? current.hideReal,
          combos: patch.combos ?? current.combos,
        }
        yield* kv.set("mix", merged)
        current = merged
      }),
      pick: Effect.fn("Mix.pick")(function* (comboID) {
        const combo = current.combos.find((combo) => combo.id === comboID && combo.enabled !== false)
        if (!combo) return yield* new UnavailableError({ reason: "combo_not_found" })
        return yield* pickFrom(comboID, combo.candidates)
      }),
      pickFrom,
      cool: Effect.fn("Mix.cool")(function* (ref, until) {
        const now = yield* Clock.currentTimeMillis
        for (const [key, deadline] of cooling) if (deadline <= now) cooling.delete(key)
        cooling.set(keyOf(ref.providerID, ref.id), until)
      }),
    })
    return service
  }),
)

export const node = makeGlobalNode({ service: Service, layer, deps: [KV.node] })
