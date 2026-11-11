import { PageTransition } from "@/components/layout/page-transition";
import { Dashboard } from "@/components/dashboard/dashboard";

export default function Home() {
  return (
    <PageTransition>
      <Dashboard />
    </PageTransition>
  );
}
