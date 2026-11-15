import { cn } from "@/lib/utils";

/**
 * Fill gradients, dark to bright left to right. Every bar starts deep and
 * brightens toward its tip, so all progress bars read as one design.
 */
const TONES = {
  /** The hero blue: the default. */
  blue: ["#16306d", "#7fa3ec"],
  /** Pale blue: done or affordable (a funded goal), or income. */
  pale: ["#16306d", "#dfe8ff"],
  /** Close to a limit, or overdue. */
  amber: ["#5a3b0c", "#fcd34d"],
  /** Over a limit. */
  rose: ["#5c1a26", "#fb7185"],
  /** Exactly reached. */
  emerald: ["#0f3d2e", "#6ee7b7"],
  /** A secondary row that shouldn't compete with the highlighted one. */
  muted: ["rgba(255,255,255,0.08)", "rgba(255,255,255,0.32)"],
} as const;

export type ProgressTone = keyof typeof TONES;

/**
 * The app's progress bar: a thin rounded track with a gradient fill that
 * eases to its new width. Used for goals, targets, category shares, the
 * monthly recap and recurring rules.
 */
export function ProgressBar({
  value,
  tone = "blue",
  minVisible = 0,
  className,
}: {
  /** 0 to 1; values outside are clamped. */
  value: number;
  tone?: ProgressTone;
  /** Smallest fill (0 to 1) drawn for any value above 0, so a sliver shows. */
  minVisible?: number;
  className?: string;
}) {
  const clamped = Math.min(Math.max(value, 0), 1);
  const width = clamped > 0 ? Math.max(clamped, minVisible) : 0;
  const [from, to] = TONES[tone];

  return (
    <div
      className={cn("h-1.5 overflow-hidden rounded-full bg-white/12", className)}
      aria-hidden="true"
    >
      <div
        className="h-full rounded-full transition-[width] duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none"
        style={{
          width: `${width * 100}%`,
          backgroundImage: `linear-gradient(90deg, ${from} 0%, ${to} 100%)`,
        }}
      />
    </div>
  );
}
