"use client";

import * as React from "react";
import {
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  Menu,
  Tags,
  Target,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

function startOfMonth(monthOffset: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + monthOffset, 1);
}

interface MonthNavContextValue {
  monthAnchor: Date;
  monthLabel: string;
  goToPrevMonth: () => void;
  goToNextMonth: () => void;
  goToMonth: (offset: number) => void;
}

const MonthNavContext = React.createContext<MonthNavContextValue | null>(null);

/**
 * The month picker lives in the navbar, but the dashboard needs the selected
 * month to filter its data. Sharing it through a context keeps the navbar
 * chrome in the layout while the state stays reachable from the page.
 */
export function useMonthNav() {
  const context = React.useContext(MonthNavContext);
  if (!context) {
    throw new Error("useMonthNav must be used within a MonthNavProvider");
  }
  return context;
}

export function MonthNavProvider({ children }: { children: React.ReactNode }) {
  const [monthOffset, setMonthOffset] = React.useState(0);

  const monthAnchor = React.useMemo(() => startOfMonth(monthOffset), [monthOffset]);
  const monthLabel = React.useMemo(
    () =>
      monthAnchor.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      }),
    [monthAnchor],
  );

  const value = React.useMemo(
    () => ({
      monthAnchor,
      monthLabel,
      goToPrevMonth: () => setMonthOffset((prev) => prev - 1),
      goToNextMonth: () => setMonthOffset((prev) => prev + 1),
      goToMonth: (offset: number) => setMonthOffset(offset),
    }),
    [monthAnchor, monthLabel],
  );

  return (
    <MonthNavContext.Provider value={value}>{children}</MonthNavContext.Provider>
  );
}

const NAV_ITEMS = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/goals", label: "Goals", icon: Target },
] as const;

/**
 * The navbar is the only persistent chrome across routes, so it doubles as the
 * app's navigation: a menu button opens a sidebar with the route list, and the
 * month stepper sits next to the title.
 */
export function Navbar() {
  const monthNav = React.useContext(MonthNavContext);
  const pathname = usePathname();

  return (
    <div className="solid-panel sticky top-4 z-20 mb-10 flex items-center gap-3 rounded-2xl border border-white/10 px-3 py-2 shadow-[0_1px_0_0_rgba(255,255,255,0.08)_inset,0_8px_30px_-12px_rgba(0,0,0,0.6)] animate-in fade-in slide-in-from-top-2 duration-500">
      <AppSidebar pathname={pathname} />

      {monthNav && (
        <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={monthNav.goToPrevMonth}
            aria-label="Previous month"
          >
            <ChevronLeft className="size-4" />
          </Button>

          <MonthPicker />

          <Button
            variant="ghost"
            size="icon"
            className="shrink-0 rounded-full"
            onClick={monthNav.goToNextMonth}
            aria-label="Next month"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <div className="hidden size-8 shrink-0 sm:block" aria-hidden />
    </div>
  );
}

/**
 * The month is shown as a pill that opens a list of months to jump to, so the
 * user can reach a distant month in one click instead of stepping through
 * arrows.
 */
function MonthPicker() {
  const monthNav = React.useContext(MonthNavContext);
  const [open, setOpen] = React.useState(false);

  const months = React.useMemo(() => {
    const now = new Date();
    return Array.from({ length: 13 }, (_, index) => index - 12).map((offset) => {
      const date = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      return {
        offset,
        label: date.toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        }),
      };
    });
  }, []);

  const currentOffset = React.useMemo(() => {
    const now = new Date();
    if (!monthNav) return 0;
    return (
      (monthNav.monthAnchor.getFullYear() - now.getFullYear()) * 12 +
      (monthNav.monthAnchor.getMonth() - now.getMonth())
    );
  }, [monthNav]);

  if (!monthNav) return null;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        className="flex h-8 min-w-28 items-center justify-center gap-1.5 rounded-full bg-white/10 px-3 text-sm font-medium tabular-nums transition-colors hover:bg-white/15"
        aria-label="Choose month"
      >
        <CalendarDays className="size-3.5 shrink-0 text-muted-foreground" />
        <span className="truncate">{monthNav.monthLabel}</span>
      </PopoverTrigger>

      <PopoverContent align="center" className="w-48">
        <div className="flex flex-col gap-0.5">
          {months.map((month) => (
            <button
              key={month.offset}
              type="button"
              onClick={() => {
                monthNav.goToMonth(month.offset);
                setOpen(false);
              }}
              className={cn(
                "flex h-8 items-center justify-between rounded-lg px-2.5 text-left text-xs font-medium transition-colors",
                month.offset === currentOffset
                  ? "bg-white/15 text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              {month.label}
              {month.offset === currentOffset && (
                <Check className="size-3.5" />
              )}
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}

function AppSidebar({ pathname }: { pathname: string | null }) {
  const [open, setOpen] = React.useState(false);

  return (
    <Drawer
      open={open}
      onOpenChange={setOpen}
      swipeDirection="left"
      showSwipeHandle={false}
    >
      <DrawerTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            className="size-8 shrink-0 rounded-full"
            aria-label="Open navigation menu"
          />
        }
      >
        <Menu className="size-4" />
      </DrawerTrigger>

      <DrawerContent className="w-72 max-w-[85vw]">
        <DrawerHeader>
          <DrawerTitle>Expense Tracker</DrawerTitle>
          <DrawerDescription>
            Track your income and spending at a glance.
          </DrawerDescription>
        </DrawerHeader>

        <nav className="flex flex-col gap-1 px-4 py-2">
          {NAV_ITEMS.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname?.startsWith(item.href);
            const Icon = item.icon;
            return (
              <DrawerClose
                key={item.href}
                render={
                  <Link
                    href={item.href}
                    className={cn(
                      "flex h-10 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-colors",
                      isActive
                        ? "bg-white/15 text-foreground shadow-[0_1px_0_0_rgba(255,255,255,0.1)_inset]"
                        : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
                    )}
                  />
                }
              >
                <Icon className="size-4 shrink-0" />
                {item.label}
              </DrawerClose>
            );
          })}
        </nav>
      </DrawerContent>
    </Drawer>
  );
}
