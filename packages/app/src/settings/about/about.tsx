import { Show, createEffect, createMemo, createSignal, on, onCleanup, untrack } from "solid-js"
import { writeClipboard } from "@opencode/session-ui/copy"
import { useDialog } from "@opencode/ui/context/dialog"
import { Tooltip } from "@opencode/ui/tooltip"
import { TextInput } from "@opencode/ui/text-input"
import { Button } from "@opencode/ui/button"
import { Collapsible } from "@opencode/ui/collapsible"
import { Schema } from "effect"
import { AIQMark } from "@opencode/ui/logo"
import { useLanguage } from "@/runtime/i18n/language"
import { usePlatform } from "@/runtime/platform/platform"
import { ExternalLink } from "@/runtime/platform/external-link"
import { showToast } from "@/shell/notifications/toast"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { Persistence } from "@/runtime/persistence/schema"
import {
  APP_NAME,
  AUTHOR,
  COPYRIGHT,
  DOCS_URL,
  GITHUB_URL,
  LICENSE_LABEL,
  PRIVACY_POLICY_VI,
  PRIVACY_VERSION,
  QUOTA_WARNING,
  README_MD,
  TAGLINE,
  TERMS_OF_USE_VI,
  TERMS_VERSION,
  WATERMARK,
  displayVersion,
  openProfile,
  readBundledInfo,
  sealProfile,
  type StoredProfile,
} from "./default-info"
import {
  INITIAL_ABOUT_COPY_STATE,
  selectAboutCopyView,
  transitionAboutCopy,
  type AboutCopyEffect,
  type AboutCopyEvent,
} from "./machine"

export const AIQProfileSchema = Persistence.struct({
  sealed: Schema.String,
})

type Profile = StoredProfile

function sameProfile(a: Profile | null | undefined, b: Profile | null | undefined) {
  return (
    (a?.userName ?? "") === (b?.userName ?? "") &&
    (a?.termsVersion ?? "") === (b?.termsVersion ?? "") &&
    (a?.privacyVersion ?? "") === (b?.privacyVersion ?? "") &&
    (a?.acceptedAt ?? "") === (b?.acceptedAt ?? "")
  )
}

function acceptanceStatus(profile: Profile | null | undefined) {
  if (!profile?.termsVersion && !profile?.privacyVersion && !profile?.acceptedAt) return ""
  const parts = [] as string[]
  if (profile.termsVersion) parts.push(`Điều khoản ${profile.termsVersion}`)
  if (profile.privacyVersion) parts.push(`Quyền riêng tư ${profile.privacyVersion}`)
  const label = parts.length ? parts.join(" · ") : "đã lưu"
  if (profile.acceptedAt) return `Đã chấp thuận (${label}) lúc ${profile.acceptedAt}`
  return `Đã chấp thuận (${label})`
}

