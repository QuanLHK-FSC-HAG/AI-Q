import { For, Show, createEffect, createMemo, createSignal, type Component } from "solid-js"
import { createStore, produce } from "solid-js/store"
import { Switch } from "@opencode/ui/switch"
import { Select } from "@opencode/ui/select"
import { Button } from "@opencode/ui/button"
import { IconButton } from "@opencode/ui/icon-button"
import { TextInput } from "@opencode/ui/text-input"
import { Loader } from "@opencode/ui/loader"
import { useLanguage } from "@/runtime/i18n/language"
import { useServer } from "@/runtime/server/current"
import { useLocal } from "@/providers/models/selection"
import { useSettingsSurface } from "@/settings/surface"
import { SettingsList } from "@/settings/list"
import { SettingsRow } from "@/settings/row"
import { showToast } from "@/shell/notifications/toast"
import "@/settings/settings.css"

type Candidate = {
  providerID: string
  modelID: string
  variant?: string
  weight?: number
}

type Combo = {
  id: string
  name: string
  enabled?: boolean
  candidates: Candidate[]
}

type MixState = {
  loading: boolean
  saving: boolean
  refreshing: boolean
  hideReal: boolean
  combos: Combo[]
}

const weight = (candidate: Candidate) => (candidate.weight && candidate.weight > 0 ? Math.floor(candidate.weight) : 1)

const candidateID = (candidate: Candidate) => `${candidate.providerID}/${candidate.modelID}`

const normalizeCombo = (combo: {
  id: string
  name: string
  enabled?: boolean
  candidates: ReadonlyArray<{ providerID: string; modelID: string; variant?: string; weight?: number | string | null }>
}): Combo => ({
  id: combo.id,
  name: combo.name,
  enabled: combo.enabled,
  candidates: combo.candidates.map((candidate) => ({
    providerID: candidate.providerID,
    modelID: candidate.modelID,
    variant: candidate.variant,
    weight: candidate.weight === undefined || candidate.weight === null ? undefined : Number(candidate.weight),
  })),
})

const nextComboID = (combos: readonly Combo[]) => {
  const ids = new Set(combos.map((combo) => combo.id))
  const first = "aiq-mix"

  if (!ids.has(first)) return first

  for (let index = 2; ; index++) {
    if (!ids.has(`${first}-${index}`)) return `${first}-${index}`
  }
}

// SAFETY: JSON deep-clone only; plain data round-trips, object identity does not survive it.
const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T

