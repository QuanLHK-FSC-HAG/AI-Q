import { app } from "electron"

type Channel = "local" | "dev" | "beta" | "prod"

const raw = import.meta.env.OPENCODE_CHANNEL

export const CHANNEL: Channel = raw === "local" || raw === "dev" || raw === "beta" || raw === "prod" ? raw : "dev"

export const VERSION = app.isPackaged ? app.getVersion() : (process.env.OPENCODE_VERSION ?? app.getVersion())

const appNames: Record<string, string> = {
  dev: "AI-Q Dev",
  beta: "AI-Q Beta",
  prod: "AI-Q",
}

const appIDs: Record<string, string> = {
  dev: "com.quanlhk.AIQ.desktop.dev",
  beta: "com.quanlhk.AIQ.desktop.beta",
  prod: "com.quanlhk.AIQ.desktop",
}

// Local renderer/server mode keeps the dev application identity.
export const APP_NAME = app.isPackaged ? appNames[CHANNEL] : "AI-Q Dev"

export const APP_ID = app.isPackaged ? appIDs[CHANNEL] : "com.quanlhk.AIQ.desktop.dev"
