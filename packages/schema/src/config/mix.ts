export * as ConfigMix from "./mix.js"

import { Schema } from "effect"
import { optional } from "../schema.js"

/** One underlying model the mix may call for a combo. `weight` defaults to 1. */
export const Candidate = Schema.Struct({
  providerID: Schema.String,
  modelID: Schema.String,
  variant: optional(Schema.String),
  weight: optional(Schema.Number),
}).annotate({ identifier: "ConfigMix.Candidate" })

export interface Candidate extends Schema.Schema.Type<typeof Candidate> {}
export interface Combo extends Schema.Schema.Type<typeof Combo> {}
export const Combo = Schema.Struct({
  // The model id the user sees and selects, e.g. "aiq-mix".
  id: Schema.String,
  name: Schema.String,
  enabled: optional(Schema.Boolean),
  candidates: Schema.Array(Candidate),
}).annotate({ identifier: "ConfigMix.Combo" })

/** The stored mix: which models the app shows, and which models stand in for them. */
export const Info = Schema.Struct({
  hideReal: Schema.Boolean,
  combos: Schema.Array(Combo),
}).annotate({ identifier: "ConfigMix.Info" })

export interface Info extends Schema.Schema.Type<typeof Info> {}
export interface Patch extends Schema.Schema.Type<typeof Patch> {}

/** Combos replace in full when written; hideReal is applied independently. */
export const Patch = Schema.Struct({
  hideReal: optional(Schema.Boolean),
  combos: optional(Schema.Array(Combo)),
}).annotate({ identifier: "ConfigMix.Patch" })