export const SettingsMix: Component = () => {
  const language = useLanguage()
  const server = useServer()
  const local = useLocal()
  const surface = useSettingsSurface()

  const [store, setStore] = createStore<MixState>({ loading: true, saving: false, refreshing: false, hideReal: false, combos: [] })

  const save = async (patch: { hideReal?: boolean; combos?: Combo[] }) => {
    if (store.saving) return false
    setStore("saving", true)

    try {
      const output = await server.ctx.sdk.api.experimental.config.experimental.mix.set(clone(patch))
      setStore("hideReal", output.hideReal)
      setStore("combos", clone(output.combos).map(normalizeCombo))

      return true
    } catch {
      showToast({
        variant: "error",
        title: language.t("settings.mix.save.error"),
      })

      return false
    } finally {
      setStore("saving", false)
    }
  }

  const saveCombination = (combos: Combo[]) => save({ combos: clone(combos) })

  const refresh = async () => {
    if (store.refreshing) return
    setStore("refreshing", true)

    try {
      const output = await server.ctx.sdk.api.experimental.config.experimental.mix.refresh()
      setStore("hideReal", output.mix.hideReal)
      setStore("combos", clone(output.mix.combos).map(normalizeCombo))
      showToast({ variant: "success", title: language.t("settings.mix.refresh.success") })
    } catch {
      showToast({ variant: "error", title: language.t("settings.mix.refresh.error") })
    } finally {
      setStore("refreshing", false)
    }
  }

  // The mix is one global value; re-read it whenever the page mounts.
  createEffect(() => {
    if (surface.view().type !== "root" || surface.view().tab !== "mix") return

    void server.ctx.sdk.api.experimental.config.experimental.mix
      .get()
      .then((output) => setStore({ loading: false, hideReal: output.hideReal, combos: clone(output.combos).map(normalizeCombo) }))
      .catch(() => setStore("loading", false))
  })

  const modelMap = createMemo(() => new Map(local.model.list().map((item) => [candidateID({ providerID: item.provider.id, modelID: item.id }), item] as const)))

  const options = createMemo(() =>
    local.model.list().map((item) => ({ value: candidateID({ providerID: item.provider.id, modelID: item.id }), label: `${item.name} — ${item.provider.name}` })),
  )

  const toggleHideReal = (checked: boolean) => {
    setStore("hideReal", checked)
    void save({ hideReal: checked })
  }

  const mutate = (index: number, change: (combo: Combo) => void) =>
    setStore("combos", index, (combo) => {
      const next = clone(combo)
      change(next)

      return next
    })

  const editCombo = (index: number, change: (combo: Combo) => void) => {
    mutate(index, change)
    void saveCombination(clone(store.combos))
  }

  const removeCombo = (index: number) => {
    setStore("combos", produce((combos) => combos.splice(index, 1)))
    void saveCombination(clone(store.combos))
  }

  const addCombo = () => {
    setStore(
      "combos",
      produce((combos) =>
        combos.push({ id: nextComboID(combos), name: language.t("settings.mix.combo.new"), enabled: true, candidates: [] }),
      ),
    )
    void saveCombination(clone(store.combos))
  }

  const toggleCombo = (index: number, checked: boolean) => editCombo(index, (combo) => (combo.enabled = checked))

  return (
    <>
      <div class="settings-tab-header">
        <div class="settings-tab-header-row">
          <div class="flex flex-col gap-1">
            <h2 class="settings-tab-title">{language.t("settings.mix.title")}</h2>
            <span class="text-11-regular text-v2-text-text-muted">{language.t("settings.mix.description")}</span>
          </div>
          <Button
            variant="outline"
            size="small"
            disabled={store.refreshing || store.loading}
            onClick={() => void refresh()}
          >
            {store.refreshing ? language.t("settings.mix.refreshing") : language.t("settings.mix.refresh")}
          </Button>
        </div>
      </div>

      <div class="settings-tab-body">
        <div class="settings-section">
          <SettingsList>
            <SettingsRow
              title={language.t("settings.mix.hideReal.title")}
              description={language.t("settings.mix.hideReal.description")}
            >
              <div data-action="settings-mix-hide-real">
                <Switch checked={store.hideReal} onChange={toggleHideReal} hideLabel>
                  {language.t("settings.mix.hideReal.title")}
                </Switch>
              </div>
            </SettingsRow>
          </SettingsList>
        </div>

        <Show when={store.loading}>
          <div class="settings-models-status">
            <Loader class="h-4 w-4" />
            {language.t("common.loading")}
            {language.t("common.loading.ellipsis")}
          </div>
        </Show>

        <Show when={!store.loading}>
          <div class="settings-section">
            <div class="settings-tab-header-row">
              <div class="flex flex-col gap-1">
                <span class="text-13-medium">{language.t("settings.mix.combos.header")}</span>
                <span class="text-11-regular text-v2-text-text-muted">
                  {language.t("settings.mix.combos.description")}
                </span>
              </div>
              <Button variant="outline" size="small" icon="plus" onClick={addCombo}>
                {language.t("settings.mix.combo.add")}
              </Button>
            </div>

            <div class="flex flex-col gap-3 pt-3">
              <Show
                when={store.combos.length > 0}
                fallback={
                  <div class="settings-models-status">
                    <span>{language.t("settings.mix.combos.empty")}</span>
                  </div>
                }
              >
                <For each={store.combos}>
                  {(combo, index) => (
                    <ComboEditor
                      combo={combo}
                      options={options()}
                      modelMap={modelMap()}
                      onToggle={(checked) => toggleCombo(index(), checked)}
                      onRemove={() => removeCombo(index())}
                      onName={(name) => editCombo(index(), (draft) => (draft.name = name))}
                      onAddCandidate={(candidate) =>
                        editCombo(index(), (draft) => {
                          if (draft.candidates.some((item) => candidateID(item) === candidateID(candidate))) return
                          draft.candidates.push({ ...candidate, weight: 1 })
                        })
                      }
                      onRemoveCandidate={(candidateIndex) =>
                        editCombo(index(), (draft) => void draft.candidates.splice(candidateIndex, 1))
                      }
                      onWeight={(candidateIndex, weightValue) =>
                        editCombo(index(), (draft) => {
                          draft.candidates[candidateIndex].weight = weightValue
                        })
                      }
                    />
                  )}
                </For>
              </Show>
            </div>
          </div>
        </Show>
      </div>
    </>
  )
}

type Option = { value: string; label: string }

