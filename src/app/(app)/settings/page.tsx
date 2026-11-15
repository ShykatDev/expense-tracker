import { SettingsView } from "@/components/settings/settings-view";
import { isAuthConfigured } from "@/lib/auth";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · Pulse",
};

export default function SettingsPage() {
  // Decided on the server, where the secrets are; the account card only
  // shows once Google sign-in is set up.
  return <SettingsView authEnabled={isAuthConfigured()} />;
}
