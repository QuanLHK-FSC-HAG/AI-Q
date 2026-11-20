import { Button } from "@opencode/ui/button"
import { Checkbox } from "@opencode/ui/checkbox"
import { TextInput } from "@opencode/ui/text-input"
import { Schema } from "effect"
import { Show, createEffect, createMemo, on, onCleanup, onMount } from "solid-js"
import { createStore } from "solid-js/store"
import { usePlatform, type SecureProfile } from "@/runtime/platform/platform"
import { Persist, persisted } from "@/runtime/persistence/storage"
import { Persistence } from "@/runtime/persistence/schema"
import {
  APP_NAME,
  PRIVACY_POLICY_VI,
  PRIVACY_VERSION,
  TERMS_OF_USE_VI,
  TERMS_VERSION,
  openProfile,
  sealProfile,
  type StoredProfile,
} from "@/settings/about/default-info"

const AIQProfileSchema = Persistence.struct({
  sealed: Schema.String,
})

type Status = "checking" | "required" | "ready"

function isComplete(profile: SecureProfile | StoredProfile | null | undefined) {
  if (!profile) return false
  const name = typeof profile.userName === "string" ? profile.userName.trim() : ""
  if (!name) return false
  return profile.termsVersion === TERMS_VERSION && profile.privacyVersion === PRIVACY_VERSION && !!profile.acceptedAt
}

function normalizeProfile(profile: SecureProfile | StoredProfile | null | undefined): StoredProfile | null {
  if (!profile) return null
  const name = typeof profile.userName === "string" ? profile.userName.trim() : ""
  if (!name) return null
  return {
    userName: name,
    ...(typeof profile.termsVersion === "string" && profile.termsVersion ? { termsVersion: profile.termsVersion } : {}),
    ...(typeof profile.privacyVersion === "string" && profile.privacyVersion
      ? { privacyVersion: profile.privacyVersion }
      : {}),
    ...(typeof profile.acceptedAt === "string" && profile.acceptedAt ? { acceptedAt: profile.acceptedAt } : {}),
  }
}

function sameProfile(a: StoredProfile | null, b: StoredProfile | null) {
  if (!a && !b) return true
  if (!a || !b) return false
  return (
    a.userName === b.userName &&
    a.termsVersion === b.termsVersion &&
    a.privacyVersion === b.privacyVersion &&
    a.acceptedAt === b.acceptedAt
  )
}

