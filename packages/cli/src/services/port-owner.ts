import { AppProcess } from "@opencode/util/process"
import { Effect } from "effect"
import { ChildProcess } from "effect/process"
import net from "node:net"

export * as PortOwner from "./port-owner"

export type Owner = {
  readonly pid: number
  /** Image name on Windows, full command line elsewhere. */
  readonly command?: string
}

// Best effort: names the process listening on a TCP port so a failed bind can say who holds it.
export const describe = Effect.fnUntraced(function* (port: number, hostname?: string) {
  const owner = yield* lookup(port, hostname)
  if (owner === undefined) return undefined
  const command = owner.command?.replace(/\s+/g, " ").trim()
  if (!command) return `PID ${owner.pid}`
  return `PID ${owner.pid} (${command.length > 200 ? command.slice(0, 199) + "…" : command})`
})

export const lookup = Effect.fnUntraced(function* (port: number, hostname?: string) {
  const appProcess = yield* AppProcess.Service
  const run = (command: string, args: ReadonlyArray<string>, maxOutputBytes = 4096) =>
    appProcess
      .run(ChildProcess.make(command, args, { stdin: "ignore", killSignal: "SIGKILL" }), {
        timeout: "1 second",
        maxOutputBytes,
      })
      .pipe(
        Effect.map((result) => (result.exitCode === 0 ? result.stdout.toString("utf8").trim() : "")),
        Effect.orElseSucceed(() => ""),
      )

  if (process.platform === "win32") {
    // netstat lists every connection; a busy machine needs far more than the default 4 KB.
    const pid = windowsListener(yield* run("netstat", ["-ano", "-p", "tcp"], 1024 * 1024), port, hostname)
    if (pid === undefined) return undefined
    const name = processName(yield* run("tasklist", ["/FI", `PID eq ${pid}`, "/FO", "CSV", "/NH"]))
    return { pid, command: name } satisfies Owner
  }

  const pid = listeners(yield* run("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:LISTEN", "-Fpn"])).find((listener) =>
    matches(listener.address, hostname),
  )?.pid
  if (pid === undefined) return undefined
  const command = yield* run("ps", ["-o", "command=", "-p", pid])
  return { pid: Number(pid), command: command || undefined } satisfies Owner
})

function windowsListener(output: string, port: number, hostname: string | undefined) {
  for (const line of output.split(/\r?\n/)) {
    const fields = line.trim().split(/\s+/)
    if (fields.length < 5) continue
    const [proto, local, , state, pid] = fields
    if (proto !== "TCP" || state !== "LISTENING" || !local.endsWith(`:${port}`)) continue
    if (!/^\d+$/.test(pid)) continue
    if (!matches(local.slice(0, local.lastIndexOf(":")), hostname)) continue
    return Number(pid)
  }
  return undefined
}

// `tasklist /FO CSV /NH` prints `"aiq-cli.exe","16784","Console","1","..."`.
function processName(output: string) {
  return /^"([^"]+)"/.exec(output)?.[1] || undefined
}

function listeners(output: string) {
  const found: { pid: string; address: string }[] = []
  let pid: string | undefined
  for (const line of output.split("\n")) {
    if (line.startsWith("p")) pid = /^\d+$/.test(line.slice(1)) ? line.slice(1) : undefined
    if (line.startsWith("n") && pid !== undefined)
      found.push({ pid, address: line.slice(1, line.lastIndexOf(":")).replace(/^\[(.*)\]$/, "$1") })
  }
  return found
}

// lsof shows wildcard listeners as `*`, netstat as `0.0.0.0` or `::`; those hold the port for any address.
function matches(address: string, hostname: string | undefined) {
  if (address === "*" || address === "0.0.0.0" || address === "::") return true
  const host = hostname?.replace(/^\[(.*)\]$/, "$1")
  if (host === undefined || net.isIP(host) === 0 || host === "0.0.0.0" || host === "::") return true
  return address === host
}
