import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { GUEST_COOKIE } from "@/lib/guest";

/**
 * Sends signed-out visitors to /sign-in before any page renders.
 *
 * This is the fast, optimistic check: it only looks for the session cookie.
 * The real check happens on the server wherever data is read or written
 * (server actions verify the session with Better Auth), so a forged cookie
 * gets an empty app, never someone's data.
 *
 * Guests who chose "Skip for now" (the GUEST_COOKIE) are let in too; their
 * data stays in the browser, and /sign-in stays open to them so they can
 * sign in later.
 *
 * Until the sign-in secrets are configured (see .env.example) the gate stays
 * open, so the app keeps working locally while the backend is being set up.
 */
export function proxy(request: NextRequest) {
  const configured =
    process.env.DATABASE_URL &&
    process.env.BETTER_AUTH_SECRET &&
    process.env.GOOGLE_CLIENT_ID &&
    process.env.GOOGLE_CLIENT_SECRET;
  if (!configured) return NextResponse.next();

  const signedIn = Boolean(getSessionCookie(request));
  const guest = request.cookies.has(GUEST_COOKIE);
  const onSignIn = request.nextUrl.pathname === "/sign-in";

  if (!signedIn && !guest && !onSignIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (signedIn && onSignIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except API routes (auth endpoints, and data routes that
    // check the session themselves and answer 401), Next internals, the
    // manifest, app icons and any file with an extension (logos, favicon, …).
    "/((?!api/|_next/static|_next/image|manifest.webmanifest|icons/|apple-icon|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
