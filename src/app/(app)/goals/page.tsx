import { GoalsView } from "@/components/goals/goals-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Goals · Pulse",
};

export default function GoalsPage() {
  return <GoalsView />;
}
