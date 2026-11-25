export * as LegacyService from "./legacy-service"

import path from "node:path"
import { Effect, FileSystem, Option, Schema } from "effect"

const Registration = Schema.Struct({
  version: Schema.optional(Schema.String),
  url: Schema.String,
  pid: Schema.Int.check(Schema.isGreaterThan(0)),
})

const decode = Schema.decodeUnknownOption(Schema.fromJsonString(Registration))

// AI-Q builds its version as "0.0.0-<channel>-<timestamp>"; upstream OpenCode releases are semver. The legacy
// state directory is shared with an upstream install, whose service must keep running.
export function isAiQRegistration(version: string | undefined) {
  return version !== undefined && version.startsWith("0.0.0-")
}

/**
 * Before AI-Q kept its state in userData, the background service registered in the default XDG state
 * directory. Such a service survives an in-app update and keeps the channel's fixed port, while the new app
 * looks in its own state directory and can neither discover nor stop it. Stop it once, and only when this
 * channel has no current registration and the legacy file belongs to AI-Q.
 */
export const stopLegacy = Effect.fnUntraced(function* (input: {
  readonly current: string
  readonly legacy: string
  readonly stop: (options: { readonly file: string }) => Effect.Effect<void, unknown>
}) {
  if (path.resolve(input.current) === path.resolve(input.legacy)) return false

  const fs = yield* FileSystem.FileSystem
  if (yield* fs.exists(input.current)) return false

  const text = yield* fs.readFileString(input.legacy).pipe(Effect.option)
  if (Option.isNone(text)) return false

  const info = Option.getOrUndefined(decode(text.value))
  if (info === undefined || !isAiQRegistration(info.version)) return false

  yield* Effect.logInfo("stopping background service from the legacy state directory", {
    file: input.legacy,
    version: info.version,
    pid: info.pid,
    url: info.url,
  })

  yield* input.stop({ file: input.legacy }).pipe(
    Effect.catch((error) =>
      Effect.logWarning("failed to stop the background service from the legacy state directory", {
        file: input.legacy,
        error,
      }),
    ),
  )

  return true
})
