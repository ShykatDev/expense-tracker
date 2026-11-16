"use client";

import * as React from "react";

import { useRemoteTargets } from "@/hooks/use-remote-targets";
import { useLocalTargets } from "@/hooks/use-targets";
import type { CategoryTarget, TargetInput } from "@/lib/targets";

interface TargetsContextValue {
  targets: CategoryTarget[];
  upsertTarget: (input: TargetInput) => void;
  removeTarget: (categoryKey: string) => void;
  /** Puts a deleted target back exactly as it was (Undo). */
  restoreTarget: (target: CategoryTarget) => void;
  setTargetOverride: (
    categoryKey: string,
    month: string,
    amount: number | undefined,
  ) => void;
  renameTargetLabel: (categoryKey: string, categoryLabel: string) => void;
  isLoaded: boolean;
}

const TargetsContext = React.createContext<TargetsContextValue | null>(null);

type TargetsState = ReturnType<typeof useLocalTargets>;

/** Memoized context value, so consumers only re-render when data changes. */
function useContextValue(state: TargetsState): TargetsContextValue {
  const {
    targets,
    upsertTarget,
    removeTarget,
    restoreTarget,
    setTargetOverride,
    renameTargetLabel,
    isLoaded,
  } = state;
  return React.useMemo(
    () => ({
      targets,
      upsertTarget,
      removeTarget,
      restoreTarget,
      setTargetOverride,
      renameTargetLabel,
      isLoaded,
    }),
    [
      targets,
      upsertTarget,
      removeTarget,
      restoreTarget,
      setTargetOverride,
      renameTargetLabel,
      isLoaded,
    ],
  );
}

function LocalTargetsProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useLocalTargets());
  return <TargetsContext.Provider value={value}>{children}</TargetsContext.Provider>;
}

function RemoteTargetsProvider({ children }: { children: React.ReactNode }) {
  const value = useContextValue(useRemoteTargets());
  return <TargetsContext.Provider value={value}>{children}</TargetsContext.Provider>;
}

/**
 * Single source of truth for category targets across routes, hosted in the
 * root layout so /categories and the dashboard share one instance.
 *
 * `remote` is decided on the server: once Google sign-in and the database
 * are configured, targets live in Neon (and sync across devices); otherwise
 * they stay in this browser's localStorage. Both expose the same API.
 */
export function TargetsProvider({
  remote = false,
  children,
}: {
  remote?: boolean;
  children: React.ReactNode;
}) {
  return remote ? (
    <RemoteTargetsProvider>{children}</RemoteTargetsProvider>
  ) : (
    <LocalTargetsProvider>{children}</LocalTargetsProvider>
  );
}

export function useTargets() {
  const context = React.useContext(TargetsContext);
  if (!context) {
    throw new Error("useTargets must be used within a TargetsProvider");
  }
  return context;
}
