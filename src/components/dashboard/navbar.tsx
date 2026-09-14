"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight, Tags, User } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { TransactionType } from "@/lib/transactions";

import { ManageCategoriesDialog } from "./manage-categories-dialog";

export function Navbar({
  monthLabel,
  onPrevMonth,
  onNextMonth,
  hiddenCategories,
  onToggleCategory,
}: {
  monthLabel: string;
  onPrevMonth: () => void;
  onNextMonth: () => void;
  hiddenCategories: Record<TransactionType, string[]>;
  onToggleCategory: (type: TransactionType, key: string) => void;
}) {
  const [manageCategoriesOpen, setManageCategoriesOpen] = React.useState(false);

  return (
    <div className="solid-panel sticky top-4 z-20 grid grid-cols-[2.5rem_1fr_2.5rem] items-center rounded-2xl border border-white/10 px-3 py-1 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-12px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-500">
      <div />
      <div className="flex items-center justify-center gap-0.5">
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onPrevMonth}
          aria-label="Previous month"
        >
          <ChevronLeft className="size-4" />
        </Button>
        <span className="min-w-28 text-center text-sm font-medium tabular-nums">
          {monthLabel}
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="rounded-full"
          onClick={onNextMonth}
          aria-label="Next month"
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          className="justify-self-end rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label="Account menu"
        >
          <Avatar>
            <AvatarImage src="/avatar.png" alt="" />
            <AvatarFallback>
              <User className="size-4" />
            </AvatarFallback>
          </Avatar>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" sideOffset={10}>
          <DropdownMenuItem onClick={() => setManageCategoriesOpen(true)}>
            <Tags />
            Manage categories
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ManageCategoriesDialog
        open={manageCategoriesOpen}
        onOpenChange={setManageCategoriesOpen}
        hidden={hiddenCategories}
        onToggleCategory={onToggleCategory}
      />
    </div>
  );
}
