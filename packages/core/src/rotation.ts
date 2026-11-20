export * as Rotation from "./rotation.js"

import { Clock, Effect } from "effect"
import type { AIError } from "@opencode/ai/effect"
import { Credential } from "./credential.js"
import { Integration } from "./integration.js"
import { Mix } from "./mix.js"
import { Provider } from "./provider.js"
import type { Model } from "@opencode/schema/model"

/**
 * Rotation for multiple API keys and for mix candidates, the way a token pool does: a failure that says "this token is
 * used up or refused" marks that source as cooling down for a while, and the next request resolves the next available
 * one. Cooling sources return to the pool when their deadline expires, or when their credential value is updated.
 *
 * A retired or misconfigured source is not punished forever: cooldowns are capped, and usage resumes automatically.
 */
export const onFailure = Effect.fn("Rotation.onFailure")(function* (input: {
  readonly cause: AIError
  readonly providerID: Provider.ID
  /** Set for mix combos: the underlying model that actually failed, whose quota/token should cool down. */
  readonly source?: Model.Ref
}) {
  const tag = input.cause.reason._tag
  if (tag !== "RateLimit" && tag !== "QuotaExceeded" && tag !== "Authentication") return
  const now = yield* Clock.currentTimeMillis
  const until = Credential.rotationCooldown(tag, input.cause.retryAfterMs, now)
  // A combo hides the real models, so the combo's candidate, not the combo, is what failed.
  if (input.providerID === Mix.ID) {
    if (!input.source) return
    const mix = yield* Mix.Service
    yield* mix.cool({ providerID: input.source.providerID, id: input.source.id }, until)
    yield* Effect.logWarning("mix candidate cooling down", {
      integrationID: input.source.providerID,
      reason: tag,
      until,
    })
    return
  }
  yield* Effect.gen(function* () {
    const providers = yield* Provider.Service
    const provider = yield* providers.get(input.providerID)
    const integration = yield* Integration.Service
    const integrationID = provider?.integrationID
      ? Integration.ID.make(provider.integrationID)
      : Integration.ID.make(input.providerID)
    const connection = yield* integration.connection.active(integrationID)
    // Env-based providers carry one environment variable per machine; there is no pool to rotate between.
    if (connection?.type !== "credential") return
    const credentials = yield* Credential.Service
    yield* credentials.limit(connection.id, until, tag)
    yield* Effect.logWarning("credential cooling down", {
      integrationID,
      credentialID: connection.id,
      reason: tag,
      until,
    })
  }).pipe(Effect.catchCause(() => Effect.void))
})
