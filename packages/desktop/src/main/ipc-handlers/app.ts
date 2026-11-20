import { app, BrowserWindow } from "electron"
import { parseDesktopNativeBundle } from "@opencode/app/i18n/desktop-native"
import { Effect } from "effect"
import { execFile } from "node:child_process"
import { readFile } from "node:fs/promises"
import path from "node:path"
import { promisify } from "node:util"
import { AppRpcs } from "../../shared/ipc-rpc"
import { checkAppExists, resolveAppPath } from "../files/apps"
import { setForceFocus } from "../native/debug"
import { DesktopLogging, scoped } from "../native/logging"
import { getSpellcheckEnabled, setSpellcheckEnabled } from "../native/spellcheck"
import { setNativeTranslations } from "../native/translations"
import { IpcPortHandoff } from "../ipc-transport"
import { ApplicationLifecycle } from "../lifecycle"
import { finishFirstLaunchOnboarding, isFirstLaunchOnboardingPending } from "../lifecycle/onboarding"
import { BackgroundService } from "../service/background-service"
import { SidecarCredentials } from "../service/sidecar-credentials"
import { getWindowID, setBackgroundColor } from "../windows"
import { readSecureProfile, writeSecureProfile } from "../storage/secure-profile"
import { sender } from "./context"

const execFileAsync = promisify(execFile)

export const appHandlers = AppRpcs.toLayer(
  Effect.gen(function* () {
    const handoff = yield* IpcPortHandoff
    const lifecycle = yield* ApplicationLifecycle.Service
    const background = yield* BackgroundService.Service
    const logging = yield* DesktopLogging.Service

    return AppRpcs.of({
      AppAwaitInitialization: () => background.connection.pipe(Effect.map(SidecarCredentials.ready)),
      AppReconnectService: () => background.reconnect.pipe(Effect.map(SidecarCredentials.ready)),
      AppReadyDeepLinks: (_request, context) =>
        Effect.sync(() => {
          const contents = sender(handoff, context)
          const win = BrowserWindow.fromWebContents(contents)
          // Only an app window's own renderer receives deep links, not one embedded in it.
          const id = win?.webContents === contents ? getWindowID(win) : undefined

          if (id) lifecycle.deepLinks.ready(id, context.client.id)
        }),
      AppAcknowledgeDeepLinks: ({ attempt }, context) =>
        Effect.sync(() => lifecycle.deepLinks.acknowledge(context.client.id, attempt)),
      AppIsFirstLaunchOnboardingPending: isFirstLaunchOnboardingPending,
      AppFinishFirstLaunchOnboarding: ({ createDefaultProject }) =>
        finishFirstLaunchOnboarding(createDefaultProject).pipe(Effect.orDie),
      AppCheckAppExists: ({ appName }) => checkAppExists(appName).pipe(Effect.orDie),
      AppResolveAppPath: ({ appName }) => resolveAppPath(appName).pipe(Effect.orDie),
      AppSetBackgroundColor: ({ color }) => Effect.sync(() => setBackgroundColor(color)),
      AppGetSpellcheckEnabled: () => Effect.sync(getSpellcheckEnabled),
      AppSetSpellcheckEnabled: ({ enabled }) => Effect.sync(() => setSpellcheckEnabled(enabled)),
      AppExportDebugLogs: () => logging.exportDebug,
      AppSetForceFocus: ({ enabled }, context) => promise(() => setForceFocus(sender(handoff, context), enabled)),
      AppRecordFatalRendererError: ({ error }) =>
        scoped("renderer", Effect.logError("fatal renderer error", { ...error })),
      AppSetNativeTranslations: ({ value }, context) =>
        Effect.sync(() => {
          const contents = sender(handoff, context)
          const win = BrowserWindow.fromWebContents(contents)

          if (!win || win.isDestroyed() || win.webContents !== contents) {
            throw new Error("Invalid native translation sender")
          }

          const bundle = parseDesktopNativeBundle(value)

          if (!bundle) throw new Error("Invalid native translation bundle")

          // An installed menu rebuilds through the translation listener in `ipc.ts`.
          setNativeTranslations(bundle)
        }),
      AppRelaunch: () => Effect.sync(lifecycle.relaunch),
      AppGetSecureProfile: () =>
        Effect.tryPromise({
          try: () => readSecureProfile(),
          catch: () => null,
        }).pipe(Effect.orElseSucceed(() => null)),
      AppSetSecureProfile: ({ profile }) =>
        Effect.tryPromise({
          try: () =>
            writeSecureProfile({
              v: 1,
              userName: profile.userName,
              termsVersion: profile.termsVersion,
              privacyVersion: profile.privacyVersion,
              acceptedAt: profile.acceptedAt,
            }),
          catch: () => false,
        }).pipe(Effect.orElseSucceed(() => false)),
      AppGetInstallerProfile: () =>
        Effect.tryPromise({
          try: () => readInstallerProfile(),
          catch: () => null,
        }).pipe(Effect.orElseSucceed(() => null)),
    })
  }),
)

function promise<A>(evaluate: () => A | Promise<A>) {
  return Effect.tryPromise(async () => evaluate()).pipe(Effect.orDie)
}

async function readInstallerProfile(): Promise<{ userName?: string; termsAccepted?: boolean } | null> {
  if (process.platform !== "win32") return null
  const keys = [
    `HKCU\\Software\\com.quanlhk.AIQ.desktop`,
    `HKCU\\Software\\${app.getName?.() ?? "AI-Q"}`,
    `HKCU\\Software\\AI-Q`,
  ]
  const uniq = [...new Set(keys)]
  for (const key of uniq) {
    const userName = await readRegString(key, "UserName")
    const terms = await readRegString(key, "TermsAccepted")
    if (userName || terms) {
      return {
        userName: userName ?? undefined,
        termsAccepted: terms ? terms === "1" || terms.toLowerCase() === "true" : undefined,
      }
    }
  }
  // Fallback: file written by installer in userData parent/common locations
  try {
    const file = path.join(app.getPath("userData"), "installer-profile.json")
    const raw = await readFile(file, "utf8")
    const parsed = JSON.parse(raw) as { userName?: unknown; termsAccepted?: unknown }
    const userName = typeof parsed.userName === "string" ? parsed.userName : undefined
    const termsAccepted = typeof parsed.termsAccepted === "boolean" ? parsed.termsAccepted : undefined
    if (userName || termsAccepted !== undefined) return { userName, termsAccepted }
  } catch {}
  return null
}

async function readRegString(key: string, name: string): Promise<string | null> {
  try {
    const { stdout } = await execFileAsync("reg", ["query", key, "/v", name], { windowsHide: true })
    // Match line like:    UserName    REG_SZ    Alice
    const re = new RegExp(`\\b${name}\\b\\s+REG_\\w+\\s+(.+)$`, "im")
    const m = stdout.match(re)
    if (!m) return null
    const value = m[1]?.trim() ?? ""
    return value || null
  } catch {
    return null
  }
}
