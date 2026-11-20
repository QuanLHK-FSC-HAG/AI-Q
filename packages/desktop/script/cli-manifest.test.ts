import { expect, test } from "bun:test"
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises"
import os from "node:os"
import path from "node:path"
import { getCurrentCli, getCurrentNodeCli, writeCliManifest } from "./utils"

test("writeCliManifest writes version, tag, and asset metadata", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aiq-cli-manifest-"))
  const previousChannel = process.env.OPENCODE_CHANNEL
  const previousTarget = process.env.OPENCODE_TARGET
  delete process.env.OPENCODE_CHANNEL
  process.env.OPENCODE_TARGET = "windows-x64"

  try {
    const cli = getCurrentCli()
    const nodeCli = getCurrentNodeCli()
    const bunPkg = path.join(dir, "dist", cli.package.replace("@opencode/", ""))
    const nodePkg = path.join(dir, "dist", "node", nodeCli.package.replace("@opencode/", ""))
    await mkdir(path.join(bunPkg, "bin"), { recursive: true })
    await mkdir(path.join(nodePkg, "bin"), { recursive: true })
    await writeFile(path.join(bunPkg, "package.json"), JSON.stringify({ version: "1.2.3-test" }))
    await writeFile(path.join(nodePkg, "package.json"), JSON.stringify({ version: "1.2.3-test" }))
    await writeFile(path.join(bunPkg, "bin", "opencode.exe"), "bun-cli")
    await writeFile(path.join(nodePkg, "bin", nodeCli.binary), "node-cli")

    const out = path.join(dir, "resources", "cli-manifest.json")
    const manifest = await writeCliManifest(path.join(dir, "dist"), {
      nodeRoot: path.join(dir, "dist", "node"),
      out,
      channel: "prod",
    })

    expect(manifest).toEqual({
      version: "1.2.3-test",
      channel: "prod",
      tag: "cli-1.2.3-test",
      assets: {
        bun: {
          file: "aiq-cli-win32-x64.zip",
          url: "https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/cli-1.2.3-test/aiq-cli-win32-x64.zip",
          size: 7,
          exe: "aiq-cli.exe",
        },
        node: {
          file: "aiq-cli-node-win32-x64.zip",
          url: "https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/cli-1.2.3-test/aiq-cli-node-win32-x64.zip",
          size: 8,
          exe: "aiq-cli-node.exe",
        },
      },
    })

    const file = JSON.parse(await Bun.file(out).text())
    expect(file).toEqual(manifest)
  } finally {
    if (previousChannel === undefined) delete process.env.OPENCODE_CHANNEL
    else process.env.OPENCODE_CHANNEL = previousChannel
    if (previousTarget === undefined) delete process.env.OPENCODE_TARGET
    else process.env.OPENCODE_TARGET = previousTarget
    await rm(dir, { recursive: true, force: true })
  }
})

test("writeCliManifest omits node asset when node build is missing", async () => {
  const dir = await mkdtemp(path.join(os.tmpdir(), "aiq-cli-manifest-"))
  const previousTarget = process.env.OPENCODE_TARGET
  process.env.OPENCODE_TARGET = "windows-x64"

  try {
    const cli = getCurrentCli()
    const bunPkg = path.join(dir, "dist", cli.package.replace("@opencode/", ""))
    await mkdir(path.join(bunPkg, "bin"), { recursive: true })
    await writeFile(path.join(bunPkg, "package.json"), JSON.stringify({ version: "9.9.9" }))
    await writeFile(path.join(bunPkg, "bin", "opencode.exe"), "bun")

    const manifest = await writeCliManifest(path.join(dir, "dist"), {
      out: path.join(dir, "resources", "cli-manifest.json"),
      channel: "dev",
    })

    expect(manifest.assets.bun.exe).toBe("aiq-cli.exe")
    expect(manifest.assets.node).toBeUndefined()
  } finally {
    if (previousTarget === undefined) delete process.env.OPENCODE_TARGET
    else process.env.OPENCODE_TARGET = previousTarget
    await rm(dir, { recursive: true, force: true })
  }
})
