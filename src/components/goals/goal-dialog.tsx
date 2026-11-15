"use client";

import { CalendarDays, ImagePlus, Link2, Plus, X } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { IconPicker } from "@/components/categories/icon-picker";
import { NumericKeypad } from "@/components/transaction/numeric-keypad";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DEFAULT_CATEGORY_ICON, getCategoryIconByKey } from "@/lib/category-icons";
import { useGoalImage } from "@/hooks/use-goal-image";
import {
  formatBytes,
  getGoalImageStats,
  getStorageEstimate,
  prepareGoalImage,
} from "@/lib/goal-images";
import { goalLinkLabel, goalPriceTimeline, normalizeGoalLink, type Goal } from "@/lib/goals";
import { formatCurrency } from "@/lib/transactions";
import { cn } from "@/lib/utils";

const MAX_LABEL_LENGTH = 40;
const MAX_LINKS = 5;
/** The icon / date / links tabs. */
const CHIP_CLASS =
  "flex h-10 min-w-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-sm transition-colors active:scale-95";
/** Below this much free space the storage line turns amber. */
const LOW_STORAGE_BYTES = 20 * 1024 * 1024;

interface StorageInfo {
  photos: { count: number; bytes: number } | null;
  estimate: { usage: number; quota: number; free: number } | null;
}

export interface GoalDialogInput {
  label: string;
  targetAmount: number;
  iconKey: string;
  targetDate?: number;
  links: string[];
  /** A new photo, null to remove the current one, undefined to keep it. */
  image?: Blob | null;
}

/** A date as "YYYY-MM-DD" in local time (toISOString would use UTC). */
function toLocalDateInput(time: number) {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** "YYYY-MM-DD" → local midnight, so the saved day never shifts by timezone. */
function fromLocalDateInput(value: string) {
  return new Date(`${value}T00:00:00`).getTime();
}

/** "Mar 3" (adding the year when it isn't this year). */
function formatShortDay(time: number) {
  const date = new Date(time);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    ...(date.getFullYear() !== new Date().getFullYear() && { year: "numeric" }),
  });
}

/** Earlier prices shown under the amount; older ones are summarised. */
const MAX_PRICES_SHOWN = 3;

/** "80000" → "80,000", keeping a trailing "." while it is being typed. */
function formatTyped(raw: string) {
  if (!raw) return "0";
  const trailingDot = raw.endsWith(".");
  return Number(raw.replace(/\.$/, "")).toLocaleString("en-US") + (trailingDot ? "." : "");
}

/**
 * Add or edit a goal, built like the entry screen: the name in a pill, the
 * target amount large with the keypad beneath it, and the icon and target
 * date as chips. Tapping the icon chip swaps the keypad for the icon grid.
 */