const ComboEditor: Component<{
  combo: Combo
  options: Option[]
  modelMap: Map<string, { name: string; provider: { name: string } } | undefined>
  onToggle: (checked: boolean) => void
  onRemove: () => void
  onName: (name: string) => void
  onAddCandidate: (candidate: Candidate) => void
  onRemoveCandidate: (index: number) => void
  onWeight: (index: number, weight: number) => void
}> = (props) => {
  const language = useLanguage()
  const [picked, setPicked] = createSignal<Option | undefined>(undefined)
  const missing = () => props.combo.candidates.filter((candidate) => !props.modelMap.get(candidateID(candidate)))

  const canAdd = () => {
    const candidate = picked()

    return !!candidate && !props.combo.candidates.some((item) => candidateID(item) === candidate.value)
  }

  const add = () => {
    const candidate = picked()

    if (!candidate || !canAdd()) return
    const separator = candidate.value.indexOf("/")

    if (separator < 0) return

    props.onAddCandidate({ providerID: candidate.value.slice(0, separator), modelID: candidate.value.slice(separator + 1) })
    setPicked(undefined)
  }

  return (
    <div class="settings-mix-combo">
      <div class="flex items-center gap-2">
        <TextInput
          type="text"
          appearance="base"
          class="w-56"
          value={props.combo.name}
          onChange={(event: Event & { currentTarget: HTMLInputElement }) =>
            props.onName(event.currentTarget.value || language.t("settings.mix.combo.new"))
          }
          aria-label={language.t("settings.mix.combo.name")}
        />
        <Switch
          checked={props.combo.enabled !== false}
          onChange={props.onToggle}
          hideLabel
        >
          {language.t("settings.mix.combo.enabled")}
        </Switch>
        <div class="flex-1" />
        <IconButton
          icon="trash"
          variant="ghost"
          size="small"
          label={language.t("settings.mix.combo.remove")}
          onClick={props.onRemove}
        />
      </div>

      <div class="flex flex-col gap-1">
        <div class="flex items-center gap-2 text-11-regular text-v2-text-text-muted">
          <span>{language.t("settings.mix.combo.candidates.header")}</span>
          <span class="text-v2-text-text-faint">{language.t("settings.mix.balance.hint")}</span>
        </div>

        <Show
          when={props.combo.candidates.length > 0}
          fallback={<div class="settings-models-status"><span>{language.t("settings.mix.combo.empty")}</span></div>}
        >
          <For each={props.combo.candidates}>
            {(candidate, index) => {
              const item = () => props.modelMap.get(candidateID(candidate))

              return (
                <div class="flex items-center gap-2 rounded-md border border-v2-border-subtle bg-v2-surface-raise p-2">
                  <Show
                    when={item()}
                    fallback={<span class="min-w-0 flex-1 truncate text-12-regular text-v2-text-text-muted">{candidateID(candidate)}</span>}
                  >
                    {(value) => (
                      <span class="min-w-0 flex-1 truncate text-12-regular">
                        {value().name} <span class="text-v2-text-text-muted">— {value().provider.name}</span>
                      </span>
                    )}
                  </Show>
                  <label class="flex items-center gap-1 text-11-regular text-v2-text-text-muted">
                    {language.t("settings.mix.weight")}
                    <TextInput
                      type="number"
                      appearance="base"
                      class="w-16"
                      min="1"
                      value={String(weight(candidate))}
                      onChange={(event: Event & { currentTarget: HTMLInputElement }) =>
                        props.onWeight(index(), Math.max(1, Math.floor(Number(event.currentTarget.value) || 1)))
                      }
                      aria-label={language.t("settings.mix.weight")}
                    />
                  </label>
                  <IconButton
                    icon="trash"
                    variant="ghost"
                    size="small"
                    label={language.t("settings.mix.candidate.remove")}
                    onClick={() => props.onRemoveCandidate(index())}
                  />
                </div>
              )
            }}
          </For>
        </Show>
        <Show when={missing().length > 0}>
          <div class="text-11-regular text-v2-text-text-muted">{language.t("settings.mix.candidate.missing")}</div>
        </Show>

        <div class="flex items-center gap-2 pt-1">
          <Select
            data-action="settings-mix-add-model"
            options={props.options}
            current={picked()}
            value={(option) => option.value}
            label={(option) => option.label}
            onSelect={setPicked}
            placement="bottom-start"
            gutter={6}
          />
          <IconButton
            icon="plus"
            variant="neutral"
            size="small"
            label={language.t("settings.mix.combo.addModel")}
            disabled={!canAdd()}
            onClick={add}
          />
        </div>
      </div>
    </div>
  )
}
