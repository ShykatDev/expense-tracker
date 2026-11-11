/**
 * A random v4 UUID that also works outside secure contexts.
 *
 * `crypto.randomUUID()` only exists on https:// or localhost, so opening the
 * dev server from a phone at http://192.168.x.x would throw when creating a
 * goal or category. `crypto.getRandomValues()` is available everywhere, so
 * it backs the fallback.
 */
export function createId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // RFC 4122 variant
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
