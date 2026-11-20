import { readFileSync } from "node:fs"
import path from "node:path"
import { app } from "electron"
import type { Endpoint } from "@opencode/client/service"
import { CHANNEL } from "../constants"

// The main thread idles between showing the first window and evaluating the main bundle, waiting
// for the renderer's asset requests. That slot is long enough to find out whether a compatible
// background service is already running, so the renderer's first data request is not the first
// moment anyone asks. The probe only looks; a service that has to be started waits for the layers,
// which set the environment the CLI expects.
let probe: Promise<Endpoint | undefined> | undefined

export function startSidecarProbe() {
  if (!app.isPackaged) return
  const version = CHANNEL === "beta" ? undefined : bundledVersion()

  if (version === "") {
    console.warn("[desktop] sidecar probe skipped: bundled CLI version is empty", {
      resourcesPath: process.resourcesPath,
    })
    probe = import("@opencode/client/service").then(({ Service }) => Service.discover()).catch(() => undefined)
    return
  }

  probe = import("@opencode/client/service")
    .then(({ Service }) => Service.discover({ version }))
    .catch((error) => {
      console.warn("[desktop] sidecar probe discover failed", error)
      return undefined
    })
}

/** The probe's result, once: a later connect must not adopt a service that may have exited since boot. */
export function takeSidecarProbe() {
  const result = probe ?? Promise.resolve(undefined)
  probe = undefined

  return result
}

function bundledVersion() {
  // The Node fallback can be the only build left if the Bun executable was replaced or a partial install
  // dropped one of them; both builds report the same CLI version when they ship together.
  for (const name of ["aiq-cli.version", "aiq-cli-node.version", "opencode-cli.version", "opencode-cli-node.version"]) {
    try {
      return readFileSync(path.join(process.resourcesPath, name), "utf8").trim()
    } catch {}
  }

  try {
    const manifest = JSON.parse(readFileSync(path.join(process.resourcesPath, "cli-manifest.json"), "utf8")) as {
      version?: string
    }
    if (manifest.version) return manifest.version.trim()
  } catch {}

  return ""
}