export function GoalDialog({
  open,
  onOpenChange,
  mode,
  initial,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  initial?: Goal;
  onSubmit: (input: GoalDialogInput) => void;
}) {
  const [label, setLabel] = React.useState(initial?.label ?? "");
  const [amount, setAmount] = React.useState(initial ? String(initial.targetAmount) : "");
  const [iconKey, setIconKey] = React.useState(initial?.iconKey ?? DEFAULT_CATEGORY_ICON);
  const [targetDate, setTargetDate] = React.useState(
    initial?.targetDate ? toLocalDateInput(initial.targetDate) : "",
  );
  const dateInputRef = React.useRef<HTMLInputElement>(null);
  /** Today, captured once: target dates can't be in the past. */
  const [today] = React.useState(() => toLocalDateInput(Date.now()));

  // Open the platform's date picker. Phones open it on tap anyway; desktop
  // browsers only do with showPicker(), otherwise a click just selects the
  // day/month/year text.
  function openDatePicker() {
    const input = dateInputRef.current;
    if (!input) return;
    try {
      input.showPicker();
    } catch {
      input.focus();
      input.click();
    }
  }
  /** What sits under the chips: the keypad, the icon grid or the links. */
  const [panel, setPanel] = React.useState<"keypad" | "icon" | "links">("keypad");
  const pickingIcon = panel === "icon";
  const editingLinks = panel === "links";

  const [links, setLinks] = React.useState<string[]>(() =>
    initial?.links?.length ? [...initial.links] : [],
  );
  const filledLinks = links.filter((link) => link.trim()).length;

  /** A newly picked photo, null once removed, undefined if untouched. */
  const [image, setImage] = React.useState<Blob | null | undefined>(undefined);
  const [processingImage, setProcessingImage] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const storedImageUrl = useGoalImage(image === undefined ? initial?.imageId : undefined);
  const pickedImageUrl = React.useMemo(
    () => (image ? URL.createObjectURL(image) : null),
    [image],
  );
  React.useEffect(
    () => () => {
      if (pickedImageUrl) URL.revokeObjectURL(pickedImageUrl);
    },
    [pickedImageUrl],
  );
  const imageUrl = image === undefined ? storedImageUrl : pickedImageUrl;

  // Storage left on the device, re-read each time the dialog opens, so you
  // can decide whether a photo is worth adding.
  const [storage, setStorage] = React.useState<StorageInfo | null>(null);
  React.useEffect(() => {
    if (!open) return;
    let cancelled = false;
    Promise.all([
      getGoalImageStats().catch(() => null),
      getStorageEstimate().catch(() => null),
    ]).then(([photos, estimate]) => {
      if (!cancelled) setStorage({ photos, estimate });
    });
    return () => {
      cancelled = true;
    };
  }, [open]);
  const lowStorage =
    storage?.estimate != null &&
    storage.estimate.free - (image?.size ?? 0) < LOW_STORAGE_BYTES;

  async function handleImagePicked(file: File | undefined) {
    if (!file) return;
    setProcessingImage(true);
    try {
      setImage(await prepareGoalImage(file));
    } catch {
      toast.error("Couldn’t read that image");
    } finally {
      setProcessingImage(false);
    }
  }

  // Editing the price keeps the old one in the goal's history (see
  // updateGoal), so say so, and list the prices it has had before.
  const typedAmount = Number(amount);
  const priceChanged =
    mode === "edit" &&
    initial !== undefined &&
    Number.isFinite(typedAmount) &&
    typedAmount > 0 &&
    typedAmount !== initial.targetAmount;
  const earlierPrices = initial?.priceHistory?.length
    ? goalPriceTimeline(initial).slice(0, -1).reverse()
    : [];

  const dateLabel = targetDate
    ? new Date(`${targetDate}T00:00:00`).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        ...(targetDate.slice(0, 4) !== today.slice(0, 4) && { year: "2-digit" }),
      })
    : null;

  function handleSubmit() {
    const trimmed = label.trim();
    if (!trimmed) {
      toast.error("Enter a goal name");
      return;
    }

    const value = Number(amount);
    if (!amount.trim() || !Number.isFinite(value) || value <= 0) {
      toast.error("Enter a target amount");
      return;
    }

    const normalizedLinks: string[] = [];
    for (const raw of links) {
      if (!raw.trim()) continue;
      const link = normalizeGoalLink(raw);
      if (!link) {
        toast.error(`“${raw.trim()}” isn’t a valid link`);
        setPanel("links");
        return;
      }
      if (!normalizedLinks.includes(link)) normalizedLinks.push(link);
    }

    onSubmit({
      label: trimmed,
      targetAmount: value,
      iconKey,
      targetDate: targetDate ? fromLocalDateInput(targetDate) : undefined,
      links: normalizedLinks,
      image,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "New goal" : "Edit goal"}</DialogTitle>
          <DialogDescription>Something you’re saving up for.</DialogDescription>
        </DialogHeader>

        {/* min-w-0: the dialog is a grid; keep content within the sheet. */}
        <div className="flex min-w-0 flex-col gap-5">
          {/* Photo tile + name. The tile previews the card: the photo when
              there is one, otherwise the chosen icon. */}
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-3">
              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={processingImage}
                  aria-label={imageUrl ? "Change photo" : "Add a photo"}
                  className={cn(
                    "flex size-16 items-center justify-center overflow-hidden rounded-2xl transition-transform active:scale-95 disabled:opacity-60",
                    imageUrl
                      ? "bg-white/8"
                      : "border border-dashed border-white/20 bg-white/4 text-[#b9d0ff] hover:bg-white/8",
                  )}
                >
                  {imageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element -- local blob URL
                    <img src={imageUrl} alt="" className="size-full object-cover" />
                  ) : (
                    React.createElement(getCategoryIconByKey(iconKey), { className: "size-6" })
                  )}
                </button>
                {imageUrl ? (
                  <button
                    type="button"
                    onClick={() => setImage(null)}
                    aria-label="Remove photo"
                    className="absolute -top-1.5 -right-1.5 flex size-6 items-center justify-center rounded-full bg-white text-black shadow ring-2 ring-[#141518] active:scale-90"
                  >
                    <X className="size-3.5" strokeWidth={2.5} />
                  </button>
                ) : (
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute -right-1.5 -bottom-1.5 flex size-6 items-center justify-center rounded-full bg-white text-black ring-2 ring-[#141518]"
                  >
                    {processingImage ? (
                      <span className="size-2.5 animate-pulse rounded-full bg-black/60" />
                    ) : (
                      <ImagePlus className="size-3.5" strokeWidth={2.25} />
                    )}
                  </span>
                )}
              </div>

              <input
                value={label}
                maxLength={MAX_LABEL_LENGTH}
                placeholder="What is it? e.g. PS5"
                aria-label="Goal name"
                onChange={(event) => setLabel(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSubmit();
                }}
                className="h-16 min-w-0 flex-1 rounded-2xl bg-white/6 px-4 text-base text-white outline-none placeholder:text-white/45 focus:ring-1 focus:ring-white/25"
              />
            </div>

            {/* How much room is left for photos on this device. */}
            {storage && Boolean(storage.estimate || storage.photos?.count) && (
              <p
                className={cn(
                  "px-1 text-[11px] leading-snug tabular-nums",
                  lowStorage ? "text-amber-300" : "text-white/40",
                )}
              >
                {lowStorage
                  ? "Storage is almost full — consider skipping the photo. "
                  : null}
                {storage.estimate && `${formatBytes(storage.estimate.free)} free`}
                {storage.estimate && storage.photos?.count ? " · " : null}
                {storage.photos?.count ? 
                  `${storage.photos.count} ${storage.photos.count === 1 ? "photo" : "photos"} (${formatBytes(storage.photos.bytes)})`
                  : null}
                {image && ` · this one ${formatBytes(image.size)}`}
              </p>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                void handleImagePicked(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>

          {/* The target amount, large, as on the entry screen. */}
          <div className="flex flex-col items-center gap-1">
            <p
              aria-live="polite"
              aria-label={`Target amount ${amount || "0"}`}
              className="font-display text-5xl font-semibold tracking-tight tabular-nums whitespace-nowrap"
            >
              <span className={amount ? "text-white" : "text-white/30"}>৳</span>
              <span className={amount ? "text-white" : "text-white/30"}>{formatTyped(amount)}</span>
            </p>
            <p className="text-xs text-white/50">target price</p>
            {(priceChanged || earlierPrices.length > 0) && (
              <p className="max-w-full px-2 text-center text-[11px] leading-snug tabular-nums text-white/40">
                {priceChanged && initial && (
                  <span className="text-white/60">
                    Was {formatCurrency(initial.targetAmount)} · kept in history
                  </span>
                )}
                {priceChanged && earlierPrices.length > 0 && <br />}
                {earlierPrices.length > 0 && (
                  <>
                    Earlier:{" "}
                    {earlierPrices
                      .slice(0, MAX_PRICES_SHOWN)
                      .map((entry) => `${formatCurrency(entry.amount)} (${formatShortDay(entry.since)})`)
                      .join(" · ")}
                    {earlierPrices.length > MAX_PRICES_SHOWN &&
                      ` · +${earlierPrices.length - MAX_PRICES_SHOWN} more`}
                  </>
                )}
              </p>
            )}
          </div>

          {/* Icon, date and links: one row of equal tabs. Icon and links swap
              the keypad for their panel; date opens the native picker. */}
          <div className="grid grid-cols-3 gap-1.5 rounded-full bg-white/6 p-1">
            <button
              type="button"
              onClick={() => setPanel((prev) => (prev === "icon" ? "keypad" : "icon"))}
              aria-expanded={pickingIcon}
              className={cn(
                CHIP_CLASS,
                pickingIcon ? "bg-white text-black" : "text-white/75 hover:bg-white/8",
              )}
            >
              {React.createElement(getCategoryIconByKey(iconKey), { className: "size-4 shrink-0" })}
              <span className="truncate">Icon</span>
            </button>

            {/* The real date input sits invisibly over the tab so a tap on a
                phone reaches it; the clear button sits above both. */}
            <span
              className={cn(
                CHIP_CLASS,
                "relative focus-within:ring-1 focus-within:ring-white/25",
                dateLabel ? "bg-white/10 text-white" : "text-white/75 hover:bg-white/8",
              )}
            >
              <CalendarDays className="size-4 shrink-0" />
              <span className="truncate">{dateLabel ?? "Date"}</span>
              <input
                ref={dateInputRef}
                type="date"
                value={targetDate}
                min={today}
                aria-label="Target date (optional)"
                onClick={(event) => {
                  event.preventDefault();
                  openDatePicker();
                }}
                onChange={(event) => setTargetDate(event.target.value)}
                className="absolute inset-0 size-full cursor-pointer appearance-none rounded-full opacity-0 [color-scheme:dark]"
              />
              {dateLabel && (
                <button
                  type="button"
                  onClick={() => setTargetDate("")}
                  aria-label="Remove target date"
                  className="relative z-10 -mr-1.5 flex size-6 shrink-0 items-center justify-center rounded-full text-white/60 hover:bg-white/10 hover:text-white"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </span>

            <button
              type="button"
              onClick={() => {
                if (!editingLinks && links.length === 0) setLinks([""]);
                setPanel((prev) => (prev === "links" ? "keypad" : "links"));
              }}
              aria-expanded={editingLinks}
              className={cn(
                CHIP_CLASS,
                editingLinks
                  ? "bg-white text-black"
                  : filledLinks > 0
                    ? "bg-white/10 text-white"
                    : "text-white/75 hover:bg-white/8",
              )}
            >
              <Link2 className="size-4 shrink-0" />
              <span className="truncate">
                {filledLinks > 0 ? `${filledLinks} ${filledLinks === 1 ? "link" : "links"}` : "Links"}
              </span>
            </button>
          </div>

          {/* The keypad, or the icon grid in its place while choosing. */}
          {pickingIcon ? (
            <div className="animate-in fade-in duration-200">
              <IconPicker
                value={iconKey}
                onChange={(next) => {
                  setIconKey(next);
                  setPanel("keypad");
                }}
              />
            </div>
          ) : editingLinks ? (
            <div className="animate-in fade-in flex flex-col gap-2 rounded-3xl bg-white/6 p-2.5 duration-200">
              {links.map((link, index) => {
                const valid = normalizeGoalLink(link);
                return (
                  <div key={index} className="flex items-center gap-1.5">
                    <input
                      value={link}
                      type="url"
                      inputMode="url"
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="Paste a product link"
                      aria-label={`Link ${index + 1}`}
                      onChange={(event) => {
                        const next = event.target.value;
                        setLinks((prev) => prev.map((item, i) => (i === index ? next : item)));
                      }}
                      className="h-10 min-w-0 flex-1 rounded-full bg-white/6 px-4 text-sm text-white outline-none placeholder:text-white/40 focus:ring-1 focus:ring-white/25"
                    />
                    {valid && (
                      <span className="hidden max-w-28 shrink-0 truncate text-xs text-white/40 sm:block">
                        {goalLinkLabel(valid)}
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => setLinks((prev) => prev.filter((_, i) => i !== index))}
                      aria-label={`Remove link ${index + 1}`}
                      className="flex size-8 shrink-0 items-center justify-center rounded-full text-white/50 transition-colors hover:bg-white/8 hover:text-white"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                );
              })}
              {links.length < MAX_LINKS && (
                <button
                  type="button"
                  onClick={() => setLinks((prev) => [...prev, ""])}
                  className="flex h-10 items-center justify-center gap-1.5 rounded-full text-sm text-white/60 transition-colors hover:bg-white/6 hover:text-white"
                >
                  <Plus className="size-4" />
                  Add another link
                </button>
              )}
              <button
                type="button"
                onClick={() => setPanel("keypad")}
                className="h-10 rounded-full bg-white/10 text-sm text-white/80 transition-colors hover:bg-white/15"
              >
                Done
              </button>
            </div>
          ) : (
            <NumericKeypad
              value={amount}
              onChange={setAmount}
              variant="dark"
              endKey="backspace"
              compact
            />
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-row">
          <Button size="lg" onClick={handleSubmit}>
            {mode === "create" ? "Add goal" : "Save changes"}
          </Button>
          <DialogClose render={<Button variant="outline" size="lg" />}>Cancel</DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
