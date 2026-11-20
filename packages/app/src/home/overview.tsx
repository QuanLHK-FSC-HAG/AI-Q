import { Button } from "@opencode/ui/button"
import { Loader } from "@opencode/ui/loader"
import { createEffect, createMemo, createSignal, For, on, onCleanup, Show } from "solid-js"
import { useLanguage } from "@/runtime/i18n/language"
import type { HomeController } from "./model"

type Range = "24h" | "48h" | "7d" | "30d" | "all"

type Stats = {
  prompts: number
  tokens: {
    input: number
    output: number
    reasoning: number
    cache: { read: number; write: number }
  }
  cost: number
}

const ranges: { id: Range; label: `home.overview.range.${Range}` }[] = [
  { id: "24h", label: "home.overview.range.24h" },
  { id: "48h", label: "home.overview.range.48h" },
  { id: "7d", label: "home.overview.range.7d" },
  { id: "30d", label: "home.overview.range.30d" },
  { id: "all", label: "home.overview.range.all" },
]

function count(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? Math.max(0, value) : 0
}

function start(range: Range, now: number) {
  if (range === "24h") return now - 24 * 60 * 60 * 1000
  if (range === "48h") return now - 48 * 60 * 60 * 1000
  if (range === "7d") return now - 7 * 24 * 60 * 60 * 1000
  if (range === "30d") return now - 30 * 24 * 60 * 60 * 1000
}

export function HomeOverview(props: { home: HomeController }) {
  const language = useLanguage()
  const [range, setRange] = createSignal<Range>("24h")
  const [stats, setStats] = createSignal<Stats>()
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal<string>()

  let attempt = 0
  onCleanup(() => {
    attempt++
  })

  const load = async (current: Range) => {
    const ctx = props.home.server.focusedContext()
    if (!ctx) {
      setStats(undefined)
      setError(undefined)
      setLoading(false)
      return
    }

    const id = ++attempt
    setLoading(true)
    setError(undefined)

    try {
      const now = Date.now()
      const from = start(current, now)
      const result = await ctx.sdk.api.experimental.session.stats(
        from === undefined ? { tools: "none" } : { from, to: now, tools: "none" },
      )

      if (id !== attempt) return

      const raw =
        result && typeof result === "object" && "data" in result ? (result as { data?: unknown }).data : result
      const data = raw as
        | {
            prompts?: number
            tokens?: { input?: number; output?: number; reasoning?: number; cache?: { read?: number; write?: number } }
            cost?: number
          }
        | undefined

      if (!data || !data.tokens) {
        setError(language.t("common.requestFailed"))
        setStats(undefined)
        return
      }

      setStats({
        prompts: count(data.prompts),
        tokens: {
          input: count(data.tokens.input),
          output: count(data.tokens.output),
          reasoning: count(data.tokens.reasoning),
          cache: { read: count(data.tokens.cache?.read), write: count(data.tokens.cache?.write) },
        },
        cost: count(data.cost),
      })
    } catch (cause) {
      if (id !== attempt) return
      const message = cause instanceof Error ? cause.message : String(cause)
      setError(message || language.t("common.requestFailed"))
      setStats(undefined)
    } finally {
      if (id === attempt) setLoading(false)
    }
  }

  createEffect(
    on(
      () => [props.home.server.focused(), range()] as const,
      ([, current]) => {
        void load(current)
      },
    ),
  )

  const numeric = (value: number) => (Number.isFinite(value) ? value : 0)
  const fmtInt = (value: number) =>
    new Intl.NumberFormat(language.intl()).format(Math.max(0, Math.round(numeric(value))))
  const fmtCost = (value: number) => {
    const amount = Math.max(0, numeric(value))

    return new Intl.NumberFormat(language.intl(), {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: amount !== 0 && Math.abs(amount) < 0.01 ? 4 : 2,
    }).format(amount)
  }

  const cached = () => {
    const s = stats()
    if (!s) return 0
    return (s.tokens.cache?.read ?? 0) + (s.tokens.cache?.write ?? 0)
  }

  const rows = createMemo(() => {
    const s = stats()
    return [
      { label: language.t("home.overview.requests"), value: s ? fmtInt(s.prompts) : "—" },
      { label: language.t("home.overview.inputTokens"), value: s ? fmtInt(s.tokens.input) : "—" },
      { label: language.t("home.overview.cachedTokens"), value: s ? fmtInt(cached()) : "—" },
      {
        label: language.t("home.overview.outputTokens"),
        value: s ? fmtInt(s.tokens.output + (s.tokens.reasoning ?? 0)) : "—",
      },
      { label: language.t("home.overview.cost"), value: s ? fmtCost(s.cost) : "—" },
    ]
  })

  return (
    <section
      data-component="home-overview"
      class="flex w-full min-w-0 flex-col gap-3 rounded-[10px] border border-v2-border-border-base bg-v2-background-bg-base p-3"
      aria-label={language.t("home.overview.title")}
    >
      <div class="flex items-center justify-between gap-2">
        <div class="text-[13px] leading-4 tracking-[-0.04px] text-v2-text-text-base [font-weight:530]">
          {language.t("home.overview.title")}
        </div>
        <Show when={loading()}>
          <Loader width={14} height={14} class="text-v2-text-text-muted" />
        </Show>
      </div>

      <div class="flex flex-wrap gap-1">
        <For each={ranges}>
          {(item) => (
            <button
              type="button"
              class="rounded-[6px] px-2 py-1 text-[11px] leading-4 tracking-[-0.02em] transition-colors"
              classList={{
                "bg-v2-background-bg-layer-02 text-v2-text-text-base [font-weight:530]": range() === item.id,
                "text-v2-text-text-muted hover:bg-v2-overlay-simple-overlay-hover hover:text-v2-text-text-base":
                  range() !== item.id,
              }}
              aria-pressed={range() === item.id}
              onClick={() => setRange(item.id)}
            >
              {language.t(item.label)}
            </button>
          )}
        </For>
      </div>

      <Show when={error()}>
        {(msg) => (
          <div class="flex flex-col gap-2">
            <div class="text-[12px] leading-4 text-v2-text-text-muted">{msg()}</div>
            <Button variant="ghost" size="small" class="self-start" onClick={() => void load(range())}>
              {language.t("common.retry")}
            </Button>
          </div>
        )}
      </Show>

      <Show when={!error()}>
        <div class="flex flex-col gap-2">
          <For each={rows()}>
            {(row) => (
              <div class="flex items-baseline justify-between gap-2">
                <span class="min-w-0 text-[12px] leading-4 text-v2-text-text-muted [font-weight:440]">{row.label}</span>
                <span class="shrink-0 text-[13px] leading-4 tracking-[-0.02em] text-v2-text-text-base [font-weight:530] tabular-nums">
                  {row.value}
                </span>
              </div>
            )}
          </For>
        </div>
      </Show>
    </section>
  )
}
