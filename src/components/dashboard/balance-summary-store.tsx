"use client";

import * as React from "react";

interface BalanceSummary {
  balance: number;
  changePercent: number | null;
}

/**
 * The bottom bar lives in the shared layout so it appears on every route, but
 * the balance it renders belongs to the dashboard's current filter. The
 * layout owns this store and the dashboard publishes into it; pages that
 * don't own a balance simply never publish, leaving the neutral default.
 */
const BalanceSummaryContext = React.createContext<{
  summary: BalanceSummary;
  publish: (summary: BalanceSummary) => void;
}>({
  summary: { balance: 0, changePercent: null },
  publish: () => {},
});

export function BalanceSummaryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [summary, setSummary] = React.useState<BalanceSummary>({
    balance: 0,
    changePercent: null,
  });

  const publish = React.useCallback((next: BalanceSummary) => {
    setSummary(next);
  }, []);

  const value = React.useMemo(
    () => ({ summary, publish }),
    [summary, publish],
  );

  return (
    <BalanceSummaryContext.Provider value={value}>
      {children}
    </BalanceSummaryContext.Provider>
  );
}

export function useBalanceSummaryStore() {
  return React.useContext(BalanceSummaryContext);
}

/**
 * Publishes the dashboard's balance into the shared store while the
 * dashboard is mounted. The ref keeps the effect tied to the values that
 * actually change, so an unrelated re-render doesn't republish.
 */
export function usePublishBalance(summary: BalanceSummary) {
  const { publish } = useBalanceSummaryStore();
  const { balance, changePercent } = summary;
  const published = React.useRef(false);

  React.useEffect(() => {
    if (!published.current) {
      published.current = true;
    }
    publish({ balance, changePercent });
  }, [publish, balance, changePercent]);
}
