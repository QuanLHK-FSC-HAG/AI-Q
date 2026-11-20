export * as ConfigMixPlugin from "./mix.js"

import { Effect } from "effect"
import { define } from "@opencode/plugin/effect/plugin"
import { Model } from "../../model.js"
import { Provider } from "../../provider.js"
import { Mix } from "../../mix.js"

/**
 * Registers the AI-Q mix: one model per enabled combo under the `aiq` provider. When `hideReal` is set every other
 * provider is disabled instead, so the picker shows only AI-Q mixes.
 */
export const Plugin = define({
  id: "opencode.config.mix",
  effect: Effect.fn(function* (ctx) {
    const mix = yield* Mix.Service
    const current = mix.current()
    const enabled = current.combos.filter((combo) => combo.enabled !== false)
    yield* ctx.provider.transform((providers) => {
      const auto: Model.Info = {
        ...Model.Info.default(Mix.ID, Mix.AUTO),
        name: "Auto (Rotate All Models)",
      }
      providers.add({
        info: {
          ...Provider.Info.empty(Mix.ID),
          name: "AI-Q",
          activation: "enabled",
          package: "aiq",
        },
        models: [auto, ...enabled.map((combo) => ({
          ...Model.Info.default(Mix.ID, Model.ID.make(combo.id)),
          name: combo.name,
        }))],
      })
      if (current.hideReal)
        for (const entry of providers.list()) {
          if (entry.provider.id === Mix.ID) continue
          providers.update(entry.provider.id, (provider) => {
            provider.activation = "disabled"
          })
        }
    })
  }),
})
