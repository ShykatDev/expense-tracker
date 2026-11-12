"use client"

import { Switch as SwitchPrimitive } from "@base-ui/react/switch"
import { cn } from "cn"

/**
 * The app's toggle: a soft dark track that fills with the hero's blue when
 * on, and a white knob that slides across with a small springy overshoot
 * (the same feel as the bottom navigation). The invisible `after:` area
 * widens the touch target beyond the drawn track.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default"
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-[3px] outline-none transition-[background-color,box-shadow] duration-300",
        "after:absolute after:-inset-x-2 after:-inset-y-2",
        "data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9",
        "bg-white/10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]",
        "data-checked:bg-linear-to-r data-checked:from-[#2a55b0] data-checked:to-[#5b86e0] data-checked:shadow-[inset_0_1px_0_0_rgba(214,228,255,0.25)]",
        "focus-visible:ring-2 focus-visible:ring-[#a9c4ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full transition-[transform,background-color] duration-300 ease-[cubic-bezier(0.34,1.5,0.64,1)] motion-reduce:transition-none",
          "group-data-[size=default]/switch:size-[22px] group-data-[size=sm]/switch:size-[14px]",
          "bg-white/75 data-checked:bg-white",
          "group-data-[size=default]/switch:data-checked:translate-x-5 group-data-[size=sm]/switch:data-checked:translate-x-4",
          "data-unchecked:translate-x-0"
        )}
      />
    </SwitchPrimitive.Root>
  )
}

export { Switch }
