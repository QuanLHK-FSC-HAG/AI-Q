import { splitProps, type ComponentProps } from "solid-js"
import { syncSpinPhase } from "../../hooks/spin-phase"
import "./loader.css"

export function Loader(props: ComponentProps<"span"> & { width?: number; height?: number }) {
  const [local, rest] = splitProps(props, ["class", "classList", "width", "height"])
  const w = () => local.width ?? 16
  const h = () => local.height ?? local.width ?? 16

  return (
    <span
      {...rest}
      ref={syncSpinPhase as any}
      class={local.class}
      classList={local.classList}
      data-component="loader-v2"
      aria-hidden={rest["aria-hidden"] ?? "true"}
      style={{
        width: `${w()}px`,
        height: `${h()}px`,
        display: "inline-flex",
        ...(typeof rest.style === "object" ? (rest.style as any) : {}),
      }}
    >
      <span aria-hidden="true" class="AIQ-spinner-ring" />
    </span>
  )
}
