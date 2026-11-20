#!/usr/bin/env bun
import { $ } from "bun"
import { exists, mkdir } from "node:fs/promises"
import path from "node:path"
import { getCurrentCli, getCurrentNodeCli, resolveChannel, writeCliManifest } from "./utils"

const dir = path.resolve(import.meta.dir, "..")
const cli = path.resolve(dir, "../cli/dist")
const out = path.resolve(dir, "../../dist/cli-assets")
const channel = resolveChannel()

process.chdir(dir)

const built = await exists(path.join(cli, getCurrentCli().package.replace("@opencode/", "")))
if (!built) throw new Error(`CLI not found in ${cli}; build packages/cli first`)

const nodeCli = path.join(cli, "node")
const nodeBuilt =
  getCurrentCli().os === "win32"
    ? await exists(path.join(nodeCli, getCurrentNodeCli().package.replace("@opencode/", "")))
    : false

const manifest = await writeCliManifest(cli, {
  nodeRoot: nodeBuilt ? nodeCli : undefined,
  out: path.join("resources", "cli-manifest.json"),
  channel,
})

await mkdir(out, { recursive: true })

const target = getCurrentCli()
const bunPkg = path.join(cli, target.package.replace("@opencode/", ""))
const bunExe = path.join(bunPkg, "bin", target.os === "win32" ? "opencode.exe" : "opencode")
const bunZip = path.join(out, manifest.assets.bun.file)

await $`powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -LiteralPath '${bunExe}' -DestinationPath '${bunZip}' -Force"`
await renameInZip(bunZip, target.os === "win32" ? "opencode.exe" : "opencode", manifest.assets.bun.exe)

if (manifest.assets.node && nodeBuilt) {
  const nodeTarget = getCurrentNodeCli()
  const nodePkg = path.join(nodeCli, nodeTarget.package.replace("@opencode/", ""))
  const nodeExe = path.join(nodePkg, "bin", nodeTarget.binary)
  const nodeZip = path.join(out, manifest.assets.node.file)
  await $`powershell -NoProfile -ExecutionPolicy Bypass -Command "Compress-Archive -LiteralPath '${nodeExe}' -DestinationPath '${nodeZip}' -Force"`
  await renameInZip(nodeZip, nodeTarget.binary, manifest.assets.node.exe)
}

await Bun.write(path.join(out, "cli-manifest.json"), JSON.stringify(manifest, null, 2) + "\n")
console.log(`CLI assets written to ${out}`)

async function renameInZip(zip: string, from: string, to: string) {
  if (from === to) return
  const tmp = `${zip}.tmpdir`
  await $`powershell -NoProfile -ExecutionPolicy Bypass -Command "Remove-Item -LiteralPath '${tmp}' -Recurse -Force -ErrorAction SilentlyContinue; Expand-Archive -LiteralPath '${zip}' -DestinationPath '${tmp}' -Force; Rename-Item -LiteralPath '${path.join(tmp, from)}' -NewName '${to}'; Compress-Archive -LiteralPath '${path.join(tmp, "*")}' -DestinationPath '${zip}' -Force; Remove-Item -LiteralPath '${tmp}' -Recurse -Force"`
}
