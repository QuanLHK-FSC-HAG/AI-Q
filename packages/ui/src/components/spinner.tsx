import { splitProps, type ComponentProps, type JSX } from "solid-js"
import { syncSpinPhase } from "../hooks/spin-phase"

/**
 * 3-color waiting spinner (blue/orange/green). `width` and `height` size it like SVG attributes; CSS can override.
 */
export function Spinner(
  props: Omit<ComponentProps<"span">, "style"> & {
    "data-component"?: string
    width?: number
    height?: number
    style?: JSX.CSSProperties
  },
) {
  const [local, rest] = splitProps(props, ["class", "classList", "data-component", "width", "height", "style"])

  return (
    <span
      {...rest}
      ref={syncSpinPhase}
      data-component={local["data-component"] ?? "spinner"}
      data-slot="spinner-dots"
      classList={{ ...local.classList, [local.class ?? ""]: !!local.class }}
      style={{
        ...local.style,
        "--spinner-width": local.width === undefined ? undefined : `${local.width}px`,
        "--spinner-height": local.height === undefined ? undefined : `${local.height}px`,
      }}
    >
      <span aria-hidden="true" class="AIQ-spinner-ring" />
    </span>
  )
}
