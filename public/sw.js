/*
 * Pulse service worker: lets the installed app open with no signal.
 *
 * - Page loads: network first (so you always get the latest version), with a
 *   copy kept; offline, the last copy of that page is served, or Home.
 * - Build files (/_next/static, content-hashed), icons and logos: cache
 *   first — their URLs change whenever their contents do.
 * - Never cached: /api (data and sign-in), server actions (POST), and the
 *   router's RSC requests — data always comes from the server, and the app's
 *   own offline queue handles saving while offline.
 *
 * Bump VERSION to drop old caches after a change to this file.
 */
const VERSION = "v1";
const PAGES = `pulse-pages-${VERSION}`;
const ASSETS = `pulse-assets-${VERSION}`;

self.addEventListener("install", (event) => {
  // Cache the shell of Home up front so a first offline open has something.
  event.waitUntil(
    caches
      .open(PAGES)
      .then((cache) => cache.add(new Request("/", { credentials: "include" })))
      .catch(() => undefined)
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key.startsWith("pulse-") && key !== PAGES && key !== ASSETS)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

function isAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/account-logos/") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/apple-icon" ||
    url.pathname === "/manifest.webmanifest"
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  // Client-side navigations fetch RSC payloads; leave them to the network.
  if (request.headers.get("RSC") || url.searchParams.has("_rsc")) return;

  if (isAsset(url)) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const cached = await cache.match(request);
        if (cached) return cached;
        const response = await fetch(request);
        if (response.ok) cache.put(request, response.clone());
        return response;
      }),
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(PAGES);
        try {
          const response = await fetch(request);
          // Keep a copy of real pages only (not redirects to sign-in).
          if (response.ok && !response.redirected) cache.put(request, response.clone());
          return response;
        } catch {
          return (
            (await cache.match(request, { ignoreSearch: true })) ||
            (await cache.match("/")) ||
            new Response("You’re offline.", {
              status: 503,
              headers: { "Content-Type": "text/plain; charset=utf-8" },
            })
          );
        }
      })(),
    );
  }
});
