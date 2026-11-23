import { Config } from "@opencode/core/config"
import { Mix } from "@opencode/core/mix"
import { Model } from "@opencode/core/model"
import { ModelsDev } from "@opencode/core/models-dev"
import { Provider } from "@opencode/core/provider"
import { ShellSelect } from "@opencode/core/shell/select"
import { Effect } from "effect"
import { HttpApiBuilder } from "effect/http-api"
import { Api } from "../api"

export const ConfigHandler = HttpApiBuilder.group(Api, "server.config", (handlers) =>
  handlers
    .handle("config.get", () => Config.Service.use((config) => config.entries()))
    .handle(
      "config.update",
      Effect.fn(function* (ctx) {
        const config = yield* Config.Service
        if (!config.update) return yield* Effect.die(new Error("Config updates are unavailable"))
        return yield* config.update(ctx.payload).pipe(Effect.orDie)
      }),
    )
    .handle(
      "config.shells",
      Effect.fn(function* () {
        const shell = yield* ShellSelect.Service
        if (!shell.list) return yield* Effect.die(new Error("Shell discovery is unavailable"))
        return yield* shell.list()
      }),
    )
    .handle("mix.get", () => Mix.Service.use((mix) => mix.state()))
    .handle(
      "mix.set",
      Effect.fn(function* (ctx) {
        const mix = yield* Mix.Service
        yield* mix.update(ctx.payload)
        // Re-register providers so the mix provider and any hidden providers take effect now.
        const providers = yield* Provider.Service
        yield* providers.reload().pipe(Effect.catchCause(() => Effect.void))
        return yield* mix.state()
      }),
    )
    .handle(
      "mix.refresh",
      Effect.fn(function* () {
        const mix = yield* Mix.Service
        const providers = yield* Provider.Service
        const models = yield* Model.Service
        const modelsDev = yield* ModelsDev.Service

        yield* modelsDev.refresh(true).pipe(Effect.catchCause(() => Effect.void))
        // ModelsDevPlugin also reloads on Refreshed event; reload explicitly to be deterministic.
        yield* providers.reload().pipe(Effect.catchCause(() => Effect.void))

        const available = new Set((yield* models.available()).map((m) => `${m.providerID}/${m.id}`))
        const state = yield* mix.state()
        let skipped = 0
        for (const combo of state.combos) {
          for (const candidate of combo.candidates) {
            if (!available.has(`${candidate.providerID}/${candidate.modelID}`)) skipped += 1
          }
        }

        return {
          mix: state,
          added: 0,
          updated: 0,
          skipped,
          refreshedAt: Date.now(),
        }
      }),
    ),
)
