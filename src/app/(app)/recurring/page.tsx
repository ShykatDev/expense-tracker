import { RecurringView } from "@/components/recurring/recurring-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recurring · Pulse",
};

export default function RecurringPage() {
  return <RecurringView />;
}
