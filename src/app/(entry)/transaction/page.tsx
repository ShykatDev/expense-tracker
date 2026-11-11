import { TransactionEntry } from "@/components/transaction/transaction-entry";
import type { Metadata, Viewport } from "next";

// The entry screen is white, so the browser chrome should match it.
export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

// The screen reads the entry id and the transaction type from the query
// string, so it has to be rendered on request rather than prerendered.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Add transaction · Expense Tracker",
};

export default function TransactionPage() {
  return <TransactionEntry />;
}
