"use client";

import { GripVertical } from "lucide-react";
import * as React from "react";

import type { Goal } from "@/lib/goals";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** Space between rows, in px. Must match the list's `gap-2`. */
const ROW_GAP = 8;

interface DragState {
  id: string;
  startIndex: number;
  startY: number;
  /** Row height plus gap: how far one step up or down moves a row. */
  pitch: number;
  dy: number;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/**
 * Active goals as compact rows that can be dragged into priority order by
 * their grip. Full goal cards are too tall to drag comfortably on a phone,
 * so reordering swaps them for these rows.
 *
 * Pointer events with capture on the grip work for touch, pen and mouse.
 * Only the dragged row follows the finger; the rows it passes slide one
 * step out of the way with a short transform transition. The new order is
 * committed once, on release. Arrow keys on a focused grip move it by one.
 */
export function GoalReorderList({
  goals,
  onReorder,
  renderThumb,
}: {
  /** Active goals, already in priority order. */
  goals: Goal[];
  onReorder: (orderedIds: string[]) => void;
  renderThumb: (goal: Goal) => React.ReactNode;
}) {
  const [drag, setDrag] = React.useState<DragState | null>(null);
  const listRef = React.useRef<HTMLOListElement>(null);

  // The bottom sheet drags itself with native touch listeners. Stop touches
  // that start on a grip from reaching it, or dragging a row down would
  // pull the whole sheet closed.
  React.useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const fromGrip = (event: TouchEvent) =>
      event.target instanceof Element && event.target.closest("[data-reorder-grip]");
    const onStart = (event: TouchEvent) => {
      if (fromGrip(event)) event.stopPropagation();
    };
    const onMove = (event: TouchEvent) => {
      if (!fromGrip(event)) return;
      event.stopPropagation();
      event.preventDefault();
    };
    list.addEventListener("touchstart", onStart, { passive: true });
    list.addEventListener("touchmove", onMove, { passive: false });
    return () => {
      list.removeEventListener("touchstart", onStart);
      list.removeEventListener("touchmove", onMove);
    };
  }, []);

  const targetIndex = drag
    ? clamp(drag.startIndex + Math.round(drag.dy / drag.pitch), 0, goals.length - 1)
    : -1;

  function move(from: number, to: number) {
    if (from === to) return;
    const ids = goals.map((goal) => goal.id);
    const [moved] = ids.splice(from, 1);
    ids.splice(to, 0, moved);
    onReorder(ids);
  }

  function handlePointerDown(event: React.PointerEvent<HTMLButtonElement>, index: number) {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    const row = event.currentTarget.closest("li");
    if (!row) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({
      id: goals[index].id,
      startIndex: index,
      startY: event.clientY,
      pitch: row.offsetHeight + ROW_GAP,
      dy: 0,
    });
  }

  function handlePointerMove(event: React.PointerEvent<HTMLButtonElement>) {
    if (!drag) return;
    // Keep the row within the list.
    const min = -drag.startIndex * drag.pitch;
    const max = (goals.length - 1 - drag.startIndex) * drag.pitch;
    const dy = clamp(event.clientY - drag.startY, min, max);
    setDrag((prev) => (prev ? { ...prev, dy } : prev));
  }

  function handlePointerEnd() {
    if (!drag) return;
    move(drag.startIndex, targetIndex);
    setDrag(null);
  }

  return (
    <ol ref={listRef} className="flex flex-col gap-2">
      {goals.map((goal, index) => {
        const dragging = drag?.id === goal.id;
        let offset = 0;
        if (drag && !dragging) {
          if (index > drag.startIndex && index <= targetIndex) offset = -drag.pitch;
          else if (index < drag.startIndex && index >= targetIndex) offset = drag.pitch;
        }
        // While dragging, the number shows where the row will land.
        const position =
          drag && dragging ? targetIndex : drag ? index + Math.sign(offset) : index;

        return (
          <li
            key={goal.id}
            className={cn(
              "relative flex h-16 items-center gap-3 rounded-2xl bg-white/6 pr-1.5 pl-3",
              dragging
                ? "z-10 bg-[#1d2333] shadow-lg ring-1 ring-white/15"
                : "transition-transform duration-150 ease-out",
            )}
            style={{ transform: `translateY(${dragging ? drag.dy : offset}px)` }}
          >
            <span className="w-5 shrink-0 text-center text-xs font-medium tabular-nums text-white/45">
              {position + 1}
            </span>
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center overflow-hidden text-[#b9d0ff]",
                goal.imageId && "rounded-xl bg-white/8",
              )}
            >
              {renderThumb(goal)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm text-white/90">{goal.label}</span>
              <span className="block text-xs tabular-nums text-white/50">
                {formatCurrency(goal.targetAmount)}
              </span>
            </span>
            <button
              type="button"
              data-reorder-grip
              aria-label={`Move ${goal.label}. Use the arrow keys to change its priority.`}
              onPointerDown={(event) => handlePointerDown(event, index)}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerEnd}
              onPointerCancel={handlePointerEnd}
              onKeyDown={(event) => {
                if (event.key === "ArrowUp" && index > 0) {
                  event.preventDefault();
                  move(index, index - 1);
                } else if (event.key === "ArrowDown" && index < goals.length - 1) {
                  event.preventDefault();
                  move(index, index + 1);
                }
              }}
              className={cn(
                "flex size-12 shrink-0 touch-none items-center justify-center rounded-xl text-white/45 select-none hover:text-white/80 focus-visible:ring-1 focus-visible:ring-white/30 focus-visible:outline-none",
                dragging ? "cursor-grabbing text-white" : "cursor-grab",
              )}
            >
              <GripVertical className="size-5" />
            </button>
          </li>
        );
      })}
    </ol>
  );
}
