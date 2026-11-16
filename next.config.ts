import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /*
   * Lets a phone on the same Wi-Fi open the dev server by this machine's
   * network address (http://192.168.11.86:3000). Next.js blocks dev assets
   * from any host other than localhost by default, which leaves the page
   * stuck on the splash screen because its scripts never load.
   * Update the address if the router assigns this machine a new one.
   */
  allowedDevOrigins: ["192.168.11.86"],

  /*
   * The service worker must never be cached by the browser or a CDN, or
   * phones would keep running an old copy of it after a deploy.
   */
  async headers() {
    return [
      {
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
        ],
      },
    ];
  },
};

export default nextConfig;
