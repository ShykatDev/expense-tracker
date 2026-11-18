"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/** How long the button has to be held. */
const HOLD_MS = 1500;

/**
 * A destructive button that only fires after being pressed and held: a red
 * fill sweeps across while held, and the action runs when it's full. Letting
 * go early cancels. It replaces "type DELETE to confirm": just as hard to
 * trigger by accident, but one deliberate gesture instead of typing.
 *
 * Works with touch, mouse and keyboard (hold Space or Enter). The fill is
 * driven by requestAnimationFrame writing a transform straight to the DOM,
 * so holding doesn't re-render React on every frame.
 */
export function HoldButton({
  onConfirm,
  children,
  holdingLabel = "Keep holding…",
  busy = false,
  busyLabel,
  disabled = false,
  className,
  icon,
  tone = "rose",
}: {
  onConfirm: () => void;
  /** The idle label, e.g. "Hold to delete everything". */
  children: React.ReactNode;
  holdingLabel?: React.ReactNode;
  /** After confirming, while the action runs. */
  busy?: boolean;
  busyLabel?: React.ReactNode;
  disabled?: boolean;
  className?: string;
  icon?: React.ReactNode;
  /** Red for the most destructive action; amber for a lesser one. */
  tone?: "rose" | "amber";
}) {
  const fillRef = React.useRef<HTMLSpanElement>(null);
  const frame = React.useRef<number | null>(null);
  const startedAt = React.useRef(0);
  const [holding, setHolding] = React.useState(false);

  const setProgress = (value: number, animate: boolean) => {
    const fill = fillRef.current;
    if (!fill) return;
    fill.style.transition = animate ? "transform 250ms ease-out" : "none";
    fill.style.transform = `scaleX(${value})`;
  };

  const stop = React.useCallback(() => {
    if (frame.current !== null) cancelAnimationFrame(frame.current);
    frame.current = null;
  }, []);

  React.useEffect(() => stop, [stop]);

  function start() {
    if (disabled || busy || frame.current !== null) return;
    setHolding(true);
    startedAt.current = performance.now();
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt.current) / HOLD_MS, 1);
      setProgress(progress, false);
      if (progress < 1) {
        frame.current = requestAnimationFrame(tick);
        return;
      }
      frame.current = null;
      setHolding(false);
      navigator.vibrate?.(30);
      onConfirm();
    };
    frame.current = requestAnimationFrame(tick);
  }

  function cancel() {
    if (frame.current === null) return;
    stop();
    setHolding(false);
    // Let go early: the fill slides back.
    setProgress(0, true);
  }

  return (
    <button
      type="button"
      disabled={disabled || busy}
      aria-label={typeof children === "string" ? children : undefined}
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.currentTarget.setPointerCapture(event.pointerId);
        start();
      }}
      onPointerUp={cancel}
      onPointerCancel={cancel}
      onKeyDown={(event) => {
        if ((event.key === " " || event.key === "Enter") && !event.repeat) {
          event.preventDefault();
          start();
        }
      }}
      onKeyUp={(event) => {
        if (event.key === " " || event.key === "Enter") cancel();
      }}
      onBlur={cancel}
      // Long-press would otherwise open the browser's text/context menu.
      onContextMenu={(event) => event.preventDefault()}
      className={cn(
        "relative flex h-12 w-full touch-none items-center justify-center gap-2 overflow-hidden rounded-full px-5 text-sm font-medium ring-1 select-none [-webkit-touch-callout:none] disabled:opacity-60",
        tone === "amber"
          ? "bg-amber-500/15 text-amber-200 ring-amber-400/30"
          : "bg-rose-500/15 text-rose-200 ring-rose-400/30",
        className,
      )}
    >
      <span
        ref={fillRef}
        aria-hidden="true"
        // Starting scale set inline: a Tailwind scale class uses the CSS
        // `scale` property, which would multiply with this transform.
        style={{ transform: "scaleX(0)" }}
        className={cn(
          "absolute inset-0 origin-left",
          tone === "amber" ? "bg-amber-500" : "bg-rose-500",
        )}
      />
      <span
        className={cn(
          "relative flex items-center gap-2",
          holding && (tone === "amber" ? "text-amber-950" : "text-white"),
        )}
      >
        {icon}
        {busy ? (busyLabel ?? children) : holding ? holdingLabel : children}
      </span>
    </button>
  );
}
