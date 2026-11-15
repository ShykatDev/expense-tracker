import { cn } from "@/lib/utils";
import { ProgressBar } from "@/components/ui/progress-bar";

export interface TargetState {
  /** Real share of the cap spent, uncapped, so "130%" reads honestly. */
  percent: number;
  isOver: boolean;
  isReached: boolean;
  /** A heads-up from 80% of the cap, before it is hit (matches the budget alerts). */
  isNear: boolean;
}

/** Where spending stands against a monthly cap. Shared by every target view. */
export function getTargetState(spent: number, cap: number): TargetState {
  const percent = cap > 0 ? Math.round((spent / cap) * 100) : 0;
  const isOver = cap > 0 && spent > cap;
  const isReached = cap > 0 && !isOver && spent >= cap;
  return { percent, isOver, isReached, isNear: !isOver && !isReached && percent >= 80 };
}

/**
 * The progress bar and percentage for a target: the hero blue normally,
 * amber when close, green when exactly reached and red once over.
 */
export function TargetMeter({ state }: { state: TargetState }) {
  const { percent, isOver, isReached, isNear } = state;
  return (
    <div className="flex items-center gap-3">
      <ProgressBar
        className="flex-1"
        value={percent / 100}
        minVisible={0.03}
        tone={isOver ? "rose" : isReached ? "emerald" : isNear ? "amber" : "blue"}
      />
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
