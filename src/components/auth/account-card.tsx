"use client";

import { LogOut } from "lucide-react";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { SheetSection } from "@/components/layout/app-shell";
import { GoogleLogo } from "@/components/auth/google-logo";
import { signOut, useSession } from "@/lib/auth-client";

/**
 * The signed-in Google account, with sign out. Rendered only when sign-in is
 * configured, so the app still works before the backend is set up.
 */
export function AccountCard() {
  const { data, isPending } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);
  const user = data?.user;

  async function handleSignOut() {
    setSigningOut(true);
    try {
      await signOut();
      // A full load drops every in-memory provider and lands on /sign-in.
      window.location.replace("/sign-in");
    } catch {
      toast.error("Couldn’t sign out. Try again.");
      setSigningOut(false);
    }
  }

  return (
    <SheetSection title="Account">
      {/* Not the shared Card: it treats a leading <img> as a cover photo
          (no top padding, square corners), which squashed the avatar. */}
      <div className="flex items-center gap-3.5 rounded-3xl bg-white/6 p-4">
        <span className="relative shrink-0">
          {isPending ? (
            <span className="block size-12 animate-pulse rounded-full bg-white/8" />
          ) : user?.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- Google avatar URL
            <img
              src={user.image}
              alt=""
              referrerPolicy="no-referrer"
              className="block size-12 rounded-full object-cover ring-2 ring-white/10"
            />
          ) : (
            <span className="flex size-12 items-center justify-center rounded-full bg-[#b9d0ff]/15 text-lg font-semibold text-[#dfe8ff] ring-2 ring-white/10">
              {user?.name?.[0]?.toUpperCase() ?? "?"}
            </span>
          )}
          {/* Which provider this account is signed in with. */}
          {user && (
            <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-white ring-2 ring-[#141518]">
              <GoogleLogo className="size-3" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-white">
            {isPending ? "Loading…" : (user?.name ?? "Not signed in")}
          </span>
          <span className="block truncate text-xs text-white/50">
            {user?.email ?? (isPending ? "" : "Sign in to sync your data")}
          </span>
        </span>

        {user && (
          <button
            type="button"
            onClick={handleSignOut}
            disabled={signingOut}
            aria-label="Sign out"
            className="flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-xs text-white/60 ring-1 ring-white/12 transition-colors hover:bg-white/6 hover:text-white active:scale-95 disabled:opacity-60"
          >
            <LogOut className="size-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        )}
      </div>
    </SheetSection>
  );
}
