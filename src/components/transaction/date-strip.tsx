"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

/**
 * A horizontal strip of nearby dates, with the selected one shown as a solid
 * black tile.
 *
 * Five days fit across a phone screen; the rest scroll. The selected day is
 * kept centred so the choice is always visible.
 */
export function DateStrip({
  value,
  onChange,
}: {
  /** Epoch ms of the selected date. */
  value: number;
  onChange: (next: number) => void;
}) {
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const days = React.useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Two weeks back and two days ahead: entries are mostly logged after the
    // fact, so the past gets most of the room.
    return Array.from({ length: 17 }, (_, index) => {
      const date = new Date(today);
      date.setDate(today.getDate() + (index - 14));
      return date;
    });
  }, []);

  const selectedKey = new Date(value).toDateString();

  React.useEffect(() => {
    const strip = scrollRef.current;
    if (!strip) return;
    const selected = strip.querySelector<HTMLElement>("[data-selected='true']");
    if (!selected) return;
    strip.scrollTo({
      left: selected.offsetLeft - strip.clientWidth / 2 + selected.clientWidth / 2,
      behavior: "smooth",
    });
  }, [selectedKey]);

  return (
    <div
      ref={scrollRef}
      className="flex snap-x snap-mandatory items-center overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {days.map((day) => {
        const isSelected = day.toDateString() === selectedKey;

        return (
          <div
            key={day.toISOString()}
            className="flex w-1/5 shrink-0 snap-center justify-center"
          >
            <button
              type="button"
              data-selected={isSelected}
              onClick={() => onChange(day.getTime())}
              className={cn(
                "flex h-16 w-14 flex-col items-center justify-center gap-0.5 rounded-2xl transition-colors duration-200 active:scale-95",
                isSelected
                  ? "bg-black text-white"
                  : "text-neutral-900 hover:bg-neutral-100",
              )}
              aria-label={day.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
              aria-pressed={isSelected}
            >
              <span className="text-xl leading-none tabular-nums">
                {day.getDate()}
              </span>
              <span
                className={cn(
                  "text-xs leading-none lowercase",
                  isSelected ? "text-white" : "text-neutral-500",
                )}
              >
                {day.toLocaleDateString("en-US", { weekday: "short" })}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}
