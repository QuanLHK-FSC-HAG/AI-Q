import { chmod, copyFile, mkdir, mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { basename, dirname, join } from "node:path"
import { Option, Schema } from "effect"

const Manifest = Schema.fromJsonString(Schema.Struct({ version: Schema.NonEmptyString }))

export type Channel = "dev" | "beta" | "prod"

export type CliAsset = {
  file: string
  url: string
  size: number
  sha256?: string
  exe: string
}

export type CliManifest = {
  version: string
  channel: Channel
  tag: string
  assets: Record<string, CliAsset>
}

export function resolveChannel(): Channel {
  const raw = process.env.OPENCODE_CHANNEL

  if (raw === "dev" || raw === "beta" || raw === "prod") return raw

  if (raw === "latest") return "prod"

  return "dev"
}

export const CLI_BINARIES: Array<{ target: string; package: string; os: string; cpu: string }> = [
  {
    target: "darwin-arm64",
    package: "@opencode/cli-darwin-arm64",
    os: "darwin",
    cpu: "arm64",
  },
  {
    target: "darwin-x64",
    package: "@opencode/cli-darwin-x64-baseline",
    os: "darwin",
    cpu: "x64",
  },
  {
    target: "windows-arm64",
    package: "@opencode/cli-windows-arm64",
    os: "win32",
    cpu: "arm64",
  },
  {
    target: "windows-x64",
    package: "@opencode/cli-windows-x64-baseline",
    os: "win32",
    cpu: "x64",
  },
  {
    target: "linux-x64",
    package: "@opencode/cli-linux-x64-baseline",
    os: "linux",
    cpu: "x64",
  },
  {
    target: "linux-arm64",
    package: "@opencode/cli-linux-arm64",
    os: "linux",
    cpu: "arm64",
  },
]

function nativeTarget() {
  const { platform, arch } = process

  if (platform === "darwin") return arch === "arm64" ? "darwin-arm64" : "darwin-x64"

  if (platform === "win32") return arch === "arm64" ? "windows-arm64" : "windows-x64"

  if (platform === "linux") return arch === "arm64" ? "linux-arm64" : "linux-x64"
  throw new Error(`Unsupported platform: ${platform}/${arch}`)
}

// Bun needs Windows 10 1809 (build 17763) or newer for ConPTY. The Node SEA build of the same CLI keeps
// Windows 10 1607/Server 2016 working, so Windows installers bundle both and the desktop picks the Node
// build on older systems (or when Bun fails to load). See resolveBundledCli in src/main/service/desktop-cli.ts.
export function getCurrentNodeCli(target = process.env.OPENCODE_TARGET ?? nativeTarget()) {
  const cli = getCurrentCli(target)
  const platform = cli.os === "win32" ? "windows" : cli.os

  return {
    ...cli,
    package: `@opencode/cli-node-${platform}-${cli.cpu}`,
    binary: cli.os === "win32" ? "opencode2-node.exe" : "opencode2-node",
  }
}

export function getCurrentCli(target = process.env.OPENCODE_TARGET ?? nativeTarget()) {
  const binaryConfig = CLI_BINARIES.find((item) => item.target === target)

  if (!binaryConfig) throw new Error(`CLI configuration not available for target '${target}'`)

  return binaryConfig
}

export function nodePtyPackage(target?: string) {
  const cli = getCurrentCli(target)

  return `@lydell/node-pty-${cli.os}-${cli.cpu}`
}

export function cliResourceName() {
  return windowsify("resources/aiq-cli")
}

export function nodeCliResourceName() {
  return windowsify("resources/aiq-cli-node")
}

export async function copyBuiltCliToResources(root: string, dest = cliResourceName()) {
  const cli = getCurrentCli()
  const directory = cli.package.replace("@opencode/", "")
  await copyCliToResources(join(root, directory), dest)
}

export async function copyBuiltNodeCliToResources(root: string, dest = nodeCliResourceName()) {
  const cli = getCurrentNodeCli()
  const directory = cli.package.replace("@opencode/", "")
  const pkg = join(root, directory)
  await copyFile(join(pkg, "bin", cli.binary), dest)
  await prepareCli(dest)
  await writeVersionFile(pkg, dest)
}

// The package directory is an npm package: its package.json version is the string the executable
// prints for --version. Writing it next to the executable spares the desktop a ~400 ms spawn of the
// 200 MB binary on first launch.
async function copyCliToResources(pkg: string, dest: string) {
  const cli = getCurrentCli()
  await copyFile(join(pkg, "bin", cli.os === "win32" ? "opencode.exe" : "opencode"), dest)
  await prepareCli(dest)
  await writeVersionFile(pkg, dest)
}

export async function readCliPackageVersion(pkg: string) {
  const manifest = Option.getOrUndefined(
    Schema.decodeUnknownOption(Manifest)(await Bun.file(join(pkg, "package.json")).text()),
  )

  if (!manifest) throw new Error(`Bundled CLI package has no version: ${pkg}`)
  return manifest.version
}

async function writeVersionFile(pkg: string, dest: string) {
  const version = await readCliPackageVersion(pkg)
  await Bun.write(versionFile(dest), version)
}

export function versionFile(cli: string) {
  return join(dirname(cli), `${basename(cli).replace(/\.exe$/i, "")}.version`)
}

async function prepareCli(dest: string) {
  const { $ } = await import("bun")

  if (process.platform !== "win32") await chmod(dest, 0o755)

  if (process.platform === "darwin") await $`codesign --force --sign - ${dest}`
}

export function windowsify(path: string) {
  if (path.endsWith(".exe")) return path

  return `${path}${process.platform === "win32" ? ".exe" : ""}`
}

export async function downloadCliToResources(version = "dev", dest = cliResourceName()) {
  const { $ } = await import("bun")
  const cli = getCurrentCli()
  const directory = await mkdtemp(join(tmpdir(), "opencode-cli-"))

  try {
    await $`bun install --no-save --cwd ${directory} ${`${cli.package}@${version}`} ${`--os=${cli.os}`} ${`--cpu=${cli.cpu}`}`
    const pkg = join(directory, "node_modules", cli.package)
    await copyFile(join(pkg, "bin", cli.os === "win32" ? "opencode.exe" : "opencode"), dest)
    await prepareCli(dest)
    await writeVersionFile(pkg, dest)
  } finally {
    await rm(directory, { recursive: true, force: true })
  }

  console.log(`Copied ${cli.package}@${version} to ${dest}`)
}

export async function writeCliManifest(
  cliRoot: string,
  opts?: { nodeRoot?: string; out?: string; channel?: Channel },
): Promise<CliManifest> {
  const cli = getCurrentCli()
  const channel = opts?.channel ?? resolveChannel()
  const pkg = join(cliRoot, cli.package.replace("@opencode/", ""))
  const version = await readCliPackageVersion(pkg)
  const tag = `cli-${version}`
  const base = `https://github.com/QuanLHK-FSC-HAG/AI-Q/releases/download/${tag}`

  const assets: Record<string, CliAsset> = {}
  const bunExe = join(pkg, "bin", cli.os === "win32" ? "opencode.exe" : "opencode")
  const bunFile = await Bun.file(bunExe)
  assets.bun = {
    file: `aiq-cli-${cli.os}-${cli.cpu}.zip`,
    url: `${base}/aiq-cli-${cli.os}-${cli.cpu}.zip`,
    size: bunFile.size,
    exe: cli.os === "win32" ? "aiq-cli.exe" : "aiq-cli",
  }

  if (opts?.nodeRoot) {
    const nodeCli = getCurrentNodeCli()
    const nodePkg = join(opts.nodeRoot, nodeCli.package.replace("@opencode/", ""))
    const nodeExe = join(nodePkg, "bin", nodeCli.binary)
    const nodeFile = await Bun.file(nodeExe)
    if (nodeFile.size > 0) {
      assets.node = {
        file: `aiq-cli-node-${cli.os}-${cli.cpu}.zip`,
        url: `${base}/aiq-cli-node-${cli.os}-${cli.cpu}.zip`,
        size: nodeFile.size,
        exe: cli.os === "win32" ? "aiq-cli-node.exe" : "aiq-cli-node",
      }
    }
  }

  const manifest: CliManifest = { version, channel, tag, assets }
  const out = opts?.out ?? join("resources", "cli-manifest.json")
  await mkdir(dirname(out), { recursive: true })
  await Bun.write(out, JSON.stringify(manifest, null, 2) + "\n")
  return manifest
}
