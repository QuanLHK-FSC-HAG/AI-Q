export * as DesktopCli from "./desktop-cli"

import { execFile, spawn } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { release } from "node:os"
import { promisify } from "node:util"
import { app } from "electron"
import { Context, Effect, FileSystem, Layer, Option, Path, Schema } from "effect"
import installer from "../../../../../install?raw"
import { DesktopPaths } from "../paths"
import { BUNDLED_CLI_VERSION_KEY } from "../storage/keys"
import { getStore } from "../storage/store"
import { parseCliVersion, stageName } from "./cli-version"
import { DesktopCliState } from "./desktop-cli-state"
import { downloadCliFromManifest } from "./cli-download"

const execFileAsync = promisify(execFile)

// The first `--version` after an update can take several seconds while antivirus scans the executable.
const RUN_TIMEOUT_MS = 30_000

export interface Resolved {
  readonly version: string
  readonly command: readonly string[]
  readonly binary?: string
  /** A second build of the same CLI to retry with when the first cannot load (Windows only). */
  readonly fallback?: Resolved
}

export interface Interface {
  readonly resolve: Effect.Effect<Resolved>
  readonly install: Effect.Effect<string, Error>
}

export class Service extends Context.Service<Service, Interface>()("opencode/desktop/DesktopCli") {}

export const layer = Layer.effect(
  Service,
  Effect.gen(function* () {
    const path = yield* Path.Path

    // A failed lookup (for example a stage copy that antivirus held open) runs again on the next use.
    const resolve = yield* DesktopCliState.make(
      make().pipe(Effect.provide(yield* Effect.context<FileSystem.FileSystem | Path.Path>()), Effect.orDie),
    )

    const install = Effect.gen(function* () {
      if (process.platform !== "darwin") return yield* Effect.fail(new Error("CLI installation requires macOS"))
      const cli = yield* resolve

      if (!cli.binary) return yield* Effect.fail(new Error("Bundled CLI executable is unavailable"))
      const home = app.getPath("home")
      yield* runInstaller(cli.binary, home)

      return path.join(home, ".opencode", "bin", "opencode")
    })

    return Service.of({ resolve, install })
  }),
)

const make = Effect.fn("DesktopCli.resolve")(function* () {
  const development = !app.isPackaged && process.env.OPENCODE_DESKTOP_CLI_DEV
  const version = process.env.OPENCODE_VERSION ?? "local"

  const cli = development
    ? {
        version,
        // Bun's transpiler cache key includes the define table, and the dev version changes on every
        // run. Reading it from the inherited environment keeps the define fixed and the cache warm.
        command: [
          "bun",
          "run",
          "--cwd",
          development,
          "--define=OPENCODE_VERSION=process.env.OPENCODE_VERSION",
          "src/index.ts",
        ],
        binary: undefined,
      }
    : yield* resolveBundledCli(!app.isPackaged && process.env.OPENCODE_DESKTOP_ISOLATED_SERVER === "1")

  return cli satisfies Resolved
})

