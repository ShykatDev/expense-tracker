import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Sends signed-out visitors to /sign-in before any page renders.
 *
 * This is the fast, optimistic check: it only looks for the session cookie.
 * The real check happens on the server wherever data is read or written
 * (server actions verify the session with Better Auth), so a forged cookie
 * gets an empty app, never someone's data.
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
  const onSignIn = request.nextUrl.pathname === "/sign-in";

  if (!signedIn && !onSignIn) {
    return NextResponse.redirect(new URL("/sign-in", request.url));
  }
  if (signedIn && onSignIn) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Everything except auth endpoints, Next internals, the manifest, app
    // icons and any file with an extension (logos, favicon, …).
    "/((?!api/auth|_next/static|_next/image|manifest.webmanifest|icons/|apple-icon|.*\\.[a-zA-Z0-9]+$).*)",
  ],
};
