"use client";

import { toast } from "@yusufceng1z/ding-react";

/** How long the Undo button stays available. */
const UNDO_MS = 6000;

/**
 * "Deleted …" with an Undo button, instead of asking "Are you sure?" first:
 * faster for the common case, and a slip is one tap to reverse. Tapping Undo
 * runs `onUndo` and turns the toast into "Restored". `onExpire` runs once
 * the chance to undo has passed (e.g. to delete a goal's photo for good).
 */
export function undoToast(
  title: string,
  onUndo: () => void,
  options: { restoredTitle?: string; onExpire?: () => void } = {},
) {
  let undone = false;
  toast.success(title, {
    duration: UNDO_MS,
    action: {
      label: "Undo",
      onClick: () => {
        undone = true;
        onUndo();
        return { title: options.restoredTitle ?? "Restored", action: null, duration: 2000 };
      },
    },
  });
  if (options.onExpire) {
    const onExpire = options.onExpire;
    // A little after the toast closes, so a last-moment Undo still counts.
    setTimeout(() => {
      if (!undone) onExpire();
    }, UNDO_MS + 1500);
  }
}
