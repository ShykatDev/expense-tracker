"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";
import { Eye, EyeOff } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * Shows or hides a category in the entry screen. A real switch for
 * assistive tech and keyboards, drawn as a custom pill: the knob carries an
 * eye — open and blue when the category is shown, crossed out when hidden —
 * and slides with a small spring, over a track that fills with the hero's
 * blue when on.
 */
export function VisibilityToggle({
  checked,
  onCheckedChange,
  label,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  /** e.g. "Show WiFi when adding a transaction". */
  label: string;
}) {
  return (
    <SwitchPrimitive.Root
      checked={checked}
      onCheckedChange={onCheckedChange}
      aria-label={label}
      className={cn(
        "group/vis relative inline-flex h-8 w-[3.75rem] shrink-0 cursor-pointer items-center rounded-full p-1 outline-none transition-[background-color,box-shadow] duration-300",
        // A wider invisible tap area than the drawn pill.
        "after:absolute after:-inset-x-1.5 after:-inset-y-2",
        "bg-white/[0.07] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]",
        "data-checked:bg-linear-to-r data-checked:from-[#1d4194] data-checked:to-[#4b7ad6] data-checked:shadow-[inset_0_0_0_1px_rgba(169,196,255,0.3),inset_0_1px_0_0_rgba(214,228,255,0.25)]",
        "focus-visible:ring-2 focus-visible:ring-[#a9c4ff]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0c0e]",
      )}
    >
      {/* Faint state words on the track, revealed on the side the knob leaves. */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute left-2.5 text-[9px] font-semibold tracking-wide text-white/80 uppercase opacity-0 transition-opacity duration-300 group-data-checked/vis:opacity-100"
      >
        on
      </span>
      <span
        aria-hidden="true"
        className="pointer-events-none absolute right-2 text-[9px] font-semibold tracking-wide text-white/50 uppercase transition-opacity duration-300 group-data-checked/vis:opacity-0"
      >
        off
      </span>

      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none relative flex size-6 items-center justify-center rounded-full transition-[transform,background-color,color] duration-300 ease-[cubic-bezier(0.34,1.5,0.64,1)] motion-reduce:transition-none",
          "translate-x-0 bg-white/20 text-white/70",
          "data-checked:translate-x-7 data-checked:bg-white data-checked:text-[#2a55b0]",
        )}
      >
        {checked ? (
          <Eye className="size-3.5" strokeWidth={2.2} />
        ) : (
          <EyeOff className="size-3.5" strokeWidth={2} />
        )}
      </SwitchPrimitive.Thumb>
    </SwitchPrimitive.Root>
  );
}
