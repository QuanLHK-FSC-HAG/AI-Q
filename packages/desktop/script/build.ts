#!/usr/bin/env bun
import { $ } from "bun"
import { exists, mkdir } from "node:fs/promises"
import path from "node:path"
import { getCurrentCli, getCurrentNodeCli, resolveChannel, writeCliManifest } from "./utils"
import { verifyBundles } from "./verify-bundles"

// Prepares resources/ (icons, metainfo, CLI manifest) for OPENCODE_CHANNEL and builds the app into out/.
// Production installers download the CLI from GitHub at install time; the manifest in resources tells the
// installer/app which version and asset to fetch. Local built CLIs in ../cli/dist are used to generate the
// manifest (and to pack release assets separately).
const dir = path.resolve(import.meta.dir, "..")

const cli = path.resolve(dir, "../cli/dist")

const channel = resolveChannel()

process.chdir(dir)

await $`bun ./script/copy-icons.ts ${channel}`

await $`bun ./script/copy-metainfo.ts ${channel}`

const built = await exists(path.join(cli, getCurrentCli().package.replace("@opencode/", "")))
const nodeCli = path.join(cli, "node")
const nodeBuilt =
  built && getCurrentCli().os === "win32"
    ? await exists(path.join(nodeCli, getCurrentNodeCli().package.replace("@opencode/", "")))
    : false

if (channel === "prod" && !built)
  throw new Error(`Production desktop builds require the CLI in ${cli}; build it first`)

if (channel === "prod" && getCurrentCli().os === "win32" && !nodeBuilt)
  throw new Error(
    `Windows production desktop builds require the Node CLI fallback in ${nodeCli}; run 'bun run build:node' in packages/cli first`,
  )

await mkdir("resources", { recursive: true })
await mkdir(path.join("resources", "windows"), { recursive: true })

if (built) {
  const manifest = await writeCliManifest(cli, {
    nodeRoot: nodeBuilt ? nodeCli : undefined,
    out: path.join("resources", "cli-manifest.json"),
    channel,
  })
  await writeCliNsisVars(manifest)
} else {
  // Dev/beta without a local CLI build: write a placeholder manifest so packaging succeeds.
  // The app will not be able to start a server until a matching CLI is provided.
  const version = process.env.OPENCODE_VERSION ?? "dev"
  const manifest = { version, channel, tag: `cli-${version}`, assets: {} }
  await Bun.write(
    path.join("resources", "cli-manifest.json"),
    JSON.stringify(manifest, null, 2) + "\n",
  )
  await writeCliNsisVars(manifest as any)
  console.warn(`No local CLI in ${cli}; wrote placeholder CLI manifest for ${channel}`)
}

async function writeCliNsisVars(manifest: {
  version: string
  tag: string
  assets: Record<string, { file: string; url: string; exe: string; size: number }>
}) {
  const bun = manifest.assets.bun
  const node = manifest.assets.node
  const lines = [
    `!define AIQ_CLI_VERSION "${manifest.version}"`,
    `!define AIQ_CLI_TAG "${manifest.tag}"`,
    `!define AIQ_CLI_BUN_URL "${bun?.url ?? ""}"`,
    `!define AIQ_CLI_BUN_FILE "${bun?.file ?? ""}"`,
    `!define AIQ_CLI_BUN_EXE "${bun?.exe ?? ""}"`,
    `!define AIQ_CLI_BUN_SIZE "${bun?.size ?? 0}"`,
    `!define AIQ_CLI_NODE_URL "${node?.url ?? ""}"`,
    `!define AIQ_CLI_NODE_FILE "${node?.file ?? ""}"`,
    `!define AIQ_CLI_NODE_EXE "${node?.exe ?? ""}"`,
    `!define AIQ_CLI_NODE_SIZE "${node?.size ?? 0}"`,
    "",
  ]
  await Bun.write(path.join("resources", "windows", "cli-vars.nsh"), lines.join("\n"))
}

await $`bunx electron-vite build`

await verifyBundles(path.join(dir, "out"))
