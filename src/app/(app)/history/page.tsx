import { PageTransition } from "@/components/layout/page-transition";
import { HistoryView } from "@/components/history/history-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History · Pulse",
};

export default function HistoryPage() {
  return (
    <PageTransition>
      <HistoryView />
    </PageTransition>
  );
}