export function SettingsAbout(props: { active: boolean }) {
  const language = useLanguage()
  const platform = usePlatform()
  const dialog = useDialog()
  const info = readBundledInfo()

  const [fallback, setFallback] = persisted(Persist.global("aiq.profile"), AIQProfileSchema, { sealed: "" })
  const fallbackProfile = createMemo(() => openProfile(fallback.sealed))

  const secureMode = () => typeof platform.getSecureProfile === "function" && typeof platform.setSecureProfile === "function"
  const [secureState, setSecureState] = createSignal<Profile | null | undefined>(undefined)
  const [secureReady, setSecureReady] = createSignal(false)

  const effective = createMemo<Profile | null>(() => {
    if (secureMode()) {
      if (secureReady()) return secureState() ?? null
      return fallbackProfile()
    }
    return fallbackProfile()
  })

  const storedName = createMemo(() => effective()?.userName?.trim() ?? "")
  const [nameInput, setNameInput] = createSignal("")

  let loadToken = 0
  const loadSecure = async () => {
    if (!secureMode() || !platform.getSecureProfile) return
    const token = ++loadToken
    let failed = false
    try {
      let profile = (await platform.getSecureProfile()) as Profile | null
      if (token !== loadToken) return

      if (!profile && platform.getInstallerProfile) {
        const installer = await platform.getInstallerProfile().catch(() => null)
        if (token !== loadToken) return
        const userName = installer?.userName?.trim() ?? ""
        const accepted = !!installer?.termsAccepted
        if (userName || accepted) {
          const imported: Profile = {
            userName,
            ...(accepted
              ? { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, acceptedAt: new Date().toISOString() }
              : {}),
          }
          const saved = await platform.setSecureProfile?.(imported).catch(() => false)
          if (token !== loadToken) return
          if (saved) profile = imported
          else {
            persistFallback(imported)
            profile = imported
          }
        }
      }

      if (token !== loadToken) return
      setSecureState(profile ?? null)
    } catch {
      failed = true
      if (token !== loadToken) return
    } finally {
      if (token === loadToken) setSecureReady(!failed)
    }
  }

  createEffect(
    on(
      () => props.active,
      (active) => {
        if (!active) return
        if (secureMode()) void loadSecure()
      },
    ),
  )

  createEffect(
    on(
      () => [props.active, storedName(), secureReady(), secureMode()] as const,
      ([active]) => {
        if (!active) return
        if (secureMode() && !secureReady()) return
        // Keep the input in sync with the stored name when opening About / after load.
        setNameInput(storedName())
      },
    ),
  )

  const display = createMemo(() => displayVersion(storedName() || undefined))
  const build = () => platform.version ?? "dev"
  const acceptedText = createMemo(() => acceptanceStatus(effective()))

  const [copyState, setCopyState] = createSignal(INITIAL_ABOUT_COPY_STATE)
  const copy = createMemo(() => selectAboutCopyView(copyState()))
  let copyTimer: ReturnType<typeof setTimeout> | undefined

  const dispatchCopy = (event: AboutCopyEvent) =>
    untrack(() => {
      const previous = copyState()
      const next = transitionAboutCopy(previous, event)

      if (next.state !== previous) setCopyState(next.state)
      next.effects.forEach(runCopyEffect)
    })

  function runCopyEffect(effect: AboutCopyEffect) {
    if (effect.type === "timer.clear") return clearTimeout(copyTimer)

    if (effect.type === "timer.schedule") {
      clearTimeout(copyTimer)
      copyTimer = setTimeout(() => dispatchCopy({ type: effect.event, attempt: effect.attempt }), effect.delayMs)
      return
    }

    if (effect.type === "toast.failed")
      return showToast({ variant: "error", title: language.t("settings.about.copyVersionFailed") })

    const attempt = effect.attempt
    void Promise.try(() =>
      platform.writeClipboardText ? platform.writeClipboardText(effect.text).then(() => true) : writeClipboard(effect.text),
    ).then(
      (written) => dispatchCopy({ type: written ? "copy.succeeded" : "copy.failed", attempt }),
      () => dispatchCopy({ type: "copy.failed", attempt }),
    )
  }

  createEffect(() => {
    if (!props.active) dispatchCopy({ type: "hidden" })
  })
  onCleanup(() => dispatchCopy({ type: "disposed" }))

  const persistFallback = (profile: Profile) => {
    setFallback("sealed", sealProfile(profile))
  }

  const saveName = async () => {
    const name = nameInput().trim()
    if (!name) {
      showToast({ variant: "error", title: "Vui lòng nhập tên người dùng" })
      return
    }

    const current = effective()
    const next: Profile = {
      userName: name,
      ...(current?.termsVersion ? { termsVersion: current.termsVersion } : {}),
      ...(current?.privacyVersion ? { privacyVersion: current.privacyVersion } : {}),
      ...(current?.acceptedAt ? { acceptedAt: current.acceptedAt } : {}),
    }

    if (secureMode() && platform.setSecureProfile) {
      const saved = await platform.setSecureProfile(next).catch(() => false)
      if (saved) {
        if (!sameProfile(secureState(), next)) setSecureState(next)
        setSecureReady(true)
        setNameInput(name)
        showToast({ variant: "success", title: "Đã lưu tên người dùng" })
        return
      }
    }

    persistFallback(next)
    setNameInput(name)
    showToast({ variant: "success", title: "Đã lưu tên người dùng" })
  }

  const clearName = async () => {
    if (secureMode() && platform.setSecureProfile) {
      const saved = await platform.setSecureProfile({ userName: "" }).catch(() => false)
      if (saved) {
        setSecureState({ userName: "" })
        setSecureReady(true)
        setNameInput("")
        return
      }
    }
    setNameInput("")
    setFallback("sealed", "")
  }

  const showNotices = async () => {
    const loaded = await import("./notices/dialog").catch(() => undefined)
    if (!loaded) {
      showToast({ variant: "error", title: language.t("settings.about.notices.loadFailed") })
      return
    }
    void dialog.show(() => <loaded.default />)
  }

  const copyText = () =>
    `${APP_NAME}\n${display()}\n${TAGLINE}\nTác giả: ${AUTHOR}\nDocs: ${DOCS_URL}\nGitHub: ${GITHUB_URL}\nGiấy phép: ${LICENSE_LABEL}`

  return (
    <div class="settings-about-content">
      <div class="settings-about-intro">
        <div class="settings-about-version-line">
          <Tooltip
            value={language.t(copy().copied ? "common.copied" : "ui.message.copy")}
            placement="top"
            forceOpen={copy().forceOpen}
          >
            <button
              type="button"
              class="settings-about-version"
              disabled={copy().disabled}
              aria-label={language.t(copy().copied ? "common.copied" : "ui.message.copy")}
              onClick={() => dispatchCopy({ type: "copy.requested", text: copyText() })}
            >
              <span>
                <bdi dir="ltr">{APP_NAME}</bdi> — <bdi dir="ltr">{display()}</bdi>
              </span>
            </button>
          </Tooltip>
        </div>
        <p class="text-12-regular text-v2-text-text-muted">
          Build: <bdi dir="ltr">{build()}</bdi> · Kênh: <bdi dir="ltr">{info.versionChannel}</bdi>
        </p>
        <p class="text-12-regular text-v2-text-text-muted">{TAGLINE}</p>
      </div>

      <AIQMark class="settings-about-wordmark" />

      <div class="settings-about-details flex flex-col gap-2">
        <p><strong>Tác giả:</strong> {AUTHOR}</p>
        <p><strong>Watermark:</strong> {WATERMARK}</p>
        <p>
          <strong>Tài liệu (docs):</strong>{" "}
          <ExternalLink href={DOCS_URL}>
            <bdi dir="ltr">{DOCS_URL}</bdi>
          </ExternalLink>
        </p>
        <p>
          <strong>GitHub:</strong>{" "}
          <ExternalLink href={GITHUB_URL}>
            <bdi dir="ltr">{GITHUB_URL}</bdi>
          </ExternalLink>
        </p>
        <p><strong>Giấy phép:</strong> {LICENSE_LABEL}</p>
        <p><strong>Bản quyền:</strong> {COPYRIGHT}</p>
      </div>

      <div class="settings-section flex flex-col gap-2">
        <p class="text-13-medium">Tên người dùng (cho phiên bản hiển thị)</p>
        <Show when={!storedName()}>
          <p class="text-12-regular text-v2-text-text-muted">
            Vui lòng nhập tên người dùng để hoàn tất phiên bản: “{info.versionTemplate}”.
          </p>
        </Show>
        <div class="flex items-end gap-2 flex-wrap">
          <div class="min-w-[240px] flex-1">
            <TextInput
              type="text"
              appearance="base"
              placeholder="Nhập tên người dùng"
              value={nameInput()}
              onInput={(event) => setNameInput(event.currentTarget.value)}
              aria-label="Tên người dùng"
            />
          </div>
          <Button variant="contrast" size="small" onClick={() => void saveName()}>Lưu</Button>
          <Show when={storedName() || effective()?.termsVersion || effective()?.privacyVersion}>
            <Button variant="ghost" size="small" onClick={() => void clearName()}>Xóa</Button>
          </Show>
        </div>
        <Show when={acceptedText()}>
          {(text) => <p class="text-12-regular text-v2-text-text-muted"><strong>Chấp thuận:</strong> {text()}</p>}
        </Show>
        <p class="text-11-regular text-v2-text-text-faint">
          <Show
            when={secureMode()}
            fallback={
              <>Thông tin được lưu cục bộ (mã hóa/che phủ, kiểm tra toàn vẹn). Nếu không giải mã được, ứng dụng sẽ dùng mặc định.</>
            }
          >
            Trên desktop, hồ sơ/chấp thuận được ưu tiên lưu gắn máy (mã hóa an toàn của hệ điều hành). Nếu không khả dụng, ứng dụng sẽ dùng lưu trữ cục bộ dự phòng.
          </Show>
        </p>
      </div>

      <div class="settings-about-details">
        <p class="text-12-regular text-v2-text-text-muted"><strong>Lưu ý quota/mạng & miễn phí:</strong> {QUOTA_WARNING}</p>
      </div>

      <div class="flex flex-col gap-2">
        <Collapsible>
          <Collapsible.Trigger class="settings-about-link flex items-center gap-2">
            <Collapsible.Arrow />
            <span>README (About / GitHub)</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <pre class="whitespace-pre-wrap text-12-regular text-v2-text-text-muted p-3 rounded-md bg-v2-surface-raised mt-2 max-h-[320px] overflow-auto">{README_MD.replace("{tên người dùng}", storedName() || "…")}</pre>
          </Collapsible.Content>
        </Collapsible>

        <Collapsible>
          <Collapsible.Trigger class="settings-about-link flex items-center gap-2">
            <Collapsible.Arrow />
            <span>Điều khoản sử dụng (Tiếng Việt)</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <p class="text-11-regular text-v2-text-text-faint mt-2 px-3">Phiên bản: {TERMS_VERSION}</p>
            <pre class="whitespace-pre-wrap text-12-regular text-v2-text-text-muted p-3 rounded-md bg-v2-surface-raised mt-2 max-h-[320px] overflow-auto">{TERMS_OF_USE_VI}</pre>
          </Collapsible.Content>
        </Collapsible>

        <Collapsible>
          <Collapsible.Trigger class="settings-about-link flex items-center gap-2">
            <Collapsible.Arrow />
            <span>Chính sách quyền riêng tư (Tiếng Việt)</span>
          </Collapsible.Trigger>
          <Collapsible.Content>
            <p class="text-11-regular text-v2-text-text-faint mt-2 px-3">Phiên bản: {PRIVACY_VERSION}</p>
            <pre class="whitespace-pre-wrap text-12-regular text-v2-text-text-muted p-3 rounded-md bg-v2-surface-raised mt-2 max-h-[320px] overflow-auto">{PRIVACY_POLICY_VI}</pre>
          </Collapsible.Content>
        </Collapsible>
      </div>

      <div class="settings-about-details">
        <p>{WATERMARK}</p>
        <p>
          <button type="button" class="settings-about-link" onClick={() => void showNotices()}>
            {language.t("settings.about.notices.title")}
          </button>
        </p>
      </div>

      <div class="settings-about-copyright">
        <p>{COPYRIGHT}</p>
      </div>
    </div>
  )
}
