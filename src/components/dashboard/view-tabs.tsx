"use client";

import { cn } from "@/lib/utils";

const OPTIONS = [
  { value: "overview", label: "Overview" },
  { value: "history", label: "History" },
] as const;

export type DashboardView = (typeof OPTIONS)[number]["value"];

export function ViewTabs({
  value,
  onChange,
}: {
  value: DashboardView;
  onChange: (value: DashboardView) => void;
}) {
  return (
    <div className="glass flex w-fit items-center gap-1 rounded-full border border-white/10 p-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
      {OPTIONS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-4 py-1.5 text-xs font-medium transition-all",
            value === option.value
              ? "bg-white/15 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]"
              : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}
