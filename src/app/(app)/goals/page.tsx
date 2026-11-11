import { GoalsView } from "@/components/goals/goals-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals · Expense Tracker",
};

export default function GoalsPage() {
  return <GoalsView />;
}
