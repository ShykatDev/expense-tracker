"use client";

import { Check, Repeat, X } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { RowIconButton } from "@/components/layout/app-shell";
import { RecurringConfirmDialog } from "@/components/recurring/recurring-confirm-dialog";
import { useRecurring } from "@/components/recurring/recurring-provider";
import { RecurringCategoryIcon } from "@/components/recurring/recurring-shared";
import { Card } from "@/components/ui/card";
import { daysFromToday, describeDue, type RecurringOccurrence } from "@/lib/recurring";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

/** Rows shown before the rest fold behind "+N more". */
const VISIBLE_ROWS = 3;

/**
 * The recurring entries waiting on the user: due today or overdue, oldest
 * first. ✓ adds it to the history as scheduled; tapping the row opens the
 * confirm dialog to change the amount; × skips it. Renders nothing when
 * nothing is due, so it can sit on the dashboard unconditionally.
 */
export function RecurringDueCard({
  className,
  showHeader = true,
}: {
  className?: string;
  /** Off where a section heading above already says what this is. */
  showHeader?: boolean;
}) {
  const { due, now, confirmOccurrence, skipOccurrence } = useRecurring();
  const [expanded, setExpanded] = React.useState(false);
  const [editing, setEditing] = React.useState<RecurringOccurrence | null>(null);

  if (due.length === 0) return null;

  const visible = expanded ? due : due.slice(0, VISIBLE_ROWS);
  const hidden = due.length - visible.length;

  function confirm(occurrence: RecurringOccurrence) {
    if (confirmOccurrence(occurrence)) {
      toast.success(`${occurrence.category} · ${formatCurrency(occurrence.amount)} added`);
    }
  }

  function skip(occurrence: RecurringOccurrence) {
    skipOccurrence(occurrence);
    toast.info(`Skipped ${occurrence.category}`);
  }

  return (
    <>
      <Card className={cn("gap-0 py-1.5", className)}>
        {showHeader && (
          <div className="flex items-center gap-2 px-4 pt-2 pb-1.5">
            <Repeat className="size-3.5 text-[#b9d0ff]" />
            <h3 className="text-xs font-medium text-white/70">
              Recurring · {due.length} due
            </h3>
          </div>
        )}

        {visible.map((occurrence) => {
          const overdue = daysFromToday(occurrence.dueDate, now) < 0;
          return (
            <div
              key={`${occurrence.ruleId}:${occurrence.periodKey}`}
              className="flex items-center gap-2 px-4 py-2"
            >
              <button
                type="button"
                onClick={() => setEditing(occurrence)}
                aria-label={`Review ${occurrence.category}`}
                className="-my-1 -ml-2 flex min-w-0 flex-1 items-center gap-3 rounded-2xl py-1 pl-2 text-left transition-colors hover:bg-white/4 active:bg-white/6"
              >
                <RecurringCategoryIcon type={occurrence.type} category={occurrence.category} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm text-white/90">
                    {occurrence.category}
                  </span>
                  <span className="block truncate text-xs tabular-nums text-white/50">
                    {occurrence.type === "income" ? "+" : ""}
                    {formatCurrency(occurrence.amount)}
                    {" · "}
                    <span className={overdue ? "text-amber-300/90" : undefined}>
                      {describeDue(occurrence.dueDate, now)}
                    </span>
                  </span>
                </span>
              </button>

              <RowIconButton
                aria-label={`Skip ${occurrence.category}`}
                onClick={() => skip(occurrence)}
                className="bg-white/6"
              >
                <X />
              </RowIconButton>
              <button
                type="button"
                aria-label={`Confirm ${occurrence.category}`}
                onClick={() => confirm(occurrence)}
                className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#b9d0ff] text-[#0a1f52] transition-transform active:scale-90"
              >
                <Check className="size-4" strokeWidth={2.5} />
              </button>
            </div>
          );
        })}

        {due.length > VISIBLE_ROWS && (
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mx-4 mt-0.5 mb-1.5 h-8 rounded-full text-xs text-white/55 transition-colors hover:bg-white/6 hover:text-white"
          >
            {expanded ? "Show less" : `+${hidden} more`}
          </button>
        )}
      </Card>

      <RecurringConfirmDialog
        key={editing ? `${editing.ruleId}:${editing.periodKey}` : "none"}
        occurrence={editing}
        onOpenChange={(open) => {
          if (!open) setEditing(null);
        }}
      />
    </>
  );
}
