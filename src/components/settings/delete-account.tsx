"use client";

import { UserX } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { deleteMyAccountAction } from "@/app/actions/user";
import { clearQueryCache } from "@/components/providers/query-provider";
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
import { HoldButton } from "@/components/ui/hold-button";
import { clearGoalImages } from "@/lib/goal-images";
import { endGuestMode } from "@/lib/guest";
import { clearOutbox } from "@/lib/offline/sync";

const STORAGE_PREFIX = "expense-tracker:";

/** Everything this app keeps in the browser: data, flags, queue, cache. */
function clearLocalData() {
  clearOutbox();
  clearQueryCache();
  const keys: string[] = [];
  for (let i = 0; i < window.localStorage.length; i += 1) {
    const key = window.localStorage.key(i);
    if (key?.startsWith(STORAGE_PREFIX)) keys.push(key);
  }
  for (const key of keys) window.localStorage.removeItem(key);
}

/**
 * "Delete my account", for signed-in users: removes the Google-linked
 * account and every piece of data stored with it, on the server and on this
 * device. Confirmed by pressing and holding, since there's no undo.
 */
export function DeleteAccountBlock() {
  const [open, setOpen] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);

  async function handleDelete() {
    setDeleting(true);
    try {
      await deleteMyAccountAction();
    } catch {
      toast.error("Couldn’t delete your account. Check your connection and try again.");
      setDeleting(false);
      return;
    }
    clearLocalData();
    endGuestMode();
    // Photos live in IndexedDB; then start over on the sign-in page.
    clearGoalImages()
      .catch(() => {})
      .finally(() => window.location.replace("/sign-in"));
  }

  return (
    <>
      <div className="flex flex-col gap-4 rounded-3xl bg-rose-500/8 p-5 ring-1 ring-rose-400/15">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-rose-500/15 text-rose-300">
            <UserX className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-white">Delete my account</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/50">
              Removes your account and everything synced to it, on every device. You can
              sign in again later, but you&apos;ll start from nothing.
            </p>
          </div>
        </div>
        <Button
          variant="destructive"
          size="lg"
          onClick={() => setOpen(true)}
        >
          <UserX />
          Delete my account
        </Button>
      </div>

      <Dialog open={open} onOpenChange={(next) => !deleting && setOpen(next)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete your account?</DialogTitle>
            <DialogDescription>
              This permanently deletes your account and all of its data: transactions,
              accounts, categories, targets, goals and recurring rules. It can&apos;t be
              undone. Press and hold the button to confirm.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <HoldButton
              onConfirm={handleDelete}
              busy={deleting}
              busyLabel="Deleting…"
              icon={<UserX className="size-4" />}
            >
              Hold to delete my account
            </HoldButton>
            <DialogClose render={<Button variant="outline" size="lg" disabled={deleting} />}>
              Cancel
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
