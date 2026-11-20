import { createEffect, createMemo, createSignal, on, onCleanup, Show } from "solid-js"
import { Option, Schema } from "effect"
import type { SessionStepFailed } from "@opencode/client/promise"
import { Button } from "@opencode/ui/button"
import { Icon } from "@opencode/ui/icon"
import { IconButton } from "@opencode/ui/icon-button"
import { useLanguage } from "@/runtime/i18n/language"

import { useWorkspaceLocation } from "@/workspaces/location"
import { isFreeModel } from "@/providers/models/models"
import type { ModelSelection } from "@/providers/models/selection"
import { formatLimitReset } from "../usage-exceeded-dialogs"
import { Grow } from "./spring-height"

// Usage limit refusals may include the limit name and when it resets.
const decodeGoLimitBody = Schema.decodeUnknownOption(
  Schema.fromJsonString(
    Schema.Struct({
      metadata: Schema.Struct({ workspace: Schema.optional(Schema.String), limitName: Schema.optional(Schema.String) }),
    }),
  ),
)

type GoLimit = { name?: string; reset?: string }

function goLimit(locale: string, event: SessionStepFailed): GoLimit {
  const metadata = Option.getOrUndefined(decodeGoLimitBody(event.data.error.response?.body))?.metadata

  return {
    name: metadata?.limitName,
    reset: formatLimitReset(locale, event.created, event.data.error.retryAfterMs),
  }
}

// A tray that grows out from under the composer, like the queue panel, when an AI-Q Go subscriber reaches a usage
// limit: when Go is back, and how to keep going now.
export function SessionGoLimitTray(props: {
  sessionID: string | undefined
  selection: () => ModelSelection | undefined
}) {
  const language = useLanguage()
  const location = useWorkspaceLocation()
  const [limit, setLimit] = createSignal<GoLimit>()

  const model = createMemo(() => {
    const current = props.selection()?.current()

    return current && `${current.provider.id}:${current.id}`
  })

  createEffect(on(model, () => setLimit(undefined), { defer: true }))

  onCleanup(
    location().event.on("session.step.failed", (event) => {
      if (!props.sessionID || event.data.sessionID !== props.sessionID) return

      if (event.data.error.type === "provider.go-limit") setLimit(goLimit(language.locale(), event))
    }),
  )

  // The next step means the user found a way to keep going, so the tray has done its job.
  onCleanup(
    location().event.on("session.step.started", (event) => {
      if (event.data.sessionID === props.sessionID) setLimit(undefined)
    }),
  )

  const title = () => {
    const name = limit()?.name

    return name ? language.t("session.goLimit.titleNamed", { name }) : language.t("session.goLimit.title")
  }

  const freeModel = () => props.selection()?.list().find(isFreeModel)

  const switchToFree = () => {
    const model = freeModel()

    if (!model) return
    props.selection()?.set({ providerID: model.provider.id, modelID: model.id }, { recent: true })
    setLimit(undefined)
  }

  return (
    <Grow when={limit()} fade class="relative z-0">
      {(current) => (
        <div
          data-component="session-go-limit-tray"
          role="status"
          class="relative z-0 -mb-3 flex items-center gap-2.5 rounded-xl bg-v2-background-bg-base ps-3 pe-1.5 pt-1.5 pb-[18px] shadow-[inset_0_0_0_0.5px_var(--v2-border-border-base)]"
        >
          <div class="min-w-0 flex-1 truncate text-[13px] font-[440] leading-[var(--line-height-compact)] text-v2-text-text-muted [font-variant-numeric:tabular-nums]">
            <span class="font-[530] text-v2-text-text-base">{title()}</span>
            <Show when={current.reset}>{(time) => <> {language.t("session.goLimit.reset", { time: time() })}</>}</Show>
          </div>
          <div class="flex shrink-0 items-center gap-1">
            <Show when={freeModel()}>
              <Button
                data-action="session-go-limit-free-primary"
                type="button"
                size="small"
                variant="contrast"
                class="![font-weight:530]"
                onClick={switchToFree}
              >
                {language.t("session.goLimit.switchFree")}
              </Button>
            </Show>
            <Show when={!freeModel()}>
              <div class="text-[12px] font-[440] leading-[var(--line-height-compact)] text-v2-text-text-muted pe-1">
                {language.t("session.goLimit.switchFreeHint")}
              </div>
            </Show>
            <IconButton
              data-action="session-go-limit-dismiss"
              type="button"
              size="small"
              variant="ghost-muted"
              icon={<Icon name="outline-xmark" />}
              aria-label={language.t("common.dismiss")}
              onClick={() => setLimit(undefined)}
            />
          </div>
        </div>
      )}
    </Grow>
  )
}
