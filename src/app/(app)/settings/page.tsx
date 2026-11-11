import { PageTransition } from "@/components/layout/page-transition";
import { SettingsView } from "@/components/settings/settings-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · Pulse",
};

export default function SettingsPage() {
  return (
    <PageTransition>
      <SettingsView />
    </PageTransition>
  );
}
