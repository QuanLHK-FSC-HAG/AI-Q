import { expect, test } from "bun:test"
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import path from "node:path"
import { NodeFileSystem } from "@effect/platform-node"
import { Effect } from "effect"

import { stopLegacy } from "./legacy-service"

const aiq = { version: "0.0.0-prod-202611180254", url: "http://127.0.0.1:13420", pid: 16784 }
const upstream = { version: "2.3.2", url: "http://127.0.0.1:28894", pid: 16812 }

// A service that survived the update keeps the channel's fixed port while the new app watches its own state
// directory. Only an AI-Q registration is safe to stop: the legacy directory is shared with upstream installs.
test.each([
  {
    name: "stops an AI-Q service the update left behind",
    legacy: aiq,
    current: undefined,
    expected: 1,
  },
  {
    name: "keeps an upstream OpenCode service in the shared legacy directory",
    legacy: upstream,
    current: undefined,
    expected: 0,
  },
  {
    name: "does nothing when this channel already registered its service",
    legacy: aiq,
    current: aiq,
    expected: 0,
  },
  {
    name: "does nothing when the legacy registration is corrupt",
    legacy: "{",
    current: undefined,
    expected: 0,
  },
  {
    name: "does nothing when both paths are the same",
    legacy: aiq,
    current: undefined,
    expected: 0,
    same: true,
  },
])("$name", async (row) => {
  const root = mkdtempSync(path.join(tmpdir(), "opencode-legacy-service-"))

  try {
    const current = path.join(root, "current", "opencode", "service-prod.json")
    const legacy = row.same ? current : path.join(root, "legacy", "opencode", "service-prod.json")

    for (const [file, value] of [
      [current, row.current],
      [legacy, row.legacy],
    ] as const) {
      if (value === undefined) continue
      mkdirSync(path.dirname(file), { recursive: true })
      writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value))
    }

    const stopped: string[] = []

    const result = await Effect.runPromise(
      stopLegacy({
        current,
        legacy,
        stop: (options) => Effect.sync(() => void stopped.push(options.file)),
      }).pipe(Effect.provide(NodeFileSystem.layer)),
    )

    expect(stopped).toEqual(row.expected === 1 ? [legacy] : [])
    expect(result).toBe(row.expected === 1)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
})
