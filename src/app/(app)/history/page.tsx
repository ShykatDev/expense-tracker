import { HistoryView } from "@/components/history/history-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "History · Expense Tracker",
};

export default function HistoryPage() {
  return <HistoryView />;
}
