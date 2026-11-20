import { spawn } from "node:child_process"
import { createWriteStream, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"
import { pipeline } from "node:stream/promises"
import { Readable } from "node:stream"
import { app } from "electron"
import { stageName } from "./cli-version"

type Asset = {
  file: string
  url: string
  size: number
  sha256?: string
  exe: string
}

type Manifest = {
  version: string
  tag?: string
  assets: Record<string, Asset>
}

let active: Promise<void> | undefined

export function downloadCliFromManifest(kind: "bun" | "node" = "bun") {
  if (active) return active
  active = run(kind).finally(() => {
    active = undefined
  })
  return active
}

async function run(kind: "bun" | "node") {
  const root = app.isPackaged ? process.resourcesPath : join(import.meta.dirname, "../../..", "resources")
  const manifest = readManifest(root)
  if (!manifest) throw new Error("AI-Q CLI manifest is missing")

  const asset = manifest.assets[kind] ?? manifest.assets.bun
  if (!asset) throw new Error(`AI-Q CLI asset '${kind}' is not available`)

  const stage = stageName(manifest.version)
  const dir = join(app.getPath("userData"), "cli", stage)
  const dest = join(dir, asset.exe)
  const versionFile = join(dir, asset.exe.replace(/\.exe$/i, "") + ".version")

  if (existsSync(dest) && (!asset.size || statSync(dest).size === asset.size)) {
    if (!existsSync(versionFile)) writeFileSync(versionFile, manifest.version)
    return
  }

  mkdirSync(dir, { recursive: true })
  const tmp = join(app.getPath("temp"), `aiq-cli-${Date.now()}-${Math.random().toString(16).slice(2)}.zip`)

  try {
    await download(asset.url, tmp)
    await extract(tmp, dir)
    if (asset.size && existsSync(dest) && statSync(dest).size !== asset.size) {
      rmSync(dest, { force: true })
      throw new Error(`Downloaded CLI size mismatch: expected ${asset.size}`)
    }
    if (existsSync(dest)) writeFileSync(versionFile, manifest.version)
  } finally {
    rmSync(tmp, { force: true })
  }
}

function readManifest(root: string): Manifest | undefined {
  try {
    return JSON.parse(readFileSync(join(root, "cli-manifest.json"), "utf8")) as Manifest
  } catch {
    try {
      return JSON.parse(readFileSync(join(app.getPath("userData"), "cli-manifest.json"), "utf8")) as Manifest
    } catch {
      return undefined
    }
  }
}

async function download(url: string, dest: string) {
  const res = await fetch(url)
  if (!res.ok || !res.body) throw new Error(`Download failed (${res.status}) from ${url}`)
  mkdirSync(dirname(dest), { recursive: true })
  await pipeline(Readable.fromWeb(res.body as any), createWriteStream(dest))
}

async function extract(zip: string, out: string) {
  if (process.platform === "win32") {
    await ps(
      `Expand-Archive -LiteralPath '${esc(zip)}' -DestinationPath '${esc(out)}' -Force`,
    )
    return
  }

  await sh("unzip", ["-o", zip, "-d", out])
}

function esc(value: string) {
  return value.replace(/'/g, "''")
}

function ps(script: string) {
  return sh("powershell", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script])
}

function sh(cmd: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(cmd, args, { windowsHide: true, stdio: "ignore" })
    child.on("error", reject)
    child.on("close", (code) => {
      if (code === 0) return resolve()
      reject(new Error(`${cmd} exited with code ${code}`))
    })
  })
}
