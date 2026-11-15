/**
 * "Skip for now" on the sign-in page sets this cookie. While it is present
 * the sign-in gate lets the visitor in and every data area stays in this
 * browser, exactly as before sign-in was configured. Signing in clears it,
 * and the usual one-time import then uploads what was saved locally.
 *
 * It only chooses where data is kept; it grants no access to anything on the
 * server, so it is a plain readable cookie set from the browser.
 */
export const GUEST_COOKIE = "pulse-guest";

const ONE_YEAR = 60 * 60 * 24 * 365;

export function startGuestMode() {
  document.cookie = `${GUEST_COOKIE}=1; path=/; max-age=${ONE_YEAR}; samesite=lax`;
}

export function endGuestMode() {
  document.cookie = `${GUEST_COOKIE}=; path=/; max-age=0; samesite=lax`;
}