const resolveBundledCli = Effect.fn("DesktopCli.resolveBundled")(function* (isolated: boolean) {
  const path = yield* Path.Path
  const paths = yield* DesktopPaths.resolve
  const root = app.isPackaged ? process.resourcesPath : paths.developmentResourcesRoot

  let bun = path.join(root, isolated ? developmentExecutableName() : executableName())
  let node = path.join(root, nodeExecutableName())

  // After an in-app update electron-updater may replace resources and drop the CLI that the installer
  // downloaded. Repair by downloading from the manifest into the staged userData directory.
  if (!isolated && app.isPackaged && !existsSync(bun)) {
    yield* Effect.tryPromise({
      try: () => downloadCliFromManifest(preferNodeCli() ? "node" : "bun"),
      catch: (error) => error as Error,
    }).pipe(
      Effect.tapError((error) => Effect.logWarning("v2 CLI download repair failed", { error: String(error) })),
      Effect.orElseSucceed(() => undefined),
    )
    const manifest = readManifest(root)
    if (manifest?.version) {
      const stage = stageName(manifest.version)
      const dir = path.join(app.getPath("userData"), "cli", stage)
      const stagedBun = path.join(dir, executableName())
      const stagedNode = path.join(dir, nodeExecutableName())
      if (existsSync(stagedBun)) bun = stagedBun
      if (existsSync(stagedNode)) node = stagedNode
    }
  }

  // Bun needs Windows 10 1809 for ConPTY. The Node SEA build of the same CLI covers older Windows 10 and
  // backs Bun up if it cannot load, so a Windows installer carries both.
  const nodeAvailable = !isolated && process.platform === "win32" && existsSync(node)
  const primary = nodeAvailable && preferNodeCli() ? node : bun
  const alternate = nodeAvailable && primary === bun ? node : undefined

  if (!existsSync(primary))
    return yield* Effect.fail(
      new Error(`AI-Q CLI executable is unavailable: ${primary}. Check your internet connection and restart AI-Q.`),
    )

  yield* Effect.logInfo("v2 CLI executable resolved", {
    bundled: primary,
    fallback: alternate,
    packaged: app.isPackaged,
  })

  const resolved = yield* resolveExecutable(primary, isolated)

  if (!alternate) return resolved

  // Only the build that runs is staged. The fallback stays in resources until a loader failure makes it the
  // only option, so a normal launch never pays for a second ~200 MB copy.
  return {
    ...resolved,
    fallback: { version: yield* bundledVersion(alternate), binary: alternate, command: [alternate] },
  }
})

const resolveExecutable = Effect.fn("DesktopCli.resolveExecutable")(function* (source: string, isolated: boolean) {
  const version = yield* bundledVersion(source)
  const binary = app.isPackaged || isolated ? yield* installCli(source, version) : source

  return { version, binary, command: [binary] } satisfies Resolved
})

// Spawning the bundled executable for `--version` costs ~400 ms of startup on a 200 MB binary (and
// several seconds on the first launch after an update, while the antivirus scans it). The build
// writes the version next to the executable, so a packaged app never spawns; the per-identity cache
// covers executables that arrived without that file.
const bundledVersion = Effect.fn("DesktopCli.bundledVersion")(function* (bundled: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path

  // Synchronous on purpose: this sits on the path to the first window's IPC port, and a queued
  // async read waits behind everything else the main thread is doing at that moment.
  const shipped = yield* Effect.sync(() => {
    try {
      const file = path.join(path.dirname(bundled), `${path.basename(bundled).replace(/\.exe$/i, "")}.version`)

      return readFileSync(file, "utf8").trim()
    } catch {
      return ""
    }
  })

  if (shipped) {
    yield* Effect.logInfo("v2 CLI version bundled", { version: shipped })

    return shipped
  }

  const stat = yield* fs.stat(bundled).pipe(Effect.orElseSucceed(() => undefined))
  const identity = stat ? `${stat.size}:${Option.getOrUndefined(stat.mtime)?.getTime() ?? ""}` : undefined
  const store = getStore()
  const cached = Option.getOrUndefined(Schema.decodeUnknownOption(VersionCache)(store.get(BUNDLED_CLI_VERSION_KEY)))

  if (identity && cached?.path === bundled && cached.identity === identity) {
    yield* Effect.logInfo("v2 CLI version reused", { version: cached.version })

    return cached.version
  }

  const version = parseCliVersion(yield* run(bundled, ["--version"]))

  if (identity)
    store.set(BUNDLED_CLI_VERSION_KEY, { path: bundled, identity, version } satisfies typeof VersionCache.Type)

  return version
})

const VersionCache = Schema.Struct({ path: Schema.String, identity: Schema.String, version: Schema.String })

const ExecFailure = Schema.Struct({ stdout: Schema.optional(Schema.String), stderr: Schema.optional(Schema.String) })

