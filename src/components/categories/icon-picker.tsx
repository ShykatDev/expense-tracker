"use client";

import {
  CATEGORY_ICON_KEYS,
  getCategoryIconByKey,
} from "@/lib/category-icons";
import { cn } from "@/lib/utils";

export function IconPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="grid max-h-56 grid-cols-6 gap-1.5 overflow-y-auto rounded-3xl bg-white/6 p-2.5 sm:grid-cols-8">
      {CATEGORY_ICON_KEYS.map((key) => {
        const Icon = getCategoryIconByKey(key);
        const selected = key === value;
        return (
          <button
            key={key}
            type="button"
            aria-label={key}
            aria-pressed={selected}
            onClick={() => onChange(key)}
            className={cn(
              "flex size-9 items-center justify-center rounded-full transition-colors",
              selected
                ? "bg-white text-black"
                : " text-muted-foreground hover:bg-white/8 hover:text-foreground",
            )}
          >
            <Icon className="size-5" />
          </button>
        );
      })}
    </div>
  );
}