export function RequiredSetupGate() {
  const platform = usePlatform()
  const [local, setLocal, , localReady] = persisted(Persist.global("aiq.profile"), AIQProfileSchema, { sealed: "" })
  const [state, setState] = createStore({
    status: "checking" as Status,
    name: "",
    acceptTerms: false,
    acceptPrivacy: false,
    saving: false,
    error: "",
    initialized: false,
  })

  const localProfile = createMemo(() => openProfile(local.sealed))

  const persistLocal = (profile: StoredProfile) => {
    setLocal("sealed", sealProfile(profile))
  }

  const completeWith = async (profile: StoredProfile) => {
    if (platform.platform === "desktop" && platform.setSecureProfile) {
      const ok = await platform.setSecureProfile(profile).catch(() => false)
      if (!ok) {
        setState({
          status: "required",
          saving: false,
          error: "Không thể lưu hồ sơ bảo mật trên thiết bị. Vui lòng thử lại.",
        })
        return false
      }
    }
    persistLocal(profile)
    setState({ status: "ready", saving: false, error: "" })
    return true
  }

  const init = async () => {
    if (state.initialized) return

    // Wait for local persisted store hydration so fallback reads are consistent.
    if (localReady && !localReady()) return

    const fallback = normalizeProfile(localProfile())

    if (platform.platform === "desktop" && platform.getSecureProfile) {
      const secure = normalizeProfile(await platform.getSecureProfile().catch(() => null))
      if (isComplete(secure)) {
        if (!sameProfile(secure, fallback) && secure) persistLocal(secure)
        setState({ status: "ready", initialized: true, name: secure?.userName ?? "" })
        return
      }

      let imported = secure
      if (!imported && platform.getInstallerProfile) {
        const installer = await platform.getInstallerProfile().catch(() => null)
        const name = installer?.userName?.trim() ?? ""
        const accepted = installer?.termsAccepted === true
        if (name || accepted) {
          imported = {
            userName: name,
            ...(accepted
              ? { termsVersion: TERMS_VERSION, privacyVersion: PRIVACY_VERSION, acceptedAt: new Date().toISOString() }
              : {}),
          }
        }
      }

      if (!imported && fallback) imported = fallback

      if (isComplete(imported) && imported) {
        if (platform.setSecureProfile) await platform.setSecureProfile(imported).catch(() => undefined)
        if (!sameProfile(imported, fallback)) persistLocal(imported)
        setState({ status: "ready", initialized: true, name: imported.userName })
        return
      }

      const acceptedCurrent =
        imported?.termsVersion === TERMS_VERSION &&
        imported?.privacyVersion === PRIVACY_VERSION &&
        !!imported?.acceptedAt

      setState({
        status: "required",
        initialized: true,
        name: imported?.userName ?? fallback?.userName ?? "",
        acceptTerms: !!acceptedCurrent,
        acceptPrivacy: !!acceptedCurrent,
        saving: false,
        error: "",
      })
      return
    }

    if (isComplete(fallback)) {
      setState({ status: "ready", initialized: true, name: fallback?.userName ?? "" })
      return
    }

    const acceptedCurrent =
      fallback?.termsVersion === TERMS_VERSION && fallback?.privacyVersion === PRIVACY_VERSION && !!fallback?.acceptedAt

    setState({
      status: "required",
      initialized: true,
      name: fallback?.userName ?? "",
      acceptTerms: !!acceptedCurrent,
      acceptPrivacy: !!acceptedCurrent,
      saving: false,
      error: "",
    })
  }

  createEffect(
    on(
      () => [localReady?.(), local.sealed, platform.platform],
      () => {
        void init()
      },
    ),
  )

  onMount(() => {
    // A hanging storage or IPC read must not leave the gate on "checking" forever. After a bounded wait the
    // user can set the profile by hand; `initialized` stays false so a late hydration still imports it.
    const fallback = setTimeout(() => {
      setState((current) => (current.status === "checking" ? { ...current, status: "required", error: "" } : current))
    }, 8_000)

    onCleanup(() => clearTimeout(fallback))
    void init()
  })

  const canSubmit = createMemo(() => {
    if (state.saving) return false
    if (!state.name.trim()) return false
    return state.acceptTerms && state.acceptPrivacy
  })

  const submit = async () => {
    const name = state.name.trim()
    if (!name) {
      setState({ error: "Vui lòng nhập tên người dùng." })
      return
    }
    if (!state.acceptTerms || !state.acceptPrivacy) {
      setState({ error: "Bạn cần xác nhận đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư để tiếp tục." })
      return
    }
    setState({ saving: true, error: "" })
    const profile: StoredProfile = {
      userName: name,
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      acceptedAt: new Date().toISOString(),
    }
    await completeWith(profile)
  }

  return (
    <Show when={state.status !== "ready"}>
      <div
        data-component="required-setup-gate"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-background-base/95 p-4 sm:p-6 overflow-auto"
      >
        <div class="w-full max-w-3xl rounded-xl border border-border-weak-base bg-background-stronger shadow-lg flex flex-col max-h-full">
          <div class="p-5 sm:p-6 border-b border-border-weak-base">
            <h1 class="text-16-medium text-text-strong">Thiết lập bắt buộc — {APP_NAME}</h1>
            <p class="mt-2 text-13-regular text-text-weak">
              Vui lòng nhập tên người dùng và xác nhận đồng ý Điều khoản sử dụng và Chính sách quyền riêng tư trước khi
              sử dụng ứng dụng.
            </p>
            <Show when={state.status === "checking"}>
              <p class="mt-3 text-12-regular text-text-weaker">Đang kiểm tra hồ sơ thiết lập…</p>
            </Show>
          </div>

          <Show when={state.status === "required"}>
            <div class="p-5 sm:p-6 overflow-auto flex flex-col gap-5">
              <div class="flex flex-col gap-2">
                <label class="text-13-medium text-text-strong" for="aiq-setup-username">
                  Tên người dùng <span class="text-icon-critical-base">*</span>
                </label>
                <TextInput
                  id="aiq-setup-username"
                  type="text"
                  appearance="base"
                  placeholder="Nhập tên người dùng"
                  value={state.name}
                  onInput={(event) => setState({ name: event.currentTarget.value, error: "" })}
                  aria-label="Tên người dùng"
                  disabled={state.saving}
                />
                <p class="text-12-regular text-text-weaker">
                  Tên được lưu trên thiết bị (ưu tiên lưu trữ bảo mật trên desktop) để hiển thị trong phiên bản.
                </p>
              </div>

              <div class="flex flex-col gap-3">
                <div class="flex flex-col gap-2">
                  <p class="text-13-medium text-text-strong">Điều khoản sử dụng ({TERMS_VERSION})</p>
                  <div class="rounded-md border border-border-weak-base bg-background-base p-3 max-h-48 overflow-auto">
                    <pre class="whitespace-pre-wrap text-12-regular text-text-weak font-sans">{TERMS_OF_USE_VI}</pre>
                  </div>
                  <label class="flex items-start gap-2 text-13-regular text-text-base cursor-pointer">
                    <Checkbox
                      checked={state.acceptTerms}
                      disabled={state.saving}
                      onChange={(checked: boolean) => setState({ acceptTerms: checked === true, error: "" })}
                    />
                    <span>Tôi đã đọc và đồng ý với Điều khoản sử dụng.</span>
                  </label>
                </div>

                <div class="flex flex-col gap-2">
                  <p class="text-13-medium text-text-strong">Chính sách quyền riêng tư ({PRIVACY_VERSION})</p>
                  <div class="rounded-md border border-border-weak-base bg-background-base p-3 max-h-48 overflow-auto">
                    <pre class="whitespace-pre-wrap text-12-regular text-text-weak font-sans">{PRIVACY_POLICY_VI}</pre>
                  </div>
                  <label class="flex items-start gap-2 text-13-regular text-text-base cursor-pointer">
                    <Checkbox
                      checked={state.acceptPrivacy}
                      disabled={state.saving}
                      onChange={(checked: boolean) => setState({ acceptPrivacy: checked === true, error: "" })}
                    />
                    <span>Tôi đã đọc và đồng ý với Chính sách quyền riêng tư.</span>
                  </label>
                </div>
              </div>

              <Show when={state.error}>
                <p class="text-13-regular text-icon-critical-base" role="alert">
                  {state.error}
                </p>
              </Show>
            </div>

            <div class="p-5 sm:p-6 border-t border-border-weak-base flex items-center justify-end gap-2">
              <Button variant="contrast" disabled={!canSubmit()} onClick={() => void submit()}>
                {state.saving ? "Đang lưu…" : "Xác nhận và tiếp tục"}
              </Button>
            </div>
          </Show>
        </div>
      </div>
    </Show>
  )
}
