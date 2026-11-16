"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { importTargetsAction } from "@/app/actions/targets";
import {
  removeTargetAction,
  restoreTargetsAction,
  renameTargetLabelAction,
  setTargetOverrideAction,
  upsertTargetAction,
} from "@/lib/offline/queued-actions";
import { afterSync, isOfflineError } from "@/lib/offline/sync";
import {
  applyRemoveTarget,
  applyTargetLabel,
  applyTargetOverride,
  applyUpsertTarget,
  type CategoryTarget,
  type TargetInput,
} from "@/lib/targets";
import { TARGETS_STORAGE_KEY } from "@/lib/transactions";

export const TARGETS_QUERY_KEY = ["targets"] as const;

/** Set once this browser's local targets have been uploaded to the account. */
const IMPORTED_FLAG_KEY = "expense-tracker:imported:targets";

class SignedOutError extends Error {}

async function fetchTargets(): Promise<CategoryTarget[]> {
  const response = await fetch("/api/data/targets", { cache: "no-store" });
  if (response.status === 401) throw new SignedOutError("Signed out");
  if (!response.ok) throw new Error(`Couldn't load targets (${response.status})`);
  return response.json();
}

function readLocalTargets(): unknown[] {
  try {
    const raw = window.localStorage.getItem(TARGETS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Monthly targets stored in Neon, with the same API as the browser-storage
 * hook so no screen has to change. Changes are optimistic: the list updates
 * at once, saves in the background, and rolls back with a toast on failure.
 */
export function useRemoteTargets() {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: TARGETS_QUERY_KEY,
    queryFn: () => afterSync(fetchTargets),
    retry: (count, error) =>
      !(error instanceof SignedOutError) && !isOfflineError(error) && count < 1,
  });

  const targets = query.data ?? EMPTY;

  /**
   * Applies `update` to the cached list now, then runs `save`. On failure the
   * list is restored and refetched so it matches the server again.
   */
  const optimistic = React.useCallback(
    (update: (list: CategoryTarget[]) => CategoryTarget[], save: () => Promise<unknown>) => {
      void queryClient.cancelQueries({ queryKey: TARGETS_QUERY_KEY });
      const previous = queryClient.getQueryData<CategoryTarget[]>(TARGETS_QUERY_KEY);
      queryClient.setQueryData<CategoryTarget[]>(TARGETS_QUERY_KEY, (list) => update(list ?? []));
      save().catch(() => {
        queryClient.setQueryData(TARGETS_QUERY_KEY, previous);
        void queryClient.invalidateQueries({ queryKey: TARGETS_QUERY_KEY });
        toast.error("That change couldn’t be saved, so it was undone.");
      });
    },
    [queryClient],
  );

  const upsertTarget = React.useCallback(
    (input: TargetInput) => {
      const now = Date.now();
      optimistic(
        (list) => applyUpsertTarget(list, input, now),
        () => upsertTargetAction(input),
      );
    },
    [optimistic],
  );

  /** Puts a deleted target back exactly as it was, monthly values included (Undo). */
  const restoreTarget = React.useCallback(
    (target: CategoryTarget) => {
      optimistic(
        (list) => (list.some((t) => t.categoryKey === target.categoryKey) ? list : [...list, target]),
        () => restoreTargetsAction([target]),
      );
    },
    [optimistic],
  );

  const removeTarget = React.useCallback(
    (categoryKey: string) => {
      optimistic(
        (list) => applyRemoveTarget(list, categoryKey),
        () => removeTargetAction(categoryKey),
      );
    },
    [optimistic],
  );

  const setTargetOverride = React.useCallback(
    (categoryKey: string, month: string, amount: number | undefined) => {
      const now = Date.now();
      optimistic(
        (list) => applyTargetOverride(list, categoryKey, month, amount, now),
        () => setTargetOverrideAction(categoryKey, month, amount),
      );
    },
    [optimistic],
  );

  /**
   * Keeps the cached label in step with a category rename, so the target
   * still matches the transactions that carry the new label.
   */
  const renameTargetLabel = React.useCallback(
    (categoryKey: string, categoryLabel: string) => {
      const now = Date.now();
      optimistic(
        (list) => applyTargetLabel(list, categoryKey, categoryLabel, now),
        () => renameTargetLabelAction(categoryKey, categoryLabel),
      );
    },
    [optimistic],
  );

  // One-time import: targets saved in this browser before sign-in are
  // uploaded once. Categories that already have a target on the account are
  // skipped, so repeating it (another tab, a retry) changes nothing. The
  // local copy stays as a backup until the browser-storage code is removed.
  const importStarted = React.useRef(false);
  React.useEffect(() => {
    if (!query.isSuccess || importStarted.current) return;
    importStarted.current = true;
    try {
      if (window.localStorage.getItem(IMPORTED_FLAG_KEY)) return;
    } catch {
      return;
    }
    const local = readLocalTargets();
    const markDone = () => {
      try {
        window.localStorage.setItem(IMPORTED_FLAG_KEY, String(Date.now()));
      } catch {
        // Storage blocked: the import may run again, which is harmless.
      }
    };
    if (local.length === 0) {
      markDone();
      return;
    }
    importTargetsAction(local)
      .then(({ inserted }) => {
        markDone();
        void queryClient.invalidateQueries({ queryKey: TARGETS_QUERY_KEY });
        if (inserted > 0) {
          toast.success(
            `Moved ${inserted} monthly ${inserted === 1 ? "target" : "targets"} from this device to your account`,
          );
        }
      })
      .catch(() => {
        // Not marked done, so it's tried again next time the app opens.
        importStarted.current = false;
        toast.error("Couldn’t upload this device’s targets yet. It will retry next time.");
      });
  }, [query.isSuccess, queryClient]);

  // A failed first load (not just being signed out) is worth a toast.
  React.useEffect(() => {
    if (query.isError &&
      !(query.error instanceof SignedOutError) &&
      !isOfflineError(query.error)) {
      toast.error("Couldn’t load your targets. Reopen the app to try again.");
    }
  }, [query.isError, query.error]);

  return {
    targets,
    upsertTarget,
    removeTarget,
    restoreTarget,
    setTargetOverride,
    renameTargetLabel,
    isLoaded: !query.isPending,
  };
}

const EMPTY: CategoryTarget[] = [];
