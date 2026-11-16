"use client";

import { LogIn, LogOut } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { toast } from "@yusufceng1z/ding-react";

import { SheetSection } from "@/components/layout/app-shell";
import { GoogleLogo } from "@/components/auth/google-logo";
import { clearQueryCache } from "@/components/providers/query-provider";
import { signOut, useSession } from "@/lib/auth-client";
import { clearOutbox, pendingCount } from "@/lib/offline/sync";

/**
 * The "Sign-in & sync" block in Settings (not "Account", which would read
 * like the money Accounts block below it). Always shown:
 * - signed in: the Google account, with sign out;
 * - signed out (a guest who skipped sign-in): a button to sign in;
 * - sign-in not configured on this server yet: the same row, with the
 *   button disabled, and no session request (there is no auth backend).
 */
export function AccountCard({ authEnabled }: { authEnabled: boolean }) {
  return authEnabled ? <SessionAccountCard /> : <UnavailableAccountCard />;
}

function SessionAccountCard() {
  const { data, isPending } = useSession();
  const [signingOut, setSigningOut] = React.useState(false);
  const user = data?.user;

  async function handleSignOut() {
    // Changes made offline that haven't reached the server yet would be lost.
    const waiting = pendingCount();
    if (
      waiting > 0 &&
      !window.confirm(
        `${waiting} ${waiting === 1 ? "change hasn’t" : "changes haven’t"} synced yet (you may be offline). Signing out now discards ${waiting === 1 ? "it" : "them"}. Sign out anyway?`,
      )
    ) {
      return;
    }
    setSigningOut(true);
    try {
      await signOut();
      // The next account on this device starts clean.
      clearOutbox();
      clearQueryCache();
      // A full load drops every in-memory provider and lands on /sign-in.
      window.location.replace("/sign-in");
    } catch {
      toast.error("Couldn’t sign out. Try again.");
      setSigningOut(false);
    }
  }

  return (
    <AccountRow
      avatar={
        isPending ? (
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
          <InitialAvatar letter={user?.name?.[0]?.toUpperCase() ?? "?"} />
        )
      }
      showGoogleBadge={Boolean(user)}
      title={isPending ? "Loading…" : (user?.name ?? "Not signed in")}
      subtitle={user?.email ?? (isPending ? "" : "Sign in to sync your data across devices")}
      action={
        user ? (
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
        ) : isPending ? null : (
          <Link href="/sign-in" className={SIGN_IN_CLASS}>
            <LogIn className="size-3.5" />
            Sign in
          </Link>
        )
      }
    />
  );
}

function UnavailableAccountCard() {
  return (
    <AccountRow
      avatar={<InitialAvatar letter="?" />}
      showGoogleBadge={false}
      title="Not signed in"
      subtitle="Sign-in isn’t set up on this server yet"
      action={
        <button type="button" disabled className={SIGN_IN_CLASS}>
          <LogIn className="size-3.5" />
          Sign in
        </button>
      }
    />
  );
}

const SIGN_IN_CLASS =
  "flex h-9 shrink-0 items-center gap-1.5 rounded-full bg-white px-3.5 text-xs font-medium text-neutral-900 transition-transform active:scale-95 disabled:pointer-events-none disabled:opacity-40";

function InitialAvatar({ letter }: { letter: string }) {
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-[#b9d0ff]/15 text-lg font-semibold text-[#dfe8ff] ring-2 ring-white/10">
      {letter}
    </span>
  );
}

function AccountRow({
  avatar,
  showGoogleBadge,
  title,
  subtitle,
  action,
}: {
  avatar: React.ReactNode;
  showGoogleBadge: boolean;
  title: string;
  subtitle: string;
  action: React.ReactNode;
}) {
  return (
    <SheetSection title="Sign-in & sync">
      {/* Not the shared Card: it treats a leading <img> as a cover photo
          (no top padding, square corners), which squashed the avatar. */}
      <div className="flex items-center gap-3.5 rounded-3xl bg-white/6 p-4">
        <span className="relative shrink-0">
          {avatar}
          {/* Which provider this account is signed in with. */}
          {showGoogleBadge && (
            <span className="absolute -right-0.5 -bottom-0.5 flex size-5 items-center justify-center rounded-full bg-white ring-2 ring-[#141518]">
              <GoogleLogo className="size-3" />
            </span>
          )}
        </span>

        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-medium text-white">{title}</span>
          <span className="block truncate text-xs text-white/50">{subtitle}</span>
        </span>

        {action}
      </div>
    </SheetSection>
  );
}
