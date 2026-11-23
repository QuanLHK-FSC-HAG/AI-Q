import { Config } from "@opencode/schema/config"
import { ConfigMix } from "@opencode/schema/config/mix"
import { ConfigShell } from "@opencode/schema/config/shell"
import { Schema } from "effect"
import { HttpApiEndpoint, HttpApiGroup, HttpApiSchema, OpenApi } from "effect/http-api"
import { LocationQuery, locationQueryOpenApi } from "./location.js"

export const ConfigGroup = HttpApiGroup.make("server.config")
  .add(
    HttpApiEndpoint.get("config.get", "/api/config", {
      query: LocationQuery,
      success: Schema.Array(Config.Entry),
    })
      .annotateMerge(locationQueryOpenApi)
      .annotateMerge(
        OpenApi.annotations({
          identifier: "config.get",
          summary: "Get configuration",
          description:
            "Return configuration documents and discovery sources for the requested location, from lowest to highest priority.",
        }),
      ),
  )
  .add(
    HttpApiEndpoint.get("config.shells", "/api/config/shell", {
      success: Schema.Array(ConfigShell.Option),
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "config.shells",
        summary: "List available shells",
        description: "Return shells available to terminal and agent execution.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.get("mix.get", "/api/experimental/mix", {
      success: ConfigMix.Info,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "experimental.mix.get",
        summary: "Get the AI-Q mix",
        description: "Return the AI-Q model mix: which providers to hide and which models to route through the mix.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.patch("mix.set", "/api/experimental/mix", {
      payload: ConfigMix.Patch,
      success: ConfigMix.Info,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "experimental.mix.set",
        summary: "Update the AI-Q mix",
        description:
          "Replace the hide-real-models flag and the combo list. The values take effect at the next model resolution.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.post("mix.refresh", "/api/experimental/mix/refresh", {
      success: ConfigMix.RefreshResult,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "experimental.mix.refresh",
        summary: "Refresh AI-Q models and mix",
        description:
          "Refresh the model catalog and additively merge resolvable candidates into the existing mix. Does not update the app binary.",
      }),
    ),
  )
  .add(
    HttpApiEndpoint.patch("config.update", "/api/experimental/config", {
      payload: Config.Patch,
      success: HttpApiSchema.NoContent,
    }).annotateMerge(
      OpenApi.annotations({
        identifier: "experimental.config.update",
        summary: "Update global configuration",
        description: "Patch supported fields in the highest-precedence global configuration document.",
      }),
    ),
  )
  .annotateMerge(OpenApi.annotations({ title: "config", description: "Location-scoped configuration routes." }))
