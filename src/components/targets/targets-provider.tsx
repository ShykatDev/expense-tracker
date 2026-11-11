"use client";

import * as React from "react";

import { useTargets as useTargetsState } from "@/hooks/use-targets";
import type { CategoryTarget } from "@/lib/targets";

interface TargetsContextValue {
  targets: CategoryTarget[];
  upsertTarget: ReturnType<typeof useTargetsState>["upsertTarget"];
  removeTarget: ReturnType<typeof useTargetsState>["removeTarget"];
  setTargetOverride: ReturnType<typeof useTargetsState>["setTargetOverride"];
  renameTargetLabel: ReturnType<typeof useTargetsState>["renameTargetLabel"];
  isLoaded: boolean;
}

const TargetsContext = React.createContext<TargetsContextValue | null>(null);

/**
 * Single source of truth for category targets across routes. The underlying
 * hook is localStorage backed, so two independent instances would drift
 * apart: a target set on /categories would not show up on the dashboard.
 * This provider lives in the root layout, which is preserved across client
 * side navigation, so both routes share one instance.
 */
export function TargetsProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const {
    targets,
    upsertTarget,
    removeTarget,
    setTargetOverride,
    renameTargetLabel,
    isLoaded,
  } = useTargetsState();

  const value = React.useMemo(
    () => ({
      targets,
      upsertTarget,
      removeTarget,
      setTargetOverride,
      renameTargetLabel,
      isLoaded,
    }),
    [
      targets,
      upsertTarget,
      removeTarget,
      setTargetOverride,
      renameTargetLabel,
      isLoaded,
    ],
  );

  return (
    <TargetsContext.Provider value={value}>{children}</TargetsContext.Provider>
  );
}

export function useTargets() {
  const context = React.useContext(TargetsContext);
  if (!context) {
    throw new Error("useTargets must be used within a TargetsProvider");
  }
  return context;
}