const installCli = Effect.fn("DesktopCli.install")(function* (source: string, version: string) {
  const fs = yield* FileSystem.FileSystem
  const path = yield* Path.Path
  // x64 and ARM64 installers share userData on Windows ARM64, so a same-version switch must not reuse the other copy.
  const stage = stageName(version)
  const directory = path.join(app.getPath("userData"), "cli", stage)
  // Bun and Node builds share a stage directory but keep their own executable name, so a fallback retry
  // finds the other build next to the one that failed.
  const destination = path.join(directory, path.basename(source))

  if (existsSync(destination)) {
    yield* Effect.logInfo("v2 CLI staged executable reused", { path: destination, version })

    return destination
  }

  const temp = destination + `.${process.pid}.tmp`
  yield* fs.makeDirectory(directory, { recursive: true })
  yield* fs.copyFile(source, temp)

  if (process.platform !== "win32") yield* fs.chmod(temp, 0o755)
  yield* fs
    .rename(temp, destination)
    .pipe(Effect.catch((error) => fs.remove(temp, { force: true }).pipe(Effect.andThen(Effect.fail(error)))))
  yield* Effect.logInfo("v2 CLI executable staged", { source, path: destination, version })

  return destination
})

const run = Effect.fn("DesktopCli.run")(function* (binary: string, args: string[]) {
  yield* Effect.logInfo("v2 CLI command started", { binary, args })

  const result = yield* Effect.tryPromise(() =>
    execFileAsync(binary, args, { windowsHide: true, timeout: RUN_TIMEOUT_MS }),
  ).pipe(
    Effect.tapError((error) => {
      const output = Option.getOrUndefined(Schema.decodeUnknownOption(ExecFailure)(error.cause))

      return Effect.logError("v2 CLI command failed", {
        args,
        error: error.cause instanceof Error ? error.cause.message : String(error.cause),
        stdout: output?.stdout?.trim() ?? "",
        stderr: output?.stderr?.trim() ?? "",
      })
    }),
  )

  const stdout = result.stdout.trim()
  const stderr = result.stderr.trim()
  yield* Effect.logInfo("v2 CLI command completed", { args, stdout, stderr })

  return stdout
})

// The installer runs `opencode --version`, which can take several seconds on first run while Gatekeeper scans it.
const INSTALL_TIMEOUT_MS = 60_000

const runInstaller = Effect.fn("DesktopCli.installForUser")(function* (binary: string, home: string) {
  yield* Effect.callback<void, Error>((resume) => {
    const child = spawn("/bin/bash", ["-s", "--", "--binary", binary], {
      env: { ...process.env, HOME: home },
      stdio: ["pipe", "ignore", "pipe"],
    })

    let stderr = ""
    child.stderr.on("data", (chunk) => (stderr += chunk))
    child.on("error", (error) => resume(Effect.fail(error)))
    child.on("close", (code) => {
      if (code === 0) return resume(Effect.void)
      resume(Effect.fail(new Error(stderr.trim() || `CLI installer exited with code ${code}`)))
    })
    // bash can exit before it read the whole script; its `close` reports the failure.
    child.stdin.on("error", () => {})
    child.stdin.end(installer)

    // A timeout or the app quitting leaves no installer writing into ~/.opencode behind.
    return Effect.sync(() => {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL")
    })
  }).pipe(
    Effect.timeoutOrElse({
      duration: INSTALL_TIMEOUT_MS,
      orElse: () => Effect.fail(new Error("CLI installation timed out")),
    }),
  )
})

function executableName() {
  return process.platform === "win32" ? "aiq-cli.exe" : "aiq-cli"
}

function nodeExecutableName() {
  return process.platform === "win32" ? "aiq-cli-node.exe" : "aiq-cli-node"
}

function developmentExecutableName() {
  return process.platform === "win32" ? "aiq-cli-dev.exe" : "aiq-cli-dev"
}

// Bun loads ConPTY from KERNEL32 at startup, so Windows 10 before 1809 (build 17763) exits with
// 0xC0000139 before the CLI reads an argument. os.release() is "major.minor.build" on Windows.
function preferNodeCli() {
  const forced = process.env.OPENCODE_DESKTOP_CLI

  if (forced === "node") return true
  if (forced === "bun") return false

  return Number(release().split(".")[2] ?? 0) < 17763
}

function readManifest(root: string) {
  try {
    return JSON.parse(readFileSync(`${root}/cli-manifest.json`, "utf8")) as { version?: string }
  } catch {
    return undefined
  }
}
