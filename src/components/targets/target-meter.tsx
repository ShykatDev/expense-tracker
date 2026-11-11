import { cn } from "@/lib/utils";

export interface TargetState {
  /** Real share of the cap spent, uncapped, so "130%" reads honestly. */
  percent: number;
  isOver: boolean;
  isReached: boolean;
  /** A heads-up from 85% of the cap, before it is hit. */
  isNear: boolean;
}

/** Where spending stands against a monthly cap. Shared by every target view. */
export function getTargetState(spent: number, cap: number): TargetState {
  const percent = cap > 0 ? Math.round((spent / cap) * 100) : 0;
  const isOver = cap > 0 && spent > cap;
  const isReached = cap > 0 && !isOver && spent >= cap;
  return { percent, isOver, isReached, isNear: !isOver && !isReached && percent >= 85 };
}

/**
 * The progress bar and percentage for a target: the hero blue normally,
 * amber when close, green when exactly reached and red once over.
 */
export function TargetMeter({ state }: { state: TargetState }) {
  const { percent, isOver, isReached, isNear } = state;
  return (
    <div className="flex items-center gap-3">
      <div className={cn("h-2 flex-1 overflow-hidden rounded-full", isOver ? "bg-rose-500/15" : "bg-white/8")}>
        <div
          className={cn(
            "h-full rounded-full transition-[width,background-color] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)]",
            isOver
              ? "bg-linear-to-r from-rose-500/70 to-rose-400"
              : isReached
                ? "bg-emerald-400/60"
                : isNear
                  ? "bg-linear-to-r from-amber-500/60 to-amber-300/90"
                  : "accent-gradient-x",
          )}
          style={{ width: `${Math.min(Math.max(percent, percent > 0 ? 3 : 0), 100)}%` }}
        />
      </div>
      <span
        className={cn(
          "w-10 shrink-0 text-right text-[11px] tabular-nums",
          isOver ? "font-medium text-rose-300" : isNear ? "text-amber-200/80" : "text-white/50",
        )}
      >
        {percent}%
      </span>
    </div>
  );
}

/** The card surface tint that matches a target's state. */
export function targetCardClass(state: TargetState) {
  return state.isOver
    ? "bg-rose-500/[0.09] ring-rose-400/25"
    : state.isNear
      ? "bg-amber-400/[0.06] ring-amber-300/15"
      : "bg-white/6 ring-transparent";
}

/** The icon circle tint that matches a target's state. */
export function targetIconClass(state: TargetState) {
  return state.isOver
    ? "bg-rose-500/15 text-rose-300"
    : state.isNear
      ? "bg-amber-400/12 text-amber-200"
      : "bg-white/8 text-white";
}
