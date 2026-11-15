import { SettingsView } from "@/components/settings/settings-view";
import { isAuthConfigured } from "@/lib/auth";
import { isRemoteData } from "@/server/data-mode";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Settings · Pulse",
};

export default async function SettingsPage() {
  // Decided on the server, where the secrets are. The account card always
  // shows; its Sign in button only works once Google sign-in is set up.
  // Guests who skipped sign-in can sign in from it, but aren't synced yet.
  return (
    <SettingsView authEnabled={isAuthConfigured()} synced={await isRemoteData()} />
  );
}
